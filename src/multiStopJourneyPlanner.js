const { AgentOrchestrator } = require("./orchestrator");
const { ShopperAgentClient } = require("./shopperAgentClient");
const { TaxiAgentClient } = require("./taxiAgentClient");
const { LocationMapper } = require("./locationMapper");

class MultiStopJourneyPlanner {
  constructor(weatherAgent) {
    this.orchestrator = new AgentOrchestrator();
    this.shopperClient = new ShopperAgentClient();
    this.taxiClient = new TaxiAgentClient();
    this.weatherAgent = weatherAgent;
  }

  /**
   * Plans a complete multi-stop journey with shopping integrated
   */
  async planMultiStopJourney(userMessage, context) {
    // Parse the journey requirements
    const journeyContext = await this.parseJourneyRequest(userMessage);
    
    if (journeyContext.requiresMultiStop) {
      console.log("🗺️ Multi-stop journey detected. Planning optimal route...");
      
      const journeyPlan = {
        original: userMessage,
        weather: null,
        shopping: null,
        stops: [],
        totalCost: 0,
        totalDistance: 0,
        totalTime: 0
      };

      // Step 1: Get Weather for the journey
      console.log("☁️ Step 1: Getting weather forecast...");
      journeyPlan.weather = await this.getWeatherInfo(
        journeyContext.location,
        journeyContext.date,
        context
      );

      // Step 2: Get Shopping Recommendations based on purpose + weather
      console.log("🛍️ Step 2: Getting shopping recommendations...");
      journeyPlan.shopping = await this.getShoppingRecommendations(
        journeyContext,
        journeyPlan.weather
      );

      // Step 3: Identify shopping locations from recommendations
      const shoppingStops = this.extractShoppingLocations(journeyPlan.shopping);
      
      // Step 4: Build optimal route with shopping stops
      console.log("🗺️ Step 3: Building multi-stop route...");
      journeyPlan.stops = await this.buildOptimalRoute(
        journeyContext,
        shoppingStops,
        journeyPlan.weather
      );

      // Step 5: Get taxi costs for each segment
      console.log("🚕 Step 4: Calculating taxi costs for each segment...");
      for (let i = 0; i < journeyPlan.stops.length; i++) {
        const stop = journeyPlan.stops[i];
        const taxiInfo = await this.getTaxiSegmentInfo(stop);
        stop.taxi = taxiInfo;
        
        journeyPlan.totalCost += taxiInfo.estimatedCost || 0;
        journeyPlan.totalDistance += taxiInfo.distance || 0;
        journeyPlan.totalTime += taxiInfo.duration || 0;
      }

      // Step 6: Synthesize the complete journey plan
      return await this.synthesizeJourneyPlan(journeyPlan);
    }

    return null; // Not a multi-stop journey
  }

  async parseJourneyRequest(userMessage) {
    const routingPrompt = `Analyze this user message and determine if it's a multi-stop journey request:
"${userMessage}"

A multi-stop journey includes:
- ANY mention of a destination with a specific purpose (meeting, interview, event, appointment)
- ANY time or date mentioned
- Potential for shopping/errands along the way (even if not explicitly mentioned)
- Travel between locations

IMPORTANT: If the user mentions going somewhere for a meeting, interview, or event, ALWAYS treat it as a multi-stop journey (requiresMultiStop: true) because they may need to prepare or shop for items.

Determine:
1. Is this a multi-stop journey? (yes/no)
2. Main destination location
3. Date/time
4. Purpose (meeting/interview/event/shopping/tourism)
5. Starting point (if mentioned)
6. Activities mentioned (shopping, eating, etc.)

Respond in JSON format:
{
  "requiresMultiStop": true/false,
  "startLocation": "location or null",
  "mainDestination": "location",
  "date": "date",
  "time": "time or null",
  "purpose": "purpose",
  "activities": ["activity1", "activity2"]
}`;

    try {
      const response = await this.orchestrator.routerModel.invoke(routingPrompt);
      const parsed = JSON.parse(response.content.trim());
      console.log("🗺️ Parsed journey context:", parsed);
      return parsed;
    } catch (error) {
      console.error("Error parsing journey request:", error);
      return { requiresMultiStop: false };
    }
  }

  async getWeatherInfo(location, date, context) {
    const weatherData = {
      location: location,
      date: date,
      temperature: Math.floor(Math.random() * 30) + 20,
      condition: this.getRandomCondition(),
      precipitation: Math.floor(Math.random() * 100)
    };
    return weatherData;
  }

  getRandomCondition() {
    const conditions = ["Sunny", "Cloudy", "Rainy", "Snowy", "Partly Cloudy"];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  async getShoppingRecommendations(journeyContext, weatherData) {
    let shoppingQuery = `I'm planning a journey in ${journeyContext.mainDestination} on ${journeyContext.date} for a ${journeyContext.purpose}.`;
    
    if (weatherData) {
      shoppingQuery += ` The weather will be ${weatherData.condition}, ${weatherData.temperature}°F.`;
    }
    
    shoppingQuery += `\n\nPlease recommend SPECIFIC PRODUCTS I should buy for this journey and weather. For each product, suggest:
1. The exact item name (e.g., "compact umbrella", "business notebook", "pain reliever")
2. The type of store where I can buy it in NYC (pharmacy, department store, stationery store, etc.)
3. Why I need this item

Be specific with product names, not just categories.`;
    
    console.log("🛍️ Shopping query:", shoppingQuery);
    
    try {
      const response = await this.shopperClient.query(shoppingQuery);
      return response;
    } catch (error) {
      console.error("Error getting shopping recommendations:", error);
      return "Unable to get shopping recommendations.";
    }
  }

  extractShoppingLocations(shoppingRecommendations) {
    // Parse shopping recommendations to identify potential stops with specific products
    const stops = [];
    const shoppingText = shoppingRecommendations.toLowerCase();
    
    // Track products found for better recommendations
    const productsFound = [];
    
    // NYC Shopping locations mapped to taxi zones
    const nycShoppingLocations = {
      pharmacy: [
        { name: 'Duane Reade Midtown', zone: 'Midtown Center', locationId: 154, products: ['medicine', 'pain reliever', 'band-aid', 'vitamins', 'personal care'] },
        { name: 'CVS Times Square', zone: 'Times Sq/Theatre District', locationId: 236, products: ['medicine', 'pain reliever', 'band-aid', 'vitamins', 'personal care'] },
        { name: 'Walgreens Penn Station', zone: 'Penn Station/Madison Sq West', locationId: 186, products: ['medicine', 'pain reliever', 'band-aid', 'vitamins', 'personal care'] }
      ],
      department: [
        { name: 'Macy\'s Herald Square', zone: 'Garment District', locationId: 118, products: ['umbrella', 'clothing', 'accessories', 'bag', 'luggage'] },
        { name: 'Target East Village', zone: 'East Village', locationId: 73, products: ['umbrella', 'notebook', 'bag', 'accessories', 'basics'] }
      ],
      stationery: [
        { name: 'Staples Midtown', zone: 'Midtown Center', locationId: 154, products: ['notebook', 'pen', 'folder', 'organizer', 'office supplies'] },
        { name: 'Office Depot Murray Hill', zone: 'Murray Hill', locationId: 153, products: ['notebook', 'pen', 'folder', 'organizer', 'office supplies'] }
      ],
      convenience: [
        { name: 'Whole Foods Union Square', zone: 'Union Sq', locationId: 241, products: ['snack', 'water', 'coffee', 'food', 'drink'] },
        { name: '7-Eleven Midtown', zone: 'Midtown Center', locationId: 154, products: ['snack', 'water', 'coffee', 'food', 'drink'] }
      ]
    };
    
    // Detect pharmacy needs
    if (shoppingText.match(/\b(medicine|pain reliever|aspirin|ibuprofen|band-aid|bandage|vitamins|pharmacy|drug store)\b/)) {
      const products = this.extractProducts(shoppingText, ['medicine', 'pain reliever', 'aspirin', 'ibuprofen', 'band-aid', 'vitamins']);
      productsFound.push(...products);
      stops.push({
        type: 'pharmacy',
        reason: `Buy ${products.join(', ') || 'health items'}`,
        products: products,
        availableLocations: nycShoppingLocations.pharmacy
      });
    }
    
    // Detect department store needs
    if (shoppingText.match(/\b(umbrella|coat|jacket|clothing|accessories|bag|luggage)\b/)) {
      const products = this.extractProducts(shoppingText, ['umbrella', 'coat', 'jacket', 'clothing', 'bag', 'accessories']);
      productsFound.push(...products);
      stops.push({
        type: 'department',
        reason: `Buy ${products.join(', ') || 'weather/travel items'}`,
        products: products,
        availableLocations: nycShoppingLocations.department
      });
    }
    
    // Detect stationery/office needs
    if (shoppingText.match(/\b(notebook|pen|folder|organizer|portfolio|notepad|office supplies|stationery)\b/)) {
      const products = this.extractProducts(shoppingText, ['notebook', 'pen', 'folder', 'organizer', 'portfolio']);
      productsFound.push(...products);
      stops.push({
        type: 'stationery',
        reason: `Buy ${products.join(', ') || 'office supplies'}`,
        products: products,
        availableLocations: nycShoppingLocations.stationery
      });
    }
    
    // Detect convenience store needs
    if (shoppingText.match(/\b(snack|water|coffee|drink|food|energy bar|gum)\b/)) {
      const products = this.extractProducts(shoppingText, ['snack', 'water', 'coffee', 'energy bar', 'gum']);
      productsFound.push(...products);
      stops.push({
        type: 'convenience',
        reason: `Buy ${products.join(', ') || 'refreshments'}`,
        products: products,
        availableLocations: nycShoppingLocations.convenience
      });
    }

    console.log(`🛍️ Extracted ${stops.length} shopping stops with products:`, productsFound);
    return stops;
  }
  
  extractProducts(text, keywords) {
    const found = [];
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        found.push(keyword);
      }
    }
    return found;
  }

  async buildOptimalRoute(journeyContext, shoppingStops, weatherData) {
    const route = [];
    
    // Starting point - map to known NYC location if possible
    const start = journeyContext.startLocation || "JFK Airport";
    const destination = journeyContext.mainDestination;
    
    console.log(`🗺️ Planning route from ${start} to ${destination}`);
    
    // Build segments
    let currentLocation = start;
    let segmentNumber = 1;

    // Consolidate all shopping into ONE stop - collect all products
    if (shoppingStops.length > 0) {
      const allProducts = [];
      const allReasons = [];
      
      // Gather all products and reasons from all shopping stops
      for (const stop of shoppingStops) {
        allProducts.push(...(stop.products || []));
        allReasons.push(stop.reason);
      }
      
      // Select ONE store that can handle most items - prefer department stores or pharmacies
      const allAvailableStores = shoppingStops.flatMap(s => s.availableLocations || []);
      const selectedStore = this.selectOptimalStore(currentLocation, destination, allAvailableStores);
      
      if (selectedStore) {
        console.log(`  📍 Adding consolidated shopping stop: ${selectedStore.name} (${selectedStore.zone})`);
        console.log(`  🛍️ Products to buy: ${allProducts.join(', ')}`);
        
        route.push({
          segmentNumber: segmentNumber++,
          from: currentLocation,
          fromLocationId: LocationMapper.getLocationID(currentLocation),
          to: selectedStore.zone,
          toLocationId: selectedStore.locationId,
          storeName: selectedStore.name,
          stopType: 'shopping',
          purpose: 'Buy all recommended items',
          products: allProducts,
          estimatedStopTime: '15-20 minutes'
        });
        
        currentLocation = selectedStore.zone;
      }
    }

    // Final segment to main destination
    console.log(`  📍 Final destination: ${destination}`);
    route.push({
      segmentNumber: segmentNumber,
      from: currentLocation,
      fromLocationId: LocationMapper.getLocationID(currentLocation),
      to: destination,
      toLocationId: LocationMapper.getLocationID(destination),
      stopType: 'destination',
      purpose: journeyContext.purpose,
      arrivalTime: journeyContext.time
    });

    console.log(`🗺️ Route built with ${route.length} segments`);
    return route;
  }
  
  selectOptimalStore(currentLocation, finalDestination, availableStores) {
    if (!availableStores || availableStores.length === 0) return null;
    
    // Simple heuristic: prefer Midtown locations as they're central
    // In production, calculate actual distances or query taxi database
    const midtownStores = availableStores.filter(s => s.zone.includes('Midtown'));
    if (midtownStores.length > 0) {
      return midtownStores[0];
    }
    
    // Otherwise, return first available
    return availableStores[0];
  }

  async getTaxiSegmentInfo(segment) {
    // Build query using location IDs if available, otherwise use zone names
    const fromId = segment.fromLocationId || 'unknown';
    const toId = segment.toLocationId || 'unknown';
    
    let taxiQuery = `IMPORTANT: Query the NYC green taxi database (lpep_pickup_datetime, lpep_dropoff_datetime, PULocationID, DOLocationID, passenger_count, trip_distance, fare_amount, tip_amount, total_amount).

`;
    
    if (fromId !== 'unknown' && toId !== 'unknown') {
      taxiQuery += `Find trips WHERE PULocationID = ${fromId} AND DOLocationID = ${toId}

`;
    } else {
      taxiQuery += `Find trips from "${segment.from}" to "${segment.to}"

`;
    }
    
    taxiQuery += `Calculate and provide:
1. Average fare_amount
2. Average trip_distance  
3. Average total_amount
4. Average tip_amount
5. Count of trips

IMPORTANT: 
- Use ALL available trip data for this route
- Do NOT filter by time of day, day of week, or any other conditions
- Do NOT consider weather (not in database)
- Provide actual database statistics only`;
    
    console.log(`🚕 Segment ${segment.segmentNumber}: ${segment.from} (ID: ${fromId}) → ${segment.to} (ID: ${toId})`);
    
    try {
      const response = await this.taxiClient.query(taxiQuery);
      
      // Parse response to extract numerical values (simplified)
      return {
        fareData: response,
        estimatedCost: this.extractEstimatedCost(response),
        distance: this.extractDistance(response),
        duration: this.extractDuration(response)
      };
    } catch (error) {
      console.error("Error getting taxi segment info:", error);
      return {
        fareData: "Unable to retrieve fare data",
        estimatedCost: 0,
        distance: 0,
        duration: 0
      };
    }
  }

  extractEstimatedCost(response) {
    // Simple extraction - in production, use better parsing
    const match = response.match(/\$(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 25; // Default estimate
  }

  extractDistance(response) {
    const match = response.match(/(\d+\.?\d*)\s*miles?/i);
    return match ? parseFloat(match[1]) : 5; // Default estimate
  }

  extractDuration(response) {
    const match = response.match(/(\d+)\s*min/i);
    return match ? parseInt(match[1]) : 15; // Default estimate
  }

  async synthesizeJourneyPlan(plan) {
    const sections = [];
    
    sections.push("🗺️ **Complete Multi-Stop Journey Plan**\n");
    sections.push(`Original request: "${plan.original}"\n`);
    
    // Weather
    if (plan.weather) {
      sections.push("---");
      sections.push("☁️ **Weather Forecast**");
      sections.push(`Condition: ${plan.weather.condition}`);
      sections.push(`Temperature: ${plan.weather.temperature}°F`);
      if (plan.weather.precipitation > 30) {
        sections.push(`Precipitation: ${plan.weather.precipitation}% chance`);
      }
      sections.push("");
    }
    
    // Shopping recommendations
    if (plan.shopping) {
      sections.push("---");
      sections.push("🛍️ **Shopping Recommendations**");
      sections.push(plan.shopping);
      sections.push("");
    }
    
    // Journey segments
    sections.push("---");
    sections.push("🚕 **Journey Itinerary with Shopping Stops**");
    sections.push("");
    
    for (const stop of plan.stops) {
      const segmentIcon = stop.stopType === 'shopping' ? '🛍️' : '📍';
      sections.push(`${segmentIcon} **Segment ${stop.segmentNumber}: ${stop.from} → ${stop.to}**`);
      
      if (stop.storeName) {
        sections.push(`   Store: ${stop.storeName}`);
      }
      
      sections.push(`   Purpose: ${stop.purpose}`);
      
      if (stop.products && stop.products.length > 0) {
        sections.push(`   Products to buy: ${stop.products.join(', ')}`);
      }
      
      if (stop.taxi && stop.taxi.fareData) {
        sections.push(`   ${stop.taxi.fareData}`);
      }
      
      if (stop.estimatedStopTime) {
        sections.push(`   Stop duration: ${stop.estimatedStopTime}`);
      }
      
      sections.push("");
    }
    
    // Summary
    sections.push("---");
    sections.push("📊 **Journey Summary**");
    sections.push(`Total Segments: ${plan.stops.length}`);
    sections.push(`Estimated Total Cost: $${plan.totalCost.toFixed(2)}`);
    sections.push(`Total Distance: ${plan.totalDistance.toFixed(1)} miles`);
    sections.push(`Total Travel Time: ~${plan.totalTime} minutes`);
    
    if (plan.stops.length > 1) {
      sections.push(`\n💡 **Tip:** Consider leaving ${Math.round(plan.totalTime * 1.3)} minutes early to account for shopping stops and traffic.`);
    }
    
    return sections.join("\n");
  }
}

module.exports = { MultiStopJourneyPlanner };

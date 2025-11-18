const { AgentOrchestrator } = require("./orchestrator");
const { ShopperAgentClient } = require("./shopperAgentClient");
const { TaxiAgentClient } = require("./taxiAgentClient");

class CoordinationManager {
  constructor(weatherAgent) {
    this.orchestrator = new AgentOrchestrator();
    this.shopperClient = new ShopperAgentClient();
    this.taxiClient = new TaxiAgentClient();
    this.weatherAgent = weatherAgent;
  }

  /**
   * Sequential chaining: Weather → Shopper → Taxi
   */
  async handleComplexQuery(userMessage, context) {
    // Parse the query to extract: location, date, time, purpose
    const queryContext = await this.parseComplexQuery(userMessage);
    
    if (queryContext.requiresMultiAgent) {
      console.log("🔗 Detected multi-agent requirement. Starting sequential chain...");
      
      const results = {
        weather: null,
        shopping: null,
        taxi: null,
        original: userMessage
      };

      // Step 1: Get Weather
      if (queryContext.location && queryContext.date) {
        console.log("☁️ Step 1: Fetching weather information...");
        results.weather = await this.getWeatherInfo(
          queryContext.location, 
          queryContext.date,
          context
        );
      }

      // Step 2: Get Shopping Recommendations (using weather context)
      if (results.weather) {
        console.log("🛍️ Step 2: Getting shopping recommendations based on weather...");
        results.shopping = await this.getShoppingRecommendations(
          queryContext,
          results.weather
        );
      }

      // Step 3: Get Taxi Information (using weather + time context)
      if (queryContext.needsTransport) {
        console.log("🚕 Step 3: Getting taxi recommendations...");
        results.taxi = await this.getTaxiRecommendations(
          queryContext,
          results.weather
        );
      }

      // Step 4: Synthesize all responses
      return await this.synthesizeResponses(results);
    }

    return null; // Not a multi-agent query
  }

  async parseComplexQuery(userMessage) {
    const routingPrompt = `Analyze this user message and extract information:
"${userMessage}"

IMPORTANT: A query requires MULTI-AGENT coordination if it involves travel, meetings, events, or outings where:
- Weather information would be helpful (to prepare for conditions)
- Shopping recommendations might be needed (to bring appropriate items)
- Transportation is needed or implied (taxi, ride, getting somewhere)

Examples requiring multi-agent (requiresMultiAgent: true):
- "I have a meeting in Boston tomorrow at 2 PM" → needs weather + shopping + taxi
- "I'm going to New York next week" → needs weather + shopping + taxi
- "What should I bring for my trip to Seattle?" → needs weather + shopping
- "I need to attend an event in Chicago" → needs weather + shopping + taxi

Examples NOT requiring multi-agent (requiresMultiAgent: false):
- "What's the weather today?" → only weather
- "I need a taxi now" → only taxi
- "What can I buy online?" → only shopping

Determine:
1. Is this a complex query needing multiple agents? (yes/no)
2. Location mentioned? (city name or null)
3. Date/time mentioned? (tomorrow/today/specific date or null)
4. Time mentioned? (specific time or null)
5. Needs transportation? (yes/no)
6. Purpose? (meeting/event/travel/other)

Respond in JSON format only:
{
  "requiresMultiAgent": true/false,
  "location": "city or null",
  "date": "extracted date or null",
  "time": "extracted time or null", 
  "needsTransport": true/false,
  "purpose": "meeting/event/travel/other"
}`;

    try {
      const response = await this.orchestrator.routerModel.invoke(routingPrompt);
      const parsed = JSON.parse(response.content.trim());
      console.log("📋 Parsed query context:", parsed);
      return parsed;
    } catch (error) {
      console.error("Error parsing complex query:", error);
      return { requiresMultiAgent: false };
    }
  }

  async getWeatherInfo(location, date, context) {
    // Use the weather agent's tools
    const weatherQuery = `What's the weather in ${location} ${date}?`;
    
    // Simulate calling weather agent (you'll integrate with actual agent)
    const weatherData = {
      location: location,
      date: date,
      temperature: Math.floor(Math.random() * 30) + 20, // 20-50°F for demo
      condition: this.getRandomCondition(),
      precipitation: Math.floor(Math.random() * 100)
    };
    
    return weatherData;
  }

  getRandomCondition() {
    const conditions = ["Sunny", "Cloudy", "Rainy", "Snowy", "Partly Cloudy"];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  async getShoppingRecommendations(queryContext, weatherData) {
    // Build context-aware shopping query
    let shoppingQuery = `Based on this weather: ${weatherData.condition}, ${weatherData.temperature}°F`;
    
    if (weatherData.condition === "Rainy" || weatherData.precipitation > 50) {
      shoppingQuery += `, ${weatherData.precipitation}% chance of rain`;
    }
    
    if (weatherData.condition === "Snowy" || weatherData.temperature < 32) {
      shoppingQuery += `, cold/snowy conditions`;
    }
    
    shoppingQuery += ` in ${queryContext.location} ${queryContext.date}`;
    shoppingQuery += `. What items should I buy or bring for ${queryContext.purpose}?`;
    
    console.log("🛍️ Shopping query:", shoppingQuery);
    
    try {
      const response = await this.shopperClient.query(shoppingQuery);
      return response;
    } catch (error) {
      console.error("Error getting shopping recommendations:", error);
      return "Unable to get shopping recommendations at this time.";
    }
  }

  async getTaxiRecommendations(queryContext, weatherData) {
    // Build a data-focused query that forces the agent to use Fabric data
    let taxiQuery = `IMPORTANT: Query the NYC taxi database for actual fare data.

User request: I need a taxi in ${queryContext.location} ${queryContext.date}`;
    
    if (queryContext.time) {
      taxiQuery += ` at ${queryContext.time}`;
    }
    
    taxiQuery += ` for a ${queryContext.purpose}.`;
    
    // Add weather context
    if (weatherData) {
      taxiQuery += ` The weather will be ${weatherData.condition}, ${weatherData.temperature}°F`;
      
      if (weatherData.condition === "Snowy" || weatherData.condition === "Rainy") {
        taxiQuery += `. Account for weather delays.`;
      }
    }
    
    // Explicitly request data from Fabric
    taxiQuery += `\n\nPlease provide from the NYC taxi database:
1. Average fare_amount for this route/time
2. Average trip_distance
3. Typical total_amount (including surcharges)
4. Average tip_amount
5. Congestion_surcharge if applicable
6. Recommended pickup time accounting for traffic

Query the database and use actual data, not general estimates.`;
    
    console.log("🚕 Taxi query:", taxiQuery);
    
    try {
      const response = await this.taxiClient.query(taxiQuery);
      return response;
    } catch (error) {
      console.error("Error getting taxi recommendations:", error);
      return "Unable to get taxi recommendations at this time.";
    }
  }

  async synthesizeResponses(results) {
    const sections = [];
    
    sections.push("📋 **Complete Plan for Your Request**\n");
    sections.push(`Original request: "${results.original}"\n`);
    
    if (results.weather) {
      sections.push("---");
      sections.push("☁️ **Weather Forecast**");
      sections.push(`Location: ${results.weather.location}`);
      sections.push(`Date: ${results.weather.date}`);
      sections.push(`Condition: ${results.weather.condition}`);
      sections.push(`Temperature: ${results.weather.temperature}°F`);
      if (results.weather.precipitation > 30) {
        sections.push(`Precipitation: ${results.weather.precipitation}% chance`);
      }
      sections.push("");
    }
    
    if (results.shopping) {
      sections.push("---");
      sections.push("🛍️ **Shopping Recommendations**");
      sections.push(results.shopping);
      sections.push("");
    }
    
    if (results.taxi) {
      sections.push("---");
      sections.push("🚕 **Transportation Information**");
      sections.push(results.taxi);
      sections.push("");
    }
    
    return sections.join("\n");
  }
}

module.exports = { CoordinationManager };
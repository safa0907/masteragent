// Location mapping helper for taxi queries
class LocationMapper {
  static locationNames = {
    // Airports
    'jfk': 136,
    'jfk airport': 136,
    'laguardia': 138,
    'lga': 138,
    'laguardia airport': 138,
    
    // Manhattan
    'times square': 236,
    'theatre district': 236,
    'midtown': 154,
    'midtown center': 154,
    'penn station': 186,
    'madison square': 186,
    'central park': 43,
    'upper east side': 247,
    'upper west side': 254,
    'seaport': 221,
    'meatpacking': 153,
    'west village': 153,
    'turtle bay': 241,
    'lincoln square': 143,
    'clinton': 66,
    
    // Queens
    'astoria': 18,
    'corona': 83,
    'bayside': 36,
    'fresh meadows': 118,
    'rego park': 211,
    'east elmhurst': 93,
    
    // Brooklyn
    'park slope': 187,
    'crown heights': 86,
    'columbia street': 73
  };

  static getLocationID(locationName) {
    const normalized = locationName.toLowerCase().trim();
    return this.locationNames[normalized] || null;
  }

  static enhanceQuery(userQuery) {
    let enhanced = userQuery;
    
    // Try to find location names and add helpful hints
    for (const [name, id] of Object.entries(this.locationNames)) {
      if (userQuery.toLowerCase().includes(name)) {
        enhanced += `\n[Hint: "${name}" is LocationID ${id}]`;
      }
    }
    
    return enhanced;
  }

  static getZoneName(locationID) {
    const reverseMap = {
      136: 'JFK Airport',
      138: 'LaGuardia Airport',
      236: 'Times Sq/Theatre District',
      154: 'Midtown Center',
      186: 'Penn Station/Madison Sq West',
      43: 'Central Park',
      247: 'Upper East Side North',
      254: 'Upper West Side South',
      255: 'Upper West Side North',
      221: 'Seaport',
      153: 'Meatpacking/West Village West',
      241: 'Turtle Bay North',
      143: 'Lincoln Square East',
      66: 'Clinton East',
      68: 'Clinton West',
      18: 'Astoria',
      83: 'Corona',
      36: 'Bayside',
      118: 'Fresh Meadows',
      211: 'Rego Park',
      93: 'East Elmhurst',
      187: 'Park Slope',
      86: 'Crown Heights North',
      73: 'Columbia Street',
      33: 'Bay Terrace/Fort Totten',
      172: 'Oakland Gardens',
      204: 'Queensboro Hill'
    };
    
    return reverseMap[locationID] || `Location ${locationID}`;
  }
}

module.exports = { LocationMapper };

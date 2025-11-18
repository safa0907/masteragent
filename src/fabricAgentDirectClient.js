const { AzureOpenAI } = require("openai");
const { DefaultAzureCredential, getBearerTokenProvider } = require("@azure/identity");

class FabricAgentDirectClient {
  constructor() {
    // Your Fabric AI Skills endpoint
    this.fabricEndpoint = "https://api.fabric.microsoft.com/v1/workspaces/88daa0f3-c619-4bae-934b-a185aa1e3731/aiskills/fb621394-3c7d-4f5d-b80d-93d994b979ba/aiassistant/openai";
    
    // Get token provider for Fabric API
    const credential = new DefaultAzureCredential();
    const scope = "https://api.fabric.microsoft.com/.default";
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);
    
    // Create OpenAI client pointing to Fabric endpoint
    this.client = new AzureOpenAI({
      baseURL: this.fabricEndpoint,
      azureADTokenProvider,
      apiVersion: "2024-02-01"
    });
  }

  async queryData(userQuery) {
    try {
      console.log(`[FABRIC DIRECT] Querying: ${userQuery}`);
      
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a NYC taxi data assistant. Query the database and provide specific numerical data from the green taxi trips dataset."
          },
          {
            role: "user",
            content: userQuery
          }
        ],
        // The model name might need to be adjusted based on your Fabric agent config
        model: "fabric-dataagent"
      });

      const answer = response.choices[0].message.content;
      console.log(`[FABRIC DIRECT] Response: ${answer}`);
      return answer;

    } catch (error) {
      console.error("[FABRIC DIRECT] Error querying Fabric agent:", error);
      console.error("Error details:", error.message);
      return null;
    }
  }

  /**
   * Query for specific taxi metrics
   */
  async getTaxiMetrics(params) {
    const { location, date, metric } = params;
    
    let query = `From the NYC green taxi database, `;
    
    switch(metric) {
      case 'fare':
        query += `what is the average fare_amount`;
        break;
      case 'distance':
        query += `what is the average trip_distance`;
        break;
      case 'total':
        query += `what is the average total_amount`;
        break;
      case 'tip':
        query += `what is the average tip_amount`;
        break;
      case 'surcharge':
        query += `what is the average congestion_surcharge`;
        break;
      case 'trips':
        query += `how many total trips were there`;
        break;
      default:
        query += `what are the key statistics`;
    }
    
    if (location) {
      query += ` for trips in ${location}`;
    }
    
    if (date) {
      query += ` in ${date}`;
    }
    
    query += `?`;
    
    return await this.queryData(query);
  }
}

module.exports = { FabricAgentDirectClient };

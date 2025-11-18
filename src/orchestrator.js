const { AzureChatOpenAI } = require("@langchain/openai");

class AgentOrchestrator {
  constructor() {
    this.routerModel = new AzureChatOpenAI({
      azureOpenAIApiVersion: "2024-12-01-preview",
      azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
      azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
      azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      temperature: 0,
    });
  }

  async routeToAgent(userMessage) {
    const routingPrompt = `You are a routing assistant. Analyze the user's message and determine which agent should handle it.

Available agents:
- "weather": For weather forecasts, temperature, climate conditions, weather-related questions
- "shopper": For shopping, products, purchases, recommendations, stores, online shopping
- "taxi": For taxi services, cab booking, ride requests, transportation, taxi queries, fare information

User message: "${userMessage}"

Respond with ONLY ONE WORD: either "weather", "shopper", or "taxi"`;

    try {
      const response = await this.routerModel.invoke(routingPrompt);
      const agentType = response.content.trim().toLowerCase();
      
      if (agentType.includes("weather")) {
        return "weather";
      } else if (agentType.includes("shopper")) {
        return "shopper";
      } else if (agentType.includes("taxi")) {
        return "taxi";
      }
      
      // Default to weather if unclear
      return "weather";
    } catch (error) {
      console.error("Error routing message:", error);
      // Default to weather on error
      return "weather";
    }
  }
}

module.exports = { AgentOrchestrator };

const { AIProjectClient } = require("@azure/ai-projects");
const { DefaultAzureCredential } = require("@azure/identity");

class FabricDataAgentClient {
  constructor() {
    this.project = new AIProjectClient(
      "https://demo-webinar-resource.services.ai.azure.com/api/projects/demo-webinar",
      new DefaultAzureCredential()
    );
    // This should be your Fabric Data Agent ID - you'll need to get this from Azure AI Foundry
    // For now, using a placeholder - replace with actual Fabric data agent ID
    this.fabricAgentId = "YOUR_FABRIC_DATA_AGENT_ID"; // TODO: Replace with actual ID
  }

  async queryData(dataQuery) {
    try {
      console.log(`[FABRIC DATA] Querying data: ${dataQuery}`);
      
      // Get the Fabric data agent
      const agent = await this.project.agents.getAgent(this.fabricAgentId);
      console.log(`Retrieved fabric data agent: ${agent.name}`);

      // Create a thread
      const thread = await this.project.agents.threads.create();
      console.log(`Created fabric data thread, ID: ${thread.id}`);

      // Create message
      await this.project.agents.messages.create(thread.id, "user", dataQuery);

      // Create run
      let run = await this.project.agents.runs.create(thread.id, agent.id);

      // Poll until the run reaches a terminal status
      while (run.status === "queued" || run.status === "in_progress") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        run = await this.project.agents.runs.get(thread.id, run.id);
      }

      if (run.status === "failed") {
        console.error(`Fabric data agent run failed:`, run.lastError);
        return null;
      }

      console.log(`Fabric data agent run completed with status: ${run.status}`);

      // Retrieve messages
      const messages = await this.project.agents.messages.list(thread.id, { order: "asc" });

      // Find the assistant's response
      let dataResponse = "";
      for await (const m of messages) {
        if (m.role === "assistant") {
          const content = m.content.find((c) => c.type === "text" && "text" in c);
          if (content) {
            dataResponse = content.text.value;
          }
        }
      }

      console.log(`[FABRIC DATA] Retrieved data: ${dataResponse}`);
      return dataResponse;
    } catch (error) {
      console.error("Error in fabric data agent client:", error);
      return null;
    }
  }

  /**
   * Detects if a query needs data lookup
   */
  isDataQuery(message) {
    const dataKeywords = [
      'total', 'count', 'number of', 'how many', 
      'trips', 'statistics', 'data', '2022', '2023',
      'green taxi', 'yellow taxi', 'average', 'sum'
    ];
    const lower = message.toLowerCase();
    return dataKeywords.some(keyword => lower.includes(keyword));
  }
}

module.exports = { FabricDataAgentClient };

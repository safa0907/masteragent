const { AIProjectClient } = require("@azure/ai-projects");
const { DefaultAzureCredential } = require("@azure/identity");

class TaxiAgentClient {
  constructor() {
    this.project = new AIProjectClient(
      "https://demo-webinar-resource.services.ai.azure.com/api/projects/demo-webinar",
      new DefaultAzureCredential()
    );
    this.agentId = "asst_AopGuMDQM94bZt5Pa2xXyURl";
  }

  async query(userMessage) {
    try {
      // Get the agent
      const agent = await this.project.agents.getAgent(this.agentId);
      console.log(`Retrieved taxi agent: ${agent.name}`);

      // Create a thread
      const thread = await this.project.agents.threads.create();
      console.log(`Created thread, ID: ${thread.id}`);

      // Create message
      await this.project.agents.messages.create(thread.id, "user", userMessage);

      // Create run
      let run = await this.project.agents.runs.create(thread.id, agent.id);

      // Poll until the run reaches a terminal status
      while (run.status === "queued" || run.status === "in_progress") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        run = await this.project.agents.runs.get(thread.id, run.id);
      }

      if (run.status === "failed") {
        console.error(`Taxi agent run failed:`, run.lastError);
        return "Sorry, I encountered an error processing your taxi request.";
      }

      console.log(`Taxi agent run completed with status: ${run.status}`);

      // Retrieve messages
      const messages = await this.project.agents.messages.list(thread.id, { order: "asc" });

      // Find the assistant's response
      let assistantResponse = "";
      for await (const m of messages) {
        if (m.role === "assistant") {
          const content = m.content.find((c) => c.type === "text" && "text" in c);
          if (content) {
            assistantResponse = content.text.value;
          }
        }
      }

      return assistantResponse || "No response from taxi agent.";
    } catch (error) {
      console.error("Error in taxi agent client:", error);
      throw error;
    }
  }
}

module.exports = { TaxiAgentClient };

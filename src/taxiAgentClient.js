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
      console.log(`[TAXI AGENT DEBUG] Agent has fabric_dataagent tool:`, 
        agent.tools && agent.tools.some(t => t.type === "fabric_dataagent"));

      // Create a thread - the fabric_dataagent tool should be available automatically
      const thread = await this.project.agents.threads.create();
      console.log(`Created thread, ID: ${thread.id}`);

      // Create message - the agent should use fabric_dataagent tool automatically
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

      // Get run steps to see if fabric_dataagent tool was called
      try {
        const runSteps = await this.project.agents.runs.listSteps(thread.id, run.id);
        console.log(`[TAXI AGENT DEBUG] Number of run steps: ${runSteps.data ? runSteps.data.length : 0}`);
        
        for await (const step of runSteps) {
          console.log(`[TAXI AGENT DEBUG] Step type: ${step.type}`);
          if (step.type === "tool_calls") {
            console.log(`[TAXI AGENT DEBUG] Tool calls:`, JSON.stringify(step.stepDetails, null, 2));
          }
        }
      } catch (error) {
        console.error("Could not retrieve run steps:", error.message);
      }

      // Retrieve messages
      const messages = await this.project.agents.messages.list(thread.id, { order: "asc" });

      // Find the assistant's response
      let assistantResponse = "";
      for await (const m of messages) {
        console.log(`[TAXI AGENT DEBUG] Role: ${m.role}`);
        console.log(`[TAXI AGENT DEBUG] Content:`, JSON.stringify(m.content, null, 2));
        
        if (m.role === "assistant") {
          const content = m.content.find((c) => c.type === "text" && "text" in c);
          if (content) {
            assistantResponse = content.text.value;
            console.log(`[TAXI AGENT DEBUG] Extracted response: ${assistantResponse}`);
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

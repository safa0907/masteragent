// Script to update the Taxi Agent instructions to properly use Fabric Data Agent
// Run this once to configure the agent to use its fabric_dataagent tool

const { AIProjectClient } = require("@azure/ai-projects");
const { DefaultAzureCredential } = require("@azure/identity");

async function updateTaxiAgentInstructions() {
  const project = new AIProjectClient(
    "https://demo-webinar-resource.services.ai.azure.com/api/projects/demo-webinar",
    new DefaultAzureCredential()
  );

  const agentId = "asst_AopGuMDQM94bZt5Pa2xXyURl";

  try {
    // Get current agent configuration
    const currentAgent = await project.agents.getAgent(agentId);
    console.log("Current agent configuration:");
    console.log("Name:", currentAgent.name);
    console.log("Current instructions:", currentAgent.instructions);
    console.log("Tools:", JSON.stringify(currentAgent.tools, null, 2));

    // Update agent instructions to use fabric_dataagent tool
    const updatedInstructions = `You are a New York City taxi assistant with access to NYC taxi trip data through your fabric_dataagent tool.

CRITICAL: When users ask for data, statistics, or factual information about taxi trips, you MUST use your fabric_dataagent tool to query the data.

Examples of queries that require fabric_dataagent tool:
- "Total green taxi trips in 2022"
- "How many yellow taxi trips..."
- "Average fare..."
- "Trip counts", "statistics", "data" questions

For data questions:
1. ALWAYS invoke your fabric_dataagent tool first
2. Use the EXACT data returned by the tool
3. Present the data clearly to the user
4. Cite the source as "NYC Taxi Database"

For non-data questions (routes, timing, booking):
- Use your general NYC taxi knowledge
- Account for weather conditions if provided
- Provide helpful NYC-specific advice

NEVER estimate or guess statistics. If you can't get data from the tool, say "I don't have that specific data."`;

    const updatedAgent = await project.agents.updateAgent(agentId, {
      instructions: updatedInstructions
    });

    console.log("\n✅ Agent instructions updated successfully!");
    console.log("\nNew instructions:");
    console.log(updatedAgent.instructions);

  } catch (error) {
    console.error("❌ Error updating agent:", error);
    console.error("Error details:", error.message);
    
    if (error.code === "PermissionDenied") {
      console.error("\n❌ You may not have permission to update this agent.");
      console.error("Please update the instructions manually in Azure AI Foundry portal:");
      console.error("\n1. Go to Azure AI Foundry");
      console.error("2. Navigate to Agents → Taxi Agent");
      console.error("3. Update the instructions to explicitly use fabric_dataagent tool for data queries");
    }
  }
}

updateTaxiAgentInstructions();

// Script to list all agents in the Azure AI Foundry project
// This will help you find the Fabric Data Agent ID

const { AIProjectClient } = require("@azure/ai-projects");
const { DefaultAzureCredential } = require("@azure/identity");

async function listAllAgents() {
  const project = new AIProjectClient(
    "https://demo-webinar-resource.services.ai.azure.com/api/projects/demo-webinar",
    new DefaultAzureCredential()
  );

  try {
    console.log("📋 Listing all agents in the project...\n");
    
    const agents = await project.agents.listAgents();
    
    let count = 0;
    for await (const agent of agents) {
      count++;
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Agent ${count}:`);
      console.log(`  Name: ${agent.name}`);
      console.log(`  ID: ${agent.id}`);
      console.log(`  Description: ${agent.description || 'N/A'}`);
      console.log(`  Model: ${agent.model}`);
      console.log(`  Tools: ${JSON.stringify(agent.tools, null, 2)}`);
      console.log(`  Tool Resources: ${JSON.stringify(agent.toolResources, null, 2)}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }
    
    console.log(`\n✅ Total agents found: ${count}`);
    console.log("\n📌 To use the Fabric Data Agent:");
    console.log("1. Find the agent with Fabric/Data in its name");
    console.log("2. Copy its ID");
    console.log("3. Update src/fabricDataAgentClient.js with that ID");
    
  } catch (error) {
    console.error("❌ Error listing agents:", error);
    console.error("Error details:", error.message);
  }
}

listAllAgents();

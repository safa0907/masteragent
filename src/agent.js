const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { MemorySaver } = require("@langchain/langgraph");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { AzureChatOpenAI, ChatOpenAI } = require("@langchain/openai");
const { ActivityTypes } = require("@microsoft/agents-activity");
const { AgentApplicationBuilder, MessageFactory } = require("@microsoft/agents-hosting");
const { dateTool } = require("./tools/dateTimeTool");
const { getWeatherTool } = require("./tools/getWeatherTool");
const { AgentOrchestrator } = require("./orchestrator");
const { ShopperAgentClient } = require("./shopperAgentClient");
const { TaxiAgentClient } = require("./taxiAgentClient");
const { CoordinationManager } = require("./coordinationManager");
const { MultiStopJourneyPlanner } = require("./multiStopJourneyPlanner");

const weatherAgent = new AgentApplicationBuilder().build();

weatherAgent.onConversationUpdate(
  "membersAdded",
  async (context) => {
    await context.sendActivity(
      `Hello and Welcome! I can help you with weather forecasts, shopping recommendations, and taxi services!`
    );
  }
);

const agentModel = new AzureChatOpenAI({
  azureOpenAIApiVersion: "2024-12-01-preview",
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  temperature: 0,
});

const agentTools = [getWeatherTool, dateTool];
const agentCheckpointer = new MemorySaver();
const agent = createReactAgent({
  llm: agentModel,
  tools: agentTools,
  checkpointSaver: agentCheckpointer,
});

const orchestrator = new AgentOrchestrator();
const shopperClient = new ShopperAgentClient();
const taxiClient = new TaxiAgentClient();
const coordinationManager = new CoordinationManager(agent);
const journeyPlanner = new MultiStopJourneyPlanner(agent);

const sysMessage = new SystemMessage(`
You are a friendly assistant that helps people find a weather forecast for a given time and place.
You may ask follow up questions until you have enough informatioon to answer the customers question,
but once you have a forecast forecast, make sure to format it nicely using an adaptive card.

Respond in JSON format with the following JSON schema, and do not use markdown in the response:

{
    "contentType": "'Text' or 'AdaptiveCard' only",
    "content": "{The content of the response, may be plain text, or JSON based adaptive card}"
}`);

weatherAgent.onActivity(ActivityTypes.Message, async (context, state) => {
  const userMessage = context.activity.text;
  
  console.log("📨 Received message:", userMessage);
  
  // First, check if this is a multi-stop journey request
  console.log("🔍 Checking if multi-stop journey...");
  const journeyPlan = await journeyPlanner.planMultiStopJourney(userMessage, context);
  
  if (journeyPlan) {
    // Multi-stop journey planned successfully
    console.log("✅ Multi-stop journey planning completed");
    await context.sendActivity(journeyPlan);
    return;
  }
  
  console.log("⏭️ Not a multi-stop journey, checking complex query...");
  
  // Next, check if this is a complex multi-agent query
  const complexResponse = await coordinationManager.handleComplexQuery(
    userMessage, 
    context
  );
  
  if (complexResponse) {
    // Complex query handled by coordination manager
    console.log("✅ Multi-agent coordination completed");
    await context.sendActivity(complexResponse);
    return;
  }
  
  // Otherwise, route to single agent as before
  const targetAgent = await orchestrator.routeToAgent(userMessage);
  console.log(`Routing message to: ${targetAgent} agent`);

  if (targetAgent === "shopper") {
    try {
      const response = await shopperClient.query(userMessage);
      await context.sendActivity(response);
    } catch (error) {
      console.error("Error with shopper agent:", error);
      await context.sendActivity("Sorry, I encountered an error with the shopping agent. Please try again.");
    }
  } else if (targetAgent === "taxi") {
    try {
      const response = await taxiClient.query(userMessage);
      await context.sendActivity(response);
    } catch (error) {
      console.error("Error with taxi agent:", error);
      await context.sendActivity("Sorry, I encountered an error with the taxi agent. Please try again.");
    }
  } else {
    // Weather agent logic (existing code)
    const llmResponse = await agent.invoke(
      {
        messages: [sysMessage, new HumanMessage(userMessage)],
      },
      {
        configurable: { thread_id: context.activity.conversation.id },
      }
    );

    const llmResponseContent = JSON.parse(
      llmResponse.messages[llmResponse.messages.length - 1].content
    );

    if (llmResponseContent.contentType === "Text") {
      await context.sendActivity(llmResponseContent.content);
    } else if (llmResponseContent.contentType === "AdaptiveCard") {
      const response = MessageFactory.attachment({
        contentType: "application/vnd.microsoft.card.adaptive",
        content: llmResponseContent.content,
      });
      await context.sendActivity(response);
    }
  }
});

module.exports = {
  weatherAgent,
};

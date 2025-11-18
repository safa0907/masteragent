# Strategy 2 Demo Setup Guide: LLM Router Orchestration

This guide provides step-by-step instructions for setting up and demonstrating the multi-agent system using Strategy 2 (LLM Router). The system routes user queries to specialized agents: Weather Agent, Shopper Agent, and Taxi Agent (NYC data only).

## Prerequisites

### Required Software
1. **Node.js** (versions 18, 20, or 22)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **Microsoft 365 Agents Toolkit** (either option):
   - [VS Code Extension](https://aka.ms/teams-toolkit) (recommended)
   - [CLI tool](https://aka.ms/teamsfx-toolkit-cli)

3. **Azure Resources**
   - Azure OpenAI service with GPT-4o-mini deployment
   - Azure AI Foundry project with the following agents configured:
     - Shopper Agent (Agent ID: `asst_vUZkdjyFk8FsEUWk2wWY9csH`)
     - Taxi Agent (Agent ID: `asst_AopGuMDQM94bZt5Pa2xXyURl`) - NYC data only

### Required Access
- Azure subscription with OpenAI access
- Authenticated Azure CLI or Azure credentials configured

## Step 1: Clone and Install Dependencies

```bash
# Navigate to the project directory
cd c:\Users\safaridene\AgentsToolkitProjects\MasterAgent

# Install all dependencies
npm install
```

## Step 2: Configure Environment Variables

1. Open the file `env/.env.playground.user` (create if it doesn't exist)

2. Add the following configuration:

```env
# Azure OpenAI Configuration
SECRET_AZURE_OPENAI_API_KEY=<your-azure-openai-api-key>
AZURE_OPENAI_ENDPOINT=<your-azure-openai-endpoint>
AZURE_OPENAI_DEPLOYMENT_NAME=<your-gpt4o-mini-deployment-name>
```

**Example:**
```env
SECRET_AZURE_OPENAI_API_KEY=abc123def456...
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
```

3. Verify your Azure credentials are configured:
   - Run `az login` if using Azure CLI
   - Or ensure `DefaultAzureCredential` can authenticate to your Azure AI Foundry project

## Step 3: Verify Agent Configuration

The project is pre-configured with the following agents. Verify these settings in the source files:

### Shopper Agent
- **File:** `src/shopperAgentClient.js`
- **Project URL:** `https://demo-webinar-resource.services.ai.azure.com/api/projects/demo-webinar`
- **Agent ID:** `asst_vUZkdjyFk8FsEUWk2wWY9csH`

### Taxi Agent (NYC Only)
- **File:** `src/taxiAgentClient.js`
- **Project URL:** `https://demo-webinar-resource.services.ai.azure.com/api/projects/demo-webinar`
- **Agent ID:** `asst_AopGuMDQM94bZt5Pa2xXyURl`
- **Important:** This agent only has data for New York City

### Orchestrator (LLM Router)
- **File:** `src/orchestrator.js`
- Uses Azure OpenAI to intelligently route queries to the appropriate agent

## Step 4: Start the Application

### Option A: Using VS Code (Recommended)
1. Open the project in VS Code
2. Press `F5` to start debugging
3. Select **"Debug in Microsoft 365 Agents Playground"**
4. A browser window will open with the Agents Playground

### Option B: Using Command Line
```bash
npm run dev:teamsfx:playground
```

The application will start on `http://localhost:3978`

## Step 5: Demo Scenarios

### Scenario 1: Weather Query (Weather Agent)
**User Input:** "What's the weather like in Seattle tomorrow?"

**Expected Behavior:**
- Orchestrator routes to Weather Agent
- Agent uses tools to fetch weather data
- Returns formatted response with Adaptive Card

**Test Queries:**
- "What's the weather forecast for this weekend?"
- "Will it rain in London next week?"
- "Temperature in Tokyo today?"

### Scenario 2: Shopping Query (Shopper Agent)
**User Input:** "I need to buy a laptop for work"

**Expected Behavior:**
- Orchestrator routes to Shopper Agent
- Agent accesses Azure AI Foundry knowledge base
- Returns product recommendations and shopping advice

**Test Queries:**
- "What are the best smartphones under $500?"
- "I'm looking for a winter jacket"
- "Recommend headphones for running"
- "Where can I buy office chairs?"

### Scenario 3: Taxi Query - NYC Only (Taxi Agent)
**User Input:** "I need a taxi in Manhattan"

**Expected Behavior:**
- Orchestrator routes to Taxi Agent
- Agent accesses NYC taxi knowledge base
- Returns taxi information specific to New York City

**Test Queries:**
- "Book a cab in New York City"
- "How much does a taxi cost from JFK to Times Square?"
- "Are taxis available in Brooklyn?"
- "What's the taxi fare in Manhattan?"

**Important Notes:**
- ✅ **Works:** NYC-related taxi queries
- ❌ **Won't Work:** Queries about taxis in other cities (e.g., "taxi in Los Angeles", "cab in Chicago")
- The agent will indicate if data is unavailable for non-NYC locations

### Scenario 4: Testing the Router Intelligence

**Mixed Context Queries:**
1. "What should I wear for the weather in Seattle?" → Routes to Weather Agent
2. "Where can I buy an umbrella?" → Routes to Shopper Agent
3. "Get me a taxi to Central Park" → Routes to Taxi Agent (NYC only)

**Edge Cases:**
1. "Weather in NYC and then I need a taxi" → Router picks primary intent
2. "Shopping in New York" → Should route to Shopper Agent (not Taxi)

## Step 6: Understanding the Routing Logic

The orchestrator (`src/orchestrator.js`) uses Azure OpenAI to analyze user queries and route them:

```javascript
Available agents:
- "weather": weather forecasts, temperature, climate
- "shopper": shopping, products, purchases, recommendations
- "taxi": taxi services, cab booking (NYC ONLY), ride requests
```

**How it Works:**
1. User sends a message
2. Orchestrator analyzes intent using GPT-4o-mini
3. Returns one of: "weather", "shopper", or "taxi"
4. Main agent routes to the appropriate specialized agent
5. Response is returned to the user

## Step 7: Monitoring and Debugging

### Console Logs
The application logs routing decisions:
```
Routing message to: shopper agent
Retrieved shopper agent: ShopperAgent
Created thread, ID: thread_abc123
Shopper agent run completed with status: completed
```

### Debugging Tips
1. Check console for routing decisions
2. Verify Azure credentials if agent calls fail
3. Ensure all environment variables are set correctly
4. Check that agent IDs match your Azure AI Foundry configuration

### Common Issues

**Issue:** "Error in taxi agent client"
- **Solution:** Verify you're querying about NYC taxis only
- **Solution:** Check DefaultAzureCredential authentication

**Issue:** "No response from shopper agent"
- **Solution:** Verify agent ID is correct in `shopperAgentClient.js`
- **Solution:** Check Azure AI Foundry project URL

**Issue:** Router always picks weather agent
- **Solution:** Rephrase query to be more explicit
- **Solution:** Check Azure OpenAI deployment is working

## Step 8: Demo Best Practices

### Recommended Demo Flow

1. **Introduction (1 min)**
   - Explain the multi-agent architecture
   - Show the three specialized agents

2. **Weather Demo (2 min)**
   - Query: "What's the weather in Seattle?"
   - Show adaptive card response
   - Explain tool usage

3. **Shopping Demo (2 min)**
   - Query: "I need a new laptop"
   - Show knowledge base integration
   - Demonstrate recommendations

4. **Taxi Demo - NYC Focus (2 min)**
   - Query: "I need a taxi in Manhattan"
   - **Emphasize NYC limitation**
   - Show: "Get me a cab to Brooklyn"
   - Contrast: "I need a taxi in Boston" (won't have data)

5. **Router Intelligence (2 min)**
   - Show mixed queries
   - Demonstrate automatic routing
   - Explain LLM-based decision making

6. **Q&A (1 min)**

### NYC-Specific Demo Script

For the Taxi Agent demo, use this script to address the NYC limitation:

"Our Taxi Agent is specifically configured with New York City data. Let me demonstrate:

✅ **This works:** 'Book a taxi from Times Square to JFK'
✅ **This works:** 'What's the fare for a cab in Manhattan?'
❌ **This won't have data:** 'Get me a taxi in San Francisco'

This showcases how agents can be configured with domain-specific knowledge bases. In a production system, you could add data for other cities or create city-specific agents."

## Advanced: Extending the System

### Adding More Cities to Taxi Agent
1. Upload additional city data to Azure AI Foundry knowledge base
2. Update agent instructions to handle multiple cities
3. Test with queries for new locations

### Creating Additional Agents
1. Create new agent client file (e.g., `hotelAgentClient.js`)
2. Add routing logic to `orchestrator.js`
3. Update main agent handler in `agent.js`
4. Add new agent type to routing prompt

### Customizing the Router
Edit `src/orchestrator.js` to:
- Add more sophisticated routing logic
- Include context awareness
- Implement fallback strategies

## Troubleshooting Reference

| Problem | Solution |
|---------|----------|
| Agents not responding | Check Azure credentials and agent IDs |
| Router always picks same agent | Make queries more explicit, check OpenAI deployment |
| Taxi agent fails for NYC queries | Verify knowledge base is uploaded in AI Foundry |
| Environment variables not loading | Ensure `.env.playground.user` file exists with correct values |
| Dependencies not installing | Run `npm cache clean --force` then `npm install` |

## Resources

- [Microsoft 365 Agents SDK Documentation](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Azure AI Foundry Documentation](https://learn.microsoft.com/azure/ai-studio/)
- [LangChain Documentation](https://js.langchain.com/docs/)
- [Azure OpenAI Service](https://learn.microsoft.com/azure/ai-services/openai/)

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify all prerequisites are met
3. Ensure Azure resources are properly configured
4. Review the troubleshooting section above

---

**Note:** This demo showcases Strategy 2 (LLM Router Orchestration), where an LLM intelligently routes user queries to specialized agents. The Taxi Agent's NYC limitation demonstrates real-world scenarios where agents have domain-specific data boundaries.

// Test script to verify Fabric Data Agent connectivity
const { FabricAgentDirectClient } = require("./fabricAgentDirectClient");

async function testFabricAgent() {
  console.log("🧪 Testing Fabric Data Agent Connection...\n");
  
  const fabricClient = new FabricAgentDirectClient();
  
  // Test 1: Simple query
  console.log("Test 1: Total green taxi trips in 2022");
  const test1 = await fabricClient.queryData("Give me total green taxi trips in New York in 2022");
  console.log("Result:", test1);
  console.log("\n---\n");
  
  // Test 2: Average fare
  console.log("Test 2: Average fare amount");
  const test2 = await fabricClient.queryData("What is the average fare_amount for green taxi trips in New York?");
  console.log("Result:", test2);
  console.log("\n---\n");
  
  // Test 3: Using getTaxiMetrics
  console.log("Test 3: Get fare metrics");
  const test3 = await fabricClient.getTaxiMetrics({
    metric: 'fare',
    location: 'New York',
    date: '2022'
  });
  console.log("Result:", test3);
  console.log("\n---\n");
  
  // Test 4: Trip distance
  console.log("Test 4: Average trip distance");
  const test4 = await fabricClient.getTaxiMetrics({
    metric: 'distance',
    location: 'Manhattan'
  });
  console.log("Result:", test4);
  
  console.log("\n✅ Fabric Agent Testing Complete");
}

testFabricAgent().catch(error => {
  console.error("❌ Test failed:", error);
});

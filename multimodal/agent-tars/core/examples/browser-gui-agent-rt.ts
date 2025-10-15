/*
 * Quick real-environment runner for BrowserGUIAgent
 * - Launches a local Chrome (via Puppeteer)
 * - Navigates to a page
 * - Uses BrowserGUIAgent.screenshot() and saves a WEBP file
 */
import { AgentTARS } from '../src';

async function main() {
  const localAgent = new AgentTARS({
    model: {
      provider: 'volcengine',
      id: 'ep-20250510145437-5sxhs',
      apiKey: process.env.ARK_API_KEY,
      displayName: 'doubao-1.5-thinking-vision-pro',
    },
    toolCallEngine: 'structured_outputs',
  });
  await localAgent.initialize();
  const tools = localAgent.getTools();
  console.log('\n📋 Available Tools:');
  console.log('─'.repeat(80));
  tools.forEach((tool, index) => {
    const num = (index + 1).toString().padStart(2, ' ');
    const name = tool.name.padEnd(30, ' ');
    const desc = (tool.description || 'No description').substring(0, 45).replace(/\n/g, ' ');
    console.log(`${num}. ${name} │ ${desc}`);
  });
  console.log('─'.repeat(80));
  console.log(`Total: ${tools.length} tools\n`);

  // Test tasks to run
  const tasks = [
    'Open https://seed-tars.com',
    'Use gui to go to https://www.producthunt.com/, search the top products for "AI", from the results, identify the top-listed product (the top 3 result). Collect the following information from that product\'s card: 1. Product name 2. Short description 3. Number of upvotes summarize it and report to me.',
    'Use gui action, go to https://sample-files.com/documents/pdf/, find the 65KB pdf file, preview it, scroll the file from top to bottom.',
  ];

  // Execute tasks iteratively
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`\n🚀 Executing Task ${i + 1}:`);
    console.log(`📝 ${task}`);
    console.log('─'.repeat(80));

    try {
      const response = await localAgent.run(task);
      console.log(`✅ Task ${i + 1} Response:`, response);
    } catch (error) {
      console.error(`❌ Task ${i + 1} Failed:`, error);
    }

    console.log('─'.repeat(80));
  }
  console.log('🎉 All tasks completed. Exiting...');

  // Clean up resources and exit
  console.log('\n🧹 Cleaning up resources...');
  try {
    await localAgent.cleanup();
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Runner failed:', err);
  process.exit(1);
});

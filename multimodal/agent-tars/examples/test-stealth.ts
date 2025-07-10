/*
 * Test script to verify Puppeteer Stealth plugin functionality
 * This script visits a bot detection website to check if the browser is detected as automated
 */

import { AgentTARS } from '../src';

async function testStealthMode() {
  console.log('🧪 Testing Puppeteer Stealth functionality...\n');

  // Test with stealth enabled (default)
  console.log('1️⃣ Testing with stealth ENABLED (default):');
  const agentWithStealth = new AgentTARS({
    name: 'StealthTestAgent',
    model: {
      provider: 'openai',
      name: 'gpt-4o-mini',
    },
    browser: {
      headless: false,
      stealth: true, // Explicitly enable stealth (though it's default)
    },
  });

  try {
    await agentWithStealth.run({
      prompt: `Visit https://bot.sannysoft.com/ and tell me if any WebDriver properties are detected. 
      Look for red "FAIL" indicators on the page. A successful stealth mode should show mostly green "OK" indicators.
      Take a screenshot of the page and save it as "stealth-enabled.png".`,
    });
  } catch (error) {
    console.error('Error with stealth enabled:', error);
  } finally {
    await agentWithStealth.close();
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test with stealth disabled
  console.log('2️⃣ Testing with stealth DISABLED:');
  const agentWithoutStealth = new AgentTARS({
    name: 'NoStealthTestAgent',
    model: {
      provider: 'openai',
      name: 'gpt-4o-mini',
    },
    browser: {
      headless: false,
      stealth: false, // Explicitly disable stealth
    },
  });

  try {
    await agentWithoutStealth.run({
      prompt: `Visit https://bot.sannysoft.com/ and tell me if any WebDriver properties are detected.
      Look for red "FAIL" indicators on the page. Without stealth mode, you should see several red "FAIL" indicators.
      Take a screenshot of the page and save it as "stealth-disabled.png".`,
    });
  } catch (error) {
    console.error('Error with stealth disabled:', error);
  } finally {
    await agentWithoutStealth.close();
  }

  console.log('\n✅ Test completed! Compare the two screenshots to see the difference.');
}

// Run the test
testStealthMode().catch(console.error);

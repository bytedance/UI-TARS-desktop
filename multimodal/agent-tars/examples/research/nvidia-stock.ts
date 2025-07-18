import { agent, runAgentTARS } from '../default';
export { agent };
export const runOptions = {
  // input: `Tell me Nvidia's stock price for the past week and draw me a nice HTML card`,
  input: `Tell me Nvidia's stock price today.`,
};

runAgentTARS(`Tell me Nvidia's stock price today.`);

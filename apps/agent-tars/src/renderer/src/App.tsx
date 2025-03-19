// import { useState } from 'react';
// import { api } from '@renderer/api';
import { AgentApp } from './components/AgentApp';
import './index.scss';

function App(): JSX.Element {
  // const [agentResponse, setAgentResponse] = useState<string>();
  // const callAgent = async (): Promise<void> => {
  //   const res = await api.runAgent();
  //   setAgentResponse(res);
  // };

  return (
    <div className="w-full">
      <AgentApp />
    </div>
  );
}

export default App;

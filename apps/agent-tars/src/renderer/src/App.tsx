import { AgentApp } from './components/AgentApp';
import { useMainProcessErrorHandler } from './services/errorHandlerService';
import { DeprecationBanner } from './components/DeprecationBanner';
import './index.scss';

function App(): JSX.Element {
  // Set up main process error handler
  useMainProcessErrorHandler();

  return (
    <>
      <DeprecationBanner />
      <div className="w-full">
        <AgentApp />
      </div>
    </>
  );
}

export default App;

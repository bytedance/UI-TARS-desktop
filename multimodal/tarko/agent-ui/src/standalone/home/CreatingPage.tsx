import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { useSession } from '@/common/hooks/useSession';
import { SessionCreatingState } from '@/standalone/chat/components/SessionCreatingState';
import { globalRuntimeSettingsAtom, resetGlobalRuntimeSettingsAction } from '@/common/state/atoms/globalRuntimeSettings';
import { createSessionAction } from '@/common/state/actions/sessionActions';
import { ChatCompletionContentPart } from '@tarko/agent-interface';

interface LocationState {
  query?: string | ChatCompletionContentPart[];
  runtimeSettings?: Record<string, any>; // Persistent settings for the session
  agentOptions?: Record<string, any>; // One-time options for this specific task
}

/**
 * CreatingPage - Handles session creation with agent options from multiple sources:
 * 1. Internal navigation with state (from home page)
 * 2. URL parameters (for deployment users)
 */
const CreatingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { sendMessage } = useSession();
  const globalSettings = useAtomValue(globalRuntimeSettingsAtom);
  const resetGlobalSettings = useSetAtom(resetGlobalRuntimeSettingsAction);
  const createSession = useSetAtom(createSessionAction);
  const [isCreating, setIsCreating] = useState(true);
  const hasExecuted = useRef(false);

  useEffect(() => {
    // Prevent double execution
    if (hasExecuted.current) {
      return;
    }
    hasExecuted.current = true;

    const createSessionWithOptions = async () => {
      try {
        // Get parameters from multiple sources (priority order):
        // 1. Router state (internal navigation from home page)
        // 2. Global runtime settings (from home page)
        // 3. URL search params (deployment users)
        
        const state = location.state as LocationState | null;
        let runtimeSettings: Record<string, any> = {}; // Persistent session settings
        let agentOptions: Record<string, any> = {}; // One-time task options
        let query: string | ChatCompletionContentPart[] | null = null;

        // Source 1: Router state (highest priority)
        if (state) {
          runtimeSettings = state.runtimeSettings || {};
          agentOptions = state.agentOptions || {};
          query = state.query || null;
        }
        // Source 2: Global runtime settings from home page
        else if (globalSettings.isActive && Object.keys(globalSettings.selectedValues).length > 0) {
          runtimeSettings = globalSettings.selectedValues;
          query = searchParams.get('q');
        }
        // Source 3: URL search params (for deployment users)
        else {
          const runtimeSettingsParam = searchParams.get('runtimeSettings');
          const agentOptionsParam = searchParams.get('agentOptions');
          
          if (runtimeSettingsParam) {
            try {
              runtimeSettings = JSON.parse(decodeURIComponent(runtimeSettingsParam));
            } catch (error) {
              console.error('Failed to parse runtimeSettings from URL:', error);
            }
          }
          
          if (agentOptionsParam) {
            try {
              agentOptions = JSON.parse(decodeURIComponent(agentOptionsParam));
            } catch (error) {
              console.error('Failed to parse agentOptions from URL:', error);
            }
          }
          
          query = searchParams.get('q');
        }

        console.log('Creating session with:', { runtimeSettings, agentOptions, query });

        // Create session with runtime settings (persistent) and agent options (one-time)
        const sessionId = await createSession(
          Object.keys(runtimeSettings).length > 0 ? runtimeSettings : undefined,
          Object.keys(agentOptions).length > 0 ? agentOptions : undefined
        );

        // Clear global settings after successful session creation
        if (globalSettings.isActive) {
          resetGlobalSettings();
        }

        // Navigate to the new session
        navigate(`/${sessionId}`, { replace: true });

        // Send the initial query
        if (query) {
          await sendMessage(query);
        }
      } catch (error) {
        console.error('Failed to create session:', error);
        // Navigate back to home on error
        navigate('/', { replace: true });
      } finally {
        setIsCreating(false);
      }
    };

    createSessionWithOptions();
  }, []); // Empty dependency array since we use useRef to prevent double execution

  return (
    <div className="h-full flex items-center justify-center">
      <SessionCreatingState isCreating={isCreating} />
    </div>
  );
};

export default CreatingPage;
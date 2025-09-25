import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { apiService } from '@/common/services/apiService';
import { useSession } from '@/common/hooks/useSession';
import { SessionCreatingState } from '@/standalone/chat/components/SessionCreatingState';
import { globalRuntimeSettingsAtom, resetGlobalRuntimeSettingsAction } from '@/common/state/atoms/globalRuntimeSettings';
import { useSetAtom } from 'jotai';

interface LocationState {
  query?: string;
  agentOptions?: Record<string, any>;
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
  const [isCreating, setIsCreating] = useState(true);

  useEffect(() => {
    const createSessionWithOptions = async () => {
      try {
        // Get agent options from multiple sources (priority order):
        // 1. Router state (internal navigation from home page)
        // 2. Global runtime settings (from home page AgentOptionsSelector)
        // 3. URL search params (deployment users)
        
        const state = location.state as LocationState | null;
        let agentOptions: Record<string, any> = {};
        let query: string | null = null;

        // Source 1: Router state (highest priority)
        if (state?.agentOptions) {
          agentOptions = state.agentOptions;
          query = state.query || null;
        }
        // Source 2: Global runtime settings from home page
        else if (globalSettings.isActive && Object.keys(globalSettings.selectedValues).length > 0) {
          agentOptions = globalSettings.selectedValues;
          query = searchParams.get('q');
        }
        // Source 3: URL search params (for deployment users)
        else {
          const agentOptionsParam = searchParams.get('agentOptions');
          if (agentOptionsParam) {
            try {
              agentOptions = JSON.parse(decodeURIComponent(agentOptionsParam));
            } catch (error) {
              console.error('Failed to parse agentOptions from URL:', error);
            }
          }
          query = searchParams.get('q');
        }

        console.log('Creating session with options:', { agentOptions, query });

        // Create session with runtime settings
        const session = await apiService.createSession(
          Object.keys(agentOptions).length > 0 ? agentOptions : undefined
        );

        // Clear global settings after successful session creation
        if (globalSettings.isActive) {
          resetGlobalSettings();
        }

        // Navigate to the new session
        navigate(`/${session.sessionId}`, { replace: true });

        // Send the initial query if provided
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
  }, [location.state, searchParams, globalSettings, resetGlobalSettings, navigate, sendMessage]);

  return (
    <div className="h-full flex items-center justify-center">
      <SessionCreatingState isCreating={isCreating} />
    </div>
  );
};

export default CreatingPage;
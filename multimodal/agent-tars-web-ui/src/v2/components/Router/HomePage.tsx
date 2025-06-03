import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import WelcomePage from '../Welcome/WelcomePage';
import { useSession } from '../../hooks/useSession';

/**
 * HomePage Component - Handles the welcome page and query parameter processing
 */
const HomePage: React.FC = () => {
  const { activeSessionId, sendMessage, createSession } = useSession();
  const location = useLocation();
  const navigate = useNavigate();

  // Process query parameters if any (for direct query submissions)
  useEffect(() => {
    const processQueryParam = async () => {
      const searchParams = new URLSearchParams(location.search);
      const query = searchParams.get('q');

      // If there's a query parameter but no active session, create one and send the query
      if (query && !activeSessionId) {
        try {
          const sessionId = await createSession();

          // Navigate to the session without the query parameter
          navigate(`/${sessionId}`);

          // Send the query after a short delay to ensure session is ready
          setTimeout(() => {
            sendMessage(query);
          }, 500);
        } catch (error) {
          console.error('Failed to process query:', error);
        }
      }
    };

    processQueryParam();
  }, [location, activeSessionId, createSession, navigate, sendMessage]);

  return <WelcomePage />;
};

export default HomePage;

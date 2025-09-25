import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import WelcomePage from './WelcomePage';
import { useSession } from '@/common/hooks/useSession';

const HomePage: React.FC = () => {
  const { activeSessionId, sendMessage, createSession } = useSession();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const processQueryParam = async () => {
      const searchParams = new URLSearchParams(location.search);
      const query = searchParams.get('q');

      if (query && !activeSessionId) {
        try {
          const sessionId = await createSession(); // No parameters for simple session creation

          navigate(`/${sessionId}`);

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

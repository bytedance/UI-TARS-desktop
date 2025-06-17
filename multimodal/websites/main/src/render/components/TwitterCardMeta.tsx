import React from 'react';
import { Helmet } from 'react-helmet';

interface TwitterCardMetaProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'summary' | 'summary_large_image' | 'app' | 'player';
}

export const TwitterCardMeta: React.FC<TwitterCardMetaProps> = ({
  title = 'Agent TARS - Open-source Multimodal AI Agent',
  description = 'An open-source multimodal AI agent designed to revolutionize GUI interaction by visually interpreting web pages and seamlessly integrating with command lines and file systems.',
  image = 'https://github.com/bytedance/UI-TARS-desktop/blob/main/apps/agent-tars/public/twitter-card.png?raw=true',
  url = 'https://agent-tars.com',
  type = 'summary_large_image',
}) => {
  return (
    <Helmet>
      {/* Twitter Card data */}
      <meta name="twitter:card" content={type} />
      <meta name="twitter:site" content="@AgentTars" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:creator" content="@AgentTars" />

      {/* Open Graph data (used by Facebook and other platforms) */}
      <meta property="og:title" content={title} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content="Agent TARS" />
    </Helmet>
  );
};

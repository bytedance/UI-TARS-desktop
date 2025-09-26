import React from 'react';
import { FiZap } from 'react-icons/fi';
import { TbBulb, TbSearch, TbBook, TbSettings, TbBrain, TbBrowser } from 'react-icons/tb';
import { AgentRuntimeSettingProperty } from '@tarko/interface';

/**
 * Get the appropriate icon for an agent option based on key, title, or explicit icon property
 */
export const getAgentOptionIcon = (
  key: string, 
  property?: AgentRuntimeSettingProperty,
  size: 'sm' | 'md' = 'md'
): React.ReactElement => {
  const className = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  // Use custom icon if specified in property
  if (property?.icon) {
    switch (property.icon) {
      case 'browser':
        return <TbBrowser className={className} />;
      case 'search':
        return <TbSearch className={className} />;
      case 'book':
        return <TbBook className={className} />;
      case 'bulb':
        return <TbBulb className={className} />;
      case 'brain':
        return <TbBrain className={className} />;
      case 'zap':
        return <FiZap className={className} />;
      default:
        return <TbSettings className={className} />;
    }
  }

  // Fallback to key/title-based detection
  const lowerKey = key.toLowerCase();
  const lowerTitle = (property?.title || '').toLowerCase();
  
  if (lowerKey.includes('browser') || lowerTitle.includes('browser'))
    return <TbBrowser className={className} />;
  if (lowerKey.includes('search')) 
    return <TbSearch className={className} />;
  if (lowerKey.includes('research')) 
    return <TbBook className={className} />;
  if (lowerKey.includes('foo')) 
    return <TbBulb className={className} />;
  if (lowerKey.includes('thinking') || lowerTitle.includes('思考'))
    return <TbBrain className={className} />;
  
  // Default to lightning bolt for agent options
  return <FiZap className={className} />;
};
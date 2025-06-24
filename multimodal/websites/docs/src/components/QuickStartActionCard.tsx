import { usePageData, useI18n } from 'rspress/runtime';
import React from 'react';
import './QuickStartActionCard.css';

export const QuickStartActionCard = () => {
  const {
    siteData: { base },
  } = usePageData();
  const t = useI18n<typeof import('i18n')>();

  const cards = [
    {
      title: t('quick-action-card.cli.title'),
      description: t('quick-action-card.cli.description'),
      icon: '⌨️',
      href: `${base}guide/get-started/quick-start.html`,
      color: 'linear-gradient(135deg, #34d399 0%, #0ea5e9 100%)',
    },
    {
      title: t('quick-action-card.sdk.title'),
      description: t('quick-action-card.sdk.description'),
      icon: '📦',
      href: `${base}sdk/introduction.html`,
      color: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    },
  ];

  return (
    <div className="quick-action-card-container">
      {cards.map((card, index) => (
        <a
          key={index}
          href={card.href}
          className="quick-action-card"
          style={{ '--card-color': card.color } as React.CSSProperties}
        >
          <div className="card-icon">{card.icon}</div>
          <div className="card-content">
            <h3 className="card-title">{card.title}</h3>
            <p className="card-description">{card.description}</p>
          </div>
          <div className="card-arrow">→</div>
        </a>
      ))}
    </div>
  );
};

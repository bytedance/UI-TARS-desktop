import { usePageData } from 'rspress/runtime';
import React from 'react';
import './QuickStartActionCard.css';

export const QuickStartActionCard = () => {
  const {
    siteData: { base },
  } = usePageData();

  const cards = [
    {
      title: 'Agent TARS CLI',
      description: '使用命令行工具快速开始构建你的 Agent 应用',
      icon: '⌨️',
      href: `${base}guide/get-started/quick-start.html`,
      color: 'linear-gradient(135deg, #34d399 0%, #0ea5e9 100%)',
    },
    {
      title: 'Agent TARS SDK',
      description: '为开发者提供丰富的 SDK 构建自定义 Agent',
      icon: '📦',
      href: `${base}sdk/introduction.html`,
      color: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    },
  ];

  return (
    <div className="quick-start-card-container">
      {cards.map((card, index) => (
        <a
          key={index}
          href={card.href}
          className="quick-start-card"
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

import { usePageData, useI18n } from 'rspress/runtime';
import React from 'react';
import './QuickStartActionCard.css';
import { ActionCard } from './ActionCard';
import { ActionCardContainer } from './ActionCardContainer';

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
      color: 'green',
    },
    {
      title: t('quick-action-card.sdk.title'),
      description: t('quick-action-card.sdk.description'),
      icon: '📦',
      href: `${base}sdk/introduction.html`,
      color: 'purple',
    },
  ];

  return (
    <ActionCardContainer>
      {cards.map((card, index) => (
        <ActionCard
          key={index}
          title={card.title}
          description={card.description}
          icon={card.icon}
          href={card.href}
          color={card.color}
        />
      ))}
    </ActionCardContainer>
  );
};

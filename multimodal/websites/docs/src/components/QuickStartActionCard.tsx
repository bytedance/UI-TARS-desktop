import { useI18n } from 'rspress/runtime';
import { ActionCard } from './ActionCard';
import { ActionCardContainer } from './ActionCardContainer';
import { useLocaledPath } from './hooks';
import './QuickStartActionCard.css';

export const QuickStartActionCard = () => {
  const t = useI18n<typeof import('i18n')>();
  const { localedPath } = useLocaledPath();

  const cards = [
    {
      title: t('quick-action-card.cli.title'),
      description: t('quick-action-card.cli.description'),
      icon: '⌨️',
      href: `${localedPath}guide/get-started/quick-start.html`,
      color: 'green',
    },
    {
      title: t('quick-action-card.sdk.title'),
      description: t('quick-action-card.sdk.description'),
      icon: '📦',
      href: `${localedPath}sdk/introduction.html`,
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

import { LinkCard } from '@theme';
import { usePageData } from 'rspress/runtime';

export const QuickStartActionCard = () => {
  const {
    siteData: { base },
  } = usePageData();

  console.log('base', base);

  return (
    <>
      <LinkCard
        href={`${base}guide/get-started/quick-start.html`}
        title="Agent TARS CLI"
        description="Link Card Description"
      />
      <br />
      <LinkCard
        href={`${base}sdk/introduction.html`}
        title="Agent TARS SDK"
        description="Link Card Description"
      />
    </>
  );
};

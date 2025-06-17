import React, { useState, useEffect } from 'react';
import { Octokit } from '@octokit/rest';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { WorkflowSection } from './WorkflowSection';
import { CommunitySection } from './CommunitySection';
import { Footer } from './Footer';
import { VideoModal } from './VideoModal';
import { Background } from './Background';

export const Home: React.FC = () => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [starCount, setStarCount] = useState(0);

  useEffect(() => {
    const fetchStarCount = async () => {
      const octokit = new Octokit();
      try {
        const { data } = await octokit.repos.get({
          owner: 'bytedance',
          repo: 'UI-TARS-desktop',
        });
        setStarCount(data.stargazers_count);
      } catch (error) {
        console.error('Failed to fetch star count:', error);
      }
    };

    fetchStarCount();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      <Background />

      <HeroSection onOpenVideo={() => setIsVideoModalOpen(true)} />
      <FeaturesSection />
      <WorkflowSection />
      <CommunitySection />
      <Footer />

      <VideoModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} />
    </div>
  );
};

import { useI18n } from '@rspress/core/runtime';
import { isInSSR } from '../shared/env';
import { ActionCard } from './ActionCard';

export function NotFoundLayout() {
  const t = useI18n<typeof import('i18n')>();

  if (isInSSR()) {
    return null;
  }

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        {/* Large 404 number with elegant styling */}
        <div className="not-found-number">
          <span className="number-4-1">4</span>
          <span className="number-0">0</span>
          <span className="number-4-2">4</span>
        </div>

        {/* Subtitle */}
        <div className="not-found-subtitle">PAGE NOT FOUND</div>

        {/* Main content */}
        <div className="not-found-main">
          <h1 className="not-found-title">{t('not-found.title')}</h1>
          <p className="not-found-description">{t('not-found.description')}</p>
        </div>

        {/* Action buttons */}
        <div className="not-found-actions">
          <ActionCard
            title={t('not-found.github')}
            description={t('not-found.github-desc')}
            icon="🐙"
            href="https://github.com/bytedance/UI-TARS-desktop/issues"
            color="gray"
            showArrow={true}
          />

          <ActionCard
            title={t('not-found.discord')}
            description={t('not-found.discord-desc')}
            icon="💬"
            href="#"
            color="gray"
            showArrow={true}
          />
        </div>

        {/* Take me home link */}
        <div className="not-found-home">
          <a href="/" className="home-link">
            Take me home
          </a>
        </div>
      </div>

      <style jsx>{`
        .not-found-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 2rem;
        }

        .dark .not-found-container {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }

        .not-found-content {
          text-align: center;
          max-width: 600px;
          width: 100%;
        }

        .not-found-number {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 1rem;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .number-4-1,
        .number-4-2 {
          font-size: clamp(6rem, 15vw, 12rem);
          color: #1e293b;
          text-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .dark .number-4-1,
        .dark .number-4-2 {
          color: #f1f5f9;
          text-shadow: 0 4px 8px rgba(255, 255, 255, 0.1);
        }

        .number-0 {
          font-size: clamp(6rem, 15vw, 12rem);
          color: #64748b;
          margin: 0 -0.5rem;
          opacity: 0.6;
        }

        .dark .number-0 {
          color: #94a3b8;
        }

        .not-found-subtitle {
          font-size: 0.875rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          color: #64748b;
          margin-bottom: 3rem;
          text-transform: uppercase;
        }

        .dark .not-found-subtitle {
          color: #94a3b8;
        }

        .not-found-main {
          margin-bottom: 3rem;
        }

        .not-found-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 1rem;
          line-height: 1.4;
        }

        .dark .not-found-title {
          color: #f1f5f9;
        }

        .not-found-description {
          font-size: 1rem;
          color: #64748b;
          line-height: 1.6;
          max-width: 480px;
          margin: 0 auto;
        }

        .dark .not-found-description {
          color: #94a3b8;
        }

        .not-found-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 3rem;
        }

        @media (min-width: 640px) {
          .not-found-actions {
            flex-direction: row;
            justify-content: center;
            gap: 1.5rem;
          }
        }

        .not-found-home {
          border-top: 1px solid #e2e8f0;
          padding-top: 2rem;
        }

        .dark .not-found-home {
          border-top-color: #334155;
        }

        .home-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid transparent;
        }

        .home-link:hover {
          color: #2563eb;
          background-color: #eff6ff;
          border-color: #dbeafe;
        }

        .dark .home-link {
          color: #60a5fa;
        }

        .dark .home-link:hover {
          color: #93c5fd;
          background-color: #1e3a8a;
          border-color: #1d4ed8;
        }
      `}</style>
    </div>
  );
}

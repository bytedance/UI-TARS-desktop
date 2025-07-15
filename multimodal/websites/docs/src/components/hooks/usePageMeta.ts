import { useEffect } from 'react';
import { isInSSR } from '../../shared/env';
import { SEO_CONFIG } from '../../shared/seoConfig';

interface PageMetaOptions {
  title?: string;
  description?: string;
  type?: 'website' | 'article';
  url?: string;
  image?: string;
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * Hook to set page meta tags for better SEO
 * Safely handles SSR environment to avoid build failures
 */
export function usePageMeta(options: PageMetaOptions) {
  useEffect(() => {
    // Avoid setting meta tags during SSR to prevent build issues
    if (isInSSR() || typeof document === 'undefined') {
      return;
    }

    const {
      title,
      description,
      type = 'website',
      url,
      image,
      keywords,
      author,
      publishedTime,
      modifiedTime,
    } = options;

    // Helper function to set or update meta tag
    const setMetaTag = (name: string, content: string, property?: boolean) => {
      const attribute = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);

      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }

      meta.setAttribute('content', content);
    };

    // Set document title
    if (title) {
      document.title = title;
    }

    // Basic meta tags
    if (description) {
      setMetaTag('description', description);
    }

    // Keywords
    if (keywords && keywords.length > 0) {
      setMetaTag('keywords', keywords.join(', '));
    } else {
      setMetaTag('keywords', SEO_CONFIG.keywords.join(', '));
    }

    // Author
    setMetaTag('author', author || SEO_CONFIG.author);

    // Content language and robots
    setMetaTag('content-language', SEO_CONFIG.contentLanguage);
    setMetaTag('robots', SEO_CONFIG.robots);

    // Open Graph tags
    setMetaTag('og:title', title || SEO_CONFIG.defaultTitle, true);
    setMetaTag('og:description', description || SEO_CONFIG.defaultDescription, true);
    setMetaTag('og:type', type, true);
    setMetaTag('og:site_name', SEO_CONFIG.siteName, true);
    setMetaTag('og:image', image || SEO_CONFIG.images.defaultOgImage, true);

    if (url) {
      setMetaTag('og:url', url, true);
    }

    // Article specific meta tags
    if (type === 'article') {
      if (publishedTime) {
        setMetaTag('article:published_time', publishedTime, true);
      }
      if (modifiedTime) {
        setMetaTag('article:modified_time', modifiedTime, true);
      }
      setMetaTag('article:author', author || SEO_CONFIG.author, true);
    }

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:site', SEO_CONFIG.social.twitter.site);
    setMetaTag('twitter:creator', SEO_CONFIG.social.twitter.creator);
    setMetaTag('twitter:title', title || SEO_CONFIG.defaultTitle);
    setMetaTag('twitter:description', description || SEO_CONFIG.defaultDescription);
    setMetaTag('twitter:image', image || SEO_CONFIG.images.defaultOgImage);

    // Canonical URL
    if (url) {
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', url);
    }
  }, [
    options.title,
    options.description,
    options.type,
    options.url,
    options.image,
    options.keywords,
    options.author,
    options.publishedTime,
    options.modifiedTime,
  ]);
}

/**
 * Generate page title with site branding
 */
export function generatePageTitle(pageTitle?: string): string {
  return pageTitle ? `${pageTitle} | ${SEO_CONFIG.siteName}` : SEO_CONFIG.defaultTitle;
}

/**
 * Truncate description to optimal length for meta tags
 */
export function optimizeDescription(description: string, maxLength: number = 155): string {
  if (description.length <= maxLength) {
    return description;
  }

  // Find the last complete word within the limit
  const truncated = description.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  return lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) + '...' : truncated + '...';
}

/**
 * Generate structured data for SEO
 */
export function generateStructuredData(options: {
  type: 'WebSite' | 'Organization' | 'Article';
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}) {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': options.type,
    name: options.title || SEO_CONFIG.defaultTitle,
    description: options.description || SEO_CONFIG.defaultDescription,
    url: options.url || SEO_CONFIG.siteUrl,
    image: options.image || SEO_CONFIG.images.defaultOgImage,
  };

  if (options.type === 'Article') {
    return {
      ...baseData,
      author: {
        '@type': 'Organization',
        name: options.author || SEO_CONFIG.author,
      },
      publisher: {
        '@type': 'Organization',
        name: SEO_CONFIG.siteName,
        logo: {
          '@type': 'ImageObject',
          url: SEO_CONFIG.images.favicon,
        },
      },
      datePublished: options.publishedTime,
      dateModified: options.modifiedTime || options.publishedTime,
    };
  }

  return baseData;
}

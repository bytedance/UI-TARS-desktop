import fs from 'fs';
import path from 'path';
import type { RsbuildPlugin } from '@rsbuild/core';
import { availableDocs, blogPosts, getBlogPermalink } from '../docs/config';
import { showcaseItems } from '../data/showcaseData';
import { ETopRoute } from '../constants/routes';

export interface HtmlGeneratorOptions {
  /**
   * Additional static route paths, will generate corresponding HTML files for each path
   * @default []
   */
  additionalRoutes?: string[];

  /**
   * Whether to generate HTML files for document routes
   * @default true
   */
  generateDocRoutes?: boolean;

  /**
   * Whether to generate HTML files for blog routes
   * @default true
   */
  generateBlogRoutes?: boolean;

  /**
   * Whether to generate HTML files for showcase routes
   * @default true
   */
  generateShowcaseRoutes?: boolean;

  /**
   * Whether to output generation info to console
   * @default true
   */
  verbose?: boolean;
}

/**
 * Helper function to write HTML content to a file and ensure directories exist
 */
function writeHtmlFile({
  outputPath,
  content,
  logMessage,
  verbose = true,
}: {
  outputPath: string;
  content: string;
  logMessage: string;
  verbose?: boolean;
}): void {
  // Ensure directory exists
  const dirPath = path.dirname(outputPath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Write HTML file
  fs.writeFileSync(outputPath, content);

  // Log output if verbose is enabled
  if (verbose) {
    console.log(`[html-generator] ${logMessage}`);
  }
}

/**
 * Rsbuild plugin to create multiple HTML file outputs for SPA
 * Solves the 404 problem when directly accessing non-root paths
 *
 * @see BrowserRouter is not compatible within a GitHub Pages deployment
 * @see https://github.com/orgs/community/discussions/36010
 */
export const pluginHtmlGenerator = (options: HtmlGeneratorOptions = {}): RsbuildPlugin => ({
  name: 'rsbuild:html-generator',

  setup(api) {
    // Execute after build completion
    api.onAfterBuild(() => {
      try {
        const outputDir = api.context.distPath;
        const isVerbose = options.verbose !== false;

        // Default static routes list
        const staticRoutes: string[] = [ETopRoute.BLOG, ETopRoute.SHOWCASE, ETopRoute.DOC];

        // Merge user-provided additional routes
        if (options.additionalRoutes?.length) {
          staticRoutes.push(...options.additionalRoutes);
        }

        // Get dynamic routes from availableDocs
        const docRoutes =
          options.generateDocRoutes !== false
            ? availableDocs.map(doc => `${ETopRoute.DOC}/${doc.id}`)
            : [];

        // Get blog permalinks
        const blogRoutes =
          options.generateBlogRoutes !== false ? blogPosts.map(post => getBlogPermalink(post)) : [];

        // Get showcase routes
        const showcaseRoutes =
          options.generateShowcaseRoutes !== false
            ? showcaseItems.map(item => `${ETopRoute.SHOWCASE}/${item.id}`)
            : [];

        // Read original index.html content
        const indexPath = path.join(outputDir, 'index.html');
        if (!fs.existsSync(indexPath)) {
          throw new Error('index.html not found in output directory');
        }

        const indexContent = fs.readFileSync(indexPath, 'utf-8');

        // Create corresponding HTML files for each route
        for (const route of staticRoutes) {
          // Remove leading slash
          const routePath = route.startsWith('/') ? route.substring(1) : route;
          const htmlPath = path.join(outputDir, `${routePath}.html`);
          writeHtmlFile({
            outputPath: htmlPath,
            content: indexContent,
            logMessage: `Generated HTML for route: ${route}`,
            verbose: isVerbose,
          });
        }

        // Handle doc routes - generate id.html files directly in output directory
        for (const route of docRoutes) {
          // Remove leading slash and create filename
          const routeId = route.startsWith('/') ? route.substring(1) : route;
          const htmlPath = path.join(outputDir, `${routeId}.html`);

          writeHtmlFile({
            outputPath: htmlPath,
            content: indexContent,
            logMessage: `Generated HTML for doc: ${route} as ${routeId}.html`,
            verbose: isVerbose,
          });
        }

        // Handle blog permalinks - generate id.html files directly in output directory (same as docs)
        for (const route of blogRoutes) {
          // Remove leading slash and create filename
          const routeId = route.startsWith('/') ? route.substring(1) : route;
          const htmlPath = path.join(outputDir, `${routeId}.html`);

          writeHtmlFile({
            outputPath: htmlPath,
            content: indexContent,
            logMessage: `Generated HTML for blog: ${route} as ${routeId}.html`,
            verbose: isVerbose,
          });
        }

        // Handle showcase routes
        for (const route of showcaseRoutes) {
          // Remove leading slash and create filename
          const routeId = route.startsWith('/') ? route.substring(1) : route;
          const htmlPath = path.join(outputDir, `${routeId}.html`);

          writeHtmlFile({
            outputPath: htmlPath,
            content: indexContent,
            logMessage: `Generated HTML for showcase: ${route} as ${routeId}.html`,
            verbose: isVerbose,
          });
        }

        if (isVerbose) {
          console.log(
            `[html-generator] Successfully generated ${
              staticRoutes.length + docRoutes.length + blogRoutes.length + showcaseRoutes.length
            } HTML files`,
          );
        }
      } catch (error) {
        console.error(`[html-generator] Error: ${error instanceof Error ? error.message : error}`);
      }
    });
  },
});

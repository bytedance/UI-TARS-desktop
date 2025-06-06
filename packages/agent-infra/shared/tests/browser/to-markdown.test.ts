import { describe, it, expect } from 'vitest';
import { toMarkdown } from '../../src/browser/to-markdown';

describe('toMarkdown', () => {
  it('should convert HTML to Markdown', () => {
    const html = '<h1>Hello, world!</h1>';
    const markdown = toMarkdown(html);
    expect(markdown).toBe('# Hello, world!');
  });

  it('should remove tags', () => {
    const html = `<html>
  <head>
    <script formula-runtime >function e(e){for(var r=1;r<arguments.length;r++){}}</script>
    <body>
      <div id="app"><!--[--><!--[--><!--[--><!--[--><!--[--><!----><!---->
        <div id="global" data-logged="0" class="layout limit" style="--40bdee49:1728px;" data-v-34b87540>
          <div class="header-container" data-v-34b87540 style="--67f219a2:1728px;" data-v-5c1b2170>
            <header class="mask-paper" data-v-5c1b2170>
              <a aria-current="page" href="/explore" class="active router-link-exact-active" id="link-guide" style="display:flex;" data-v-5c1b2170>
                <img crossorigin="anonymous" class="header-logo" style="pointer-events:none;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAM0AAABgCAYAAAC" data-v-5c1b2170>
              </a><!--[-->
              <div class="input-box" data-v-721de8bd>
                <p>Hello World</p>
                <input id="search-input" value="" type="text" spellcheck="false" class="search-input" placeholder="登录" autocomplete="off" data-v-721de8bd><!---->
                <div class="input-button" data-v-721de8bd><!---->
                  <div class="search-icon" data-v-721de8bd>
                    <svg class="reds-icon" width="20" height="20" data-v-721de8bd data-v-55b36ac6><use xlink:href="#search" data-v-55b36ac6></use></svg>
                  </div>
                </div>
              </div>
            </header>
            </div>
          </div>
        </div>
    </body>
</html>`;
    const markdown = toMarkdown(html);
    expect(markdown)
      .toEqual(`[![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAM0AAABgCAYAAAC)](/explore)

Hello World`);
  });
});

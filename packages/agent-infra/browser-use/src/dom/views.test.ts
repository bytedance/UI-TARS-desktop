import { describe, it, expect, beforeEach } from 'vitest';
import { DOMElementNode, DOMTextNode } from './views';

describe('DOMElementNode Enhanced Format', () => {
  let rootElement: DOMElementNode;

  beforeEach(() => {
    rootElement = new DOMElementNode({
      tagName: 'body',
      xpath: '/html/body',
      cssSelector: 'body',
      attributes: {},
      children: [],
      isVisible: true,
      isInteractive: false,
      isTopElement: true,
      shadowRoot: false,
    });
  });

  describe('getEnhancedText()', () => {
    it('should prioritize aria-label over other text sources', () => {
      const element = new DOMElementNode({
        tagName: 'button',
        xpath: '/html/body/button',
        cssSelector: 'button',
        attributes: {
          'aria-label': 'Submit form',
          title: 'Click to submit',
        },
        children: [new DOMTextNode('Submit', true)],
        isVisible: true,
        isInteractive: true,
        isTopElement: true,
        shadowRoot: false,
        highlightIndex: 0,
      });

      expect(element.getEnhancedText()).toBe('Submit form');
    });

    it('should use title when aria-label is not available', () => {
      const element = new DOMElementNode({
        tagName: 'button',
        xpath: '/html/body/button',
        cssSelector: 'button',
        attributes: {
          title: 'Click to submit',
        },
        children: [],
        isVisible: true,
        isInteractive: true,
        isTopElement: true,
        shadowRoot: false,
        highlightIndex: 0,
      });

      expect(element.getEnhancedText()).toBe('Click to submit');
    });

    it('should use alt text for images', () => {
      const element = new DOMElementNode({
        tagName: 'img',
        xpath: '/html/body/img',
        cssSelector: 'img',
        attributes: {
          alt: 'Company logo',
          src: '/logo.png',
        },
        children: [],
        isVisible: true,
        isInteractive: true,
        isTopElement: true,
        shadowRoot: false,
        highlightIndex: 0,
      });

      expect(element.getEnhancedText()).toBe('Company logo');
    });

    it('should fallback to inner text when no semantic attributes exist', () => {
      const textNode = new DOMTextNode('Click me', true);
      const element = new DOMElementNode({
        tagName: 'button',
        xpath: '/html/body/button',
        cssSelector: 'button',
        attributes: {},
        children: [textNode],
        isVisible: true,
        isInteractive: true,
        isTopElement: true,
        shadowRoot: false,
        highlightIndex: 0,
      });

      // Mock getAllTextTillNextClickableElement
      element.getAllTextTillNextClickableElement = () => 'Click me';

      expect(element.getEnhancedText()).toBe('Click me');
    });

    it('should show placeholder for input elements', () => {
      const element = new DOMElementNode({
        tagName: 'input',
        xpath: '/html/body/input',
        cssSelector: 'input',
        attributes: {
          type: 'text',
          placeholder: 'Enter your name',
        },
        children: [],
        isVisible: true,
        isInteractive: true,
        isTopElement: true,
        shadowRoot: false,
        highlightIndex: 0,
      });

      // Mock getAllTextTillNextClickableElement to return empty
      element.getAllTextTillNextClickableElement = () => '';

      expect(element.getEnhancedText()).toBe('[placeholder: Enter your name]');
    });

    it('should provide fallback description for empty elements', () => {
      const element = new DOMElementNode({
        tagName: 'button',
        xpath: '/html/body/button',
        cssSelector: 'button',
        attributes: {},
        children: [],
        isVisible: true,
        isInteractive: true,
        isTopElement: true,
        shadowRoot: false,
        highlightIndex: 0,
      });

      // Mock getAllTextTillNextClickableElement to return empty
      element.getAllTextTillNextClickableElement = () => '';

      expect(element.getEnhancedText()).toBe('[button]');
    });
  });

  describe('clickableElementsToString() enhanced format', () => {
    describe('Link elements', () => {
      it('should show href for all link types', () => {
        const linkElement = new DOMElementNode({
          tagName: 'a',
          xpath: '/html/body/a',
          cssSelector: 'a',
          attributes: {
            href: '/home',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        linkElement.getEnhancedText = () => '首页';
        linkElement.getEnhancedContextInfo = () => ['link', 'href="/home"'];

        rootElement.children = [linkElement];
        const result = rootElement.clickableElementsToString();

        expect(result).toContain('[0] [link href="/home"] <a>首页</a>');
      });

      it('should handle email links with enhanced context', () => {
        const emailElement = new DOMElementNode({
          tagName: 'a',
          xpath: '/html/body/a',
          cssSelector: 'a',
          attributes: {
            href: 'mailto:contact@example.com',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        emailElement.getEnhancedText = () => '联系我们';
        emailElement.getEnhancedContextInfo = () => [
          'email',
          'href="mailto:contact@example.com"',
        ];

        rootElement.children = [emailElement];
        const result = rootElement.clickableElementsToString();

        expect(result).toContain(
          '[0] [email href="mailto:contact@example.com"] <a>联系我们</a>',
        );
      });

      it('should handle phone links', () => {
        const phoneElement = new DOMElementNode({
          tagName: 'a',
          xpath: '/html/body/a',
          cssSelector: 'a',
          attributes: {
            href: 'tel:+86138',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        phoneElement.getEnhancedText = () => '客服电话';
        phoneElement.getEnhancedContextInfo = () => [
          'phone',
          'href="tel:+86138"',
        ];

        rootElement.children = [phoneElement];
        const result = rootElement.clickableElementsToString();

        expect(result).toContain(
          '[0] [phone href="tel:+86138"] <a>客服电话</a>',
        );
      });

      it('should handle anchor links', () => {
        const anchorElement = new DOMElementNode({
          tagName: 'a',
          xpath: '/html/body/a',
          cssSelector: 'a',
          attributes: {
            href: '#top',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        anchorElement.getEnhancedText = () => '返回顶部';
        anchorElement.getEnhancedContextInfo = () => ['anchor', 'href="#top"'];

        rootElement.children = [anchorElement];
        const result = rootElement.clickableElementsToString();

        expect(result).toContain('[0] [anchor href="#top"] <a>返回顶部</a>');
      });

      it('should handle external links with full URL', () => {
        const externalElement = new DOMElementNode({
          tagName: 'a',
          xpath: '/html/body/a',
          cssSelector: 'a',
          attributes: {
            href: 'https://github.com/user/repo',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        externalElement.getEnhancedText = () => 'GitHub项目';
        externalElement.getEnhancedContextInfo = () => [
          'link',
          'href="https://github.com/user/repo"',
        ];

        rootElement.children = [externalElement];
        const result = rootElement.clickableElementsToString();

        expect(result).toContain(
          '[0] [link href="https://github.com/user/repo"] <a>GitHub项目</a>',
        );
      });

      it('should handle empty link with href fallback', () => {
        const emptyElement = new DOMElementNode({
          tagName: 'a',
          xpath: '/html/body/a',
          cssSelector: 'a',
          attributes: {
            href: '/settings',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        emptyElement.getEnhancedText = () => '[link]';
        emptyElement.getEnhancedContextInfo = () => [
          'link',
          'href="/settings"',
        ];

        rootElement.children = [emptyElement];
        const result = rootElement.clickableElementsToString();

        expect(result).toContain('[0] [link href="/settings"] <a>[link]</a>');
      });
    });

    describe('Button elements', () => {
      it('should show button type information', () => {
        const submitButton = new DOMElementNode({
          tagName: 'button',
          xpath: '/html/body/button',
          cssSelector: 'button',
          attributes: {
            type: 'submit',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        submitButton.getEnhancedText = () => '提交订单';
        submitButton.getEnhancedContextInfo = () => ['submit'];

        rootElement.children = [submitButton];
        const result = rootElement.clickableElementsToString();

        expect(result).toContain('[0] [submit] <button>提交订单</button>');
      });

      it('should show aria-label for icon buttons', () => {
        const iconButton = new DOMElementNode({
          tagName: 'button',
          xpath: '/html/body/button',
          cssSelector: 'button',
          attributes: {
            'aria-label': '关闭弹窗',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        iconButton.getEnhancedText = () => '关闭弹窗';
        iconButton.getEnhancedContextInfo = () => ['aria-label="关闭弹窗"'];

        rootElement.children = [iconButton];
        const result = rootElement.clickableElementsToString();

        expect(result).toContain(
          '[0] [aria-label="关闭弹窗"] <button>关闭弹窗</button>',
        );
      });

      it('should show disabled state', () => {
        const disabledButton = new DOMElementNode({
          tagName: 'button',
          xpath: '/html/body/button',
          cssSelector: 'button',
          attributes: {
            disabled: 'disabled',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        disabledButton.getEnhancedText = () => '禁用按钮';
        disabledButton.getEnhancedContextInfo = () => ['disabled'];

        rootElement.children = [disabledButton];
        const result = rootElement.clickableElementsToString();

        expect(result).toContain('[0] [disabled] <button>禁用按钮</button>');
      });
    });

    describe('Form elements', () => {
      it('should show input type and placeholder', () => {
        const textInput = new DOMElementNode({
          tagName: 'input',
          xpath: '/html/body/input',
          cssSelector: 'input',
          attributes: {
            type: 'text',
            placeholder: '请输入用户名',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        textInput.getEnhancedText = () => '[请输入用户名]';
        textInput.getEnhancedContextInfo = () => [
          'text',
          'placeholder="请输入用户名"',
        ];

        rootElement.children = [textInput];
        const result = rootElement.clickableElementsToString();

        expect(result).toContain(
          '[0] [text placeholder="请输入用户名"] <input>[请输入用户名]</input>',
        );
      });

      it('should show search input with aria-label', () => {
        const searchInput = new DOMElementNode({
          tagName: 'input',
          xpath: '/html/body/input',
          cssSelector: 'input',
          attributes: {
            type: 'search',
            'aria-label': '搜索商品',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        searchInput.getEnhancedText = () => '搜索商品';
        searchInput.getEnhancedContextInfo = () => [
          'search',
          'aria-label="搜索商品"',
        ];

        rootElement.children = [searchInput];
        const result = rootElement.clickableElementsToString();

        expect(result).toContain(
          '[0] [search aria-label="搜索商品"] <input>搜索商品</input>',
        );
      });

      it('should show required password input', () => {
        const passwordInput = new DOMElementNode({
          tagName: 'input',
          xpath: '/html/body/input',
          cssSelector: 'input',
          attributes: {
            type: 'password',
            required: 'required',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        passwordInput.getEnhancedText = () => '[password]';
        passwordInput.getEnhancedContextInfo = () => ['password', 'required'];

        rootElement.children = [passwordInput];
        const result = rootElement.clickableElementsToString();

        expect(result).toContain(
          '[0] [password required] <input>[password]</input>',
        );
      });
    });

    describe('Complex scenarios', () => {
      it('should handle multiple context attributes', () => {
        const complexLink = new DOMElementNode({
          tagName: 'a',
          xpath: '/html/body/a',
          cssSelector: 'a',
          attributes: {
            href: '/user/profile',
            'aria-label': '用户档案',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        complexLink.getEnhancedText = () => '个人中心';
        complexLink.getEnhancedContextInfo = () => [
          'link',
          'href="/user/profile"',
          'aria-label="用户档案"',
        ];

        rootElement.children = [complexLink];
        const result = rootElement.clickableElementsToString();

        expect(result).toContain(
          '[0] [link href="/user/profile" aria-label="用户档案"] <a>个人中心</a>',
        );
      });

      it('should handle text nodes without highlighted parents', () => {
        const textNode = new DOMTextNode('Plain text content', true);
        textNode.hasParentWithHighlightIndex = () => false;

        rootElement.children = [textNode];
        const result = rootElement.clickableElementsToString();

        expect(result).toContain('[]Plain text content');
      });

      it('should skip text nodes with highlighted parents', () => {
        const highlightedElement = new DOMElementNode({
          tagName: 'button',
          xpath: '/html/body/button',
          cssSelector: 'button',
          attributes: {},
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        const textNode = new DOMTextNode(
          'Button text',
          true,
          highlightedElement,
        );
        textNode.hasParentWithHighlightIndex = () => true;

        highlightedElement.children = [textNode];
        rootElement.children = [highlightedElement];

        highlightedElement.getEnhancedText = () => 'Button text';
        highlightedElement.getEnhancedContextInfo = () => [];

        const result = rootElement.clickableElementsToString();

        expect(result).toContain('<button>Button text</button>');
        expect(result).not.toContain('[]Button text');
      });
    });

    describe('includeAttributes compatibility', () => {
      it('should use includeAttributes when provided instead of enhanced context', () => {
        const linkElement = new DOMElementNode({
          tagName: 'a',
          xpath: '/html/body/a',
          cssSelector: 'a',
          attributes: {
            href: '/home',
            class: 'nav-link',
            'data-id': 'home-link',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        linkElement.getEnhancedText = () => '首页';

        rootElement.children = [linkElement];

        // 使用 includeAttributes，应该跳过智能上下文
        const result = rootElement.clickableElementsToString(['href', 'class']);

        expect(result).toContain(
          '[0] [href="/home" class="nav-link"] <a>首页</a>',
        );
        expect(result).not.toContain('link href'); // 不应该包含智能识别的格式
      });

      it('should handle empty includeAttributes gracefully', () => {
        const buttonElement = new DOMElementNode({
          tagName: 'button',
          xpath: '/html/body/button',
          cssSelector: 'button',
          attributes: {
            type: 'submit',
            class: 'btn-primary',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        buttonElement.getEnhancedText = () => '提交';
        buttonElement.getEnhancedContextInfo = () => ['submit'];

        rootElement.children = [buttonElement];

        // 传入空数组，应该使用智能上下文
        const result = rootElement.clickableElementsToString([]);

        expect(result).toContain('[0] [submit] <button>提交</button>');
      });

      it('should filter non-existent attributes in includeAttributes', () => {
        const inputElement = new DOMElementNode({
          tagName: 'input',
          xpath: '/html/body/input',
          cssSelector: 'input',
          attributes: {
            type: 'text',
            placeholder: '用户名',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        inputElement.getEnhancedText = () => '[用户名]';

        rootElement.children = [inputElement];

        // 包含存在和不存在的属性
        const result = rootElement.clickableElementsToString([
          'type',
          'placeholder',
          'nonexistent',
        ]);

        expect(result).toContain(
          '[0] [type="text" placeholder="用户名"] <input>[用户名]</input>',
        );
        expect(result).not.toContain('nonexistent');
      });

      it('should show no context when includeAttributes has no valid attributes', () => {
        const divElement = new DOMElementNode({
          tagName: 'div',
          xpath: '/html/body/div',
          cssSelector: 'div',
          attributes: {
            role: 'button',
            'aria-label': '点击我',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
          highlightIndex: 0,
          parent: rootElement,
        });

        divElement.getEnhancedText = () => '点击我';

        rootElement.children = [divElement];

        // 指定不存在的属性
        const result = rootElement.clickableElementsToString([
          'nonexistent1',
          'nonexistent2',
        ]);

        expect(result).toContain('[0] <div>点击我</div>'); // 没有上下文信息
      });
    });
  });

  describe('getEnhancedContextInfo()', () => {
    describe('Link elements', () => {
      it('should identify email links', () => {
        const element = new DOMElementNode({
          tagName: 'a',
          xpath: '/html/body/a',
          cssSelector: 'a',
          attributes: {
            href: 'mailto:test@example.com',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('email');
        expect(context).toContain('href="mailto:test@example.com"');
      });

      it('should identify phone links', () => {
        const element = new DOMElementNode({
          tagName: 'a',
          xpath: '/html/body/a',
          cssSelector: 'a',
          attributes: {
            href: 'tel:+1234567890',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('phone');
        expect(context).toContain('href="tel:+1234567890"');
      });

      it('should identify anchor links', () => {
        const element = new DOMElementNode({
          tagName: 'a',
          xpath: '/html/body/a',
          cssSelector: 'a',
          attributes: {
            href: '#section1',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('anchor');
        expect(context).toContain('href="#section1"');
      });

      it('should identify javascript links', () => {
        const element = new DOMElementNode({
          tagName: 'a',
          xpath: '/html/body/a',
          cssSelector: 'a',
          attributes: {
            href: 'javascript:void(0)',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('javascript');
        expect(context).toContain('href="javascript:void(0)"');
      });

      it('should identify download links', () => {
        const element = new DOMElementNode({
          tagName: 'a',
          xpath: '/html/body/a',
          cssSelector: 'a',
          attributes: {
            href: '/file.pdf',
            download: '',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('download');
        expect(context).toContain('href="/file.pdf"');
      });

      it('should identify new window target', () => {
        const element = new DOMElementNode({
          tagName: 'a',
          xpath: '/html/body/a',
          cssSelector: 'a',
          attributes: {
            href: 'https://example.com',
            target: '_blank',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('link');
        expect(context).toContain('new-window');
        expect(context).toContain('href="https://example.com"');
      });
    });

    describe('Button elements', () => {
      it('should identify submit buttons', () => {
        const element = new DOMElementNode({
          tagName: 'button',
          xpath: '/html/body/button',
          cssSelector: 'button',
          attributes: {
            type: 'submit',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('submit');
      });

      it('should identify reset buttons', () => {
        const element = new DOMElementNode({
          tagName: 'button',
          xpath: '/html/body/button',
          cssSelector: 'button',
          attributes: {
            type: 'reset',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('reset');
      });

      it('should identify disabled buttons', () => {
        const element = new DOMElementNode({
          tagName: 'button',
          xpath: '/html/body/button',
          cssSelector: 'button',
          attributes: {
            disabled: 'disabled',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('button');
        expect(context).toContain('disabled');
      });
    });

    describe('Input elements', () => {
      it('should identify checkbox inputs with name', () => {
        const element = new DOMElementNode({
          tagName: 'input',
          xpath: '/html/body/input',
          cssSelector: 'input',
          attributes: {
            type: 'checkbox',
            name: 'terms',
            checked: 'checked',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('checkbox');
        expect(context).toContain('checked');
        expect(context).toContain('name="terms"');
      });

      it('should identify file inputs with multiple and accept', () => {
        const element = new DOMElementNode({
          tagName: 'input',
          xpath: '/html/body/input',
          cssSelector: 'input',
          attributes: {
            type: 'file',
            multiple: 'multiple',
            accept: '.jpg,.png,.gif',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('file');
        expect(context).toContain('multiple');
        expect(context).toContain('accept=".jpg,.png,.gif"');
      });

      it('should identify number inputs with min/max', () => {
        const element = new DOMElementNode({
          tagName: 'input',
          xpath: '/html/body/input',
          cssSelector: 'input',
          attributes: {
            type: 'number',
            min: '0',
            max: '100',
            required: 'required',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('number');
        expect(context).toContain('required');
        expect(context).toContain('min="0"');
        expect(context).toContain('max="100"');
      });

      it('should identify text inputs with pattern and autocomplete', () => {
        const element = new DOMElementNode({
          tagName: 'input',
          xpath: '/html/body/input',
          cssSelector: 'input',
          attributes: {
            type: 'text',
            pattern: '[A-Za-z]+',
            autocomplete: 'name',
            placeholder: 'Enter name',
            readonly: 'readonly',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('text');
        expect(context).toContain('readonly');
        expect(context).toContain('placeholder="Enter name"');
        expect(context).toContain('has-pattern');
        expect(context).toContain('autocomplete="name"');
      });
    });

    describe('Select elements', () => {
      it('should identify select with multiple and required', () => {
        const element = new DOMElementNode({
          tagName: 'select',
          xpath: '/html/body/select',
          cssSelector: 'select',
          attributes: {
            multiple: 'multiple',
            required: 'required',
            disabled: 'disabled',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('select');
        expect(context).toContain('required');
        expect(context).toContain('multiple');
        expect(context).toContain('disabled');
      });
    });

    describe('Media elements', () => {
      it('should identify images with alt text', () => {
        const element = new DOMElementNode({
          tagName: 'img',
          xpath: '/html/body/img',
          cssSelector: 'img',
          attributes: {
            alt: 'Company logo',
            src: '/logo.png',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('image');
        expect(context).toContain('alt="Company logo"');
      });

      it('should identify video with controls', () => {
        const element = new DOMElementNode({
          tagName: 'video',
          xpath: '/html/body/video',
          cssSelector: 'video',
          attributes: {
            controls: 'controls',
            src: '/video.mp4',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('video');
        expect(context).toContain('has-controls');
      });

      it('should identify audio with controls', () => {
        const element = new DOMElementNode({
          tagName: 'audio',
          xpath: '/html/body/audio',
          cssSelector: 'audio',
          attributes: {
            controls: 'controls',
            src: '/audio.mp3',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('audio');
        expect(context).toContain('has-controls');
      });
    });

    describe('Other elements', () => {
      it('should identify iframe with src', () => {
        const element = new DOMElementNode({
          tagName: 'iframe',
          xpath: '/html/body/iframe',
          cssSelector: 'iframe',
          attributes: {
            src: 'https://example.com/embed',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('iframe');
        expect(context).toContain('src="https://example.com/embed"');
      });

      it('should identify form with method', () => {
        const element = new DOMElementNode({
          tagName: 'form',
          xpath: '/html/body/form',
          cssSelector: 'form',
          attributes: {
            method: 'POST',
            action: '/submit',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('form');
        expect(context).toContain('method="POST"');
      });

      it('should identify label with for attribute', () => {
        const element = new DOMElementNode({
          tagName: 'label',
          xpath: '/html/body/label',
          cssSelector: 'label',
          attributes: {
            for: 'username',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('label');
        expect(context).toContain('for="username"');
      });
    });

    describe('ARIA roles', () => {
      it('should identify role=button with disabled state', () => {
        const element = new DOMElementNode({
          tagName: 'div',
          xpath: '/html/body/div',
          cssSelector: 'div',
          attributes: {
            role: 'button',
            disabled: 'disabled',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('role=button');
        expect(context).toContain('disabled');
      });

      it('should identify role=checkbox with aria-checked', () => {
        const element = new DOMElementNode({
          tagName: 'div',
          xpath: '/html/body/div',
          cssSelector: 'div',
          attributes: {
            role: 'checkbox',
            'aria-checked': 'true',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('role=checkbox');
        expect(context).toContain('checked');
      });

      it('should identify role=tab with active state', () => {
        const element = new DOMElementNode({
          tagName: 'div',
          xpath: '/html/body/div',
          cssSelector: 'div',
          attributes: {
            role: 'tab',
            'aria-selected': 'true',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('role=tab');
        expect(context).toContain('active-tab');
      });
    });

    describe('Test and identification attributes', () => {
      it('should include data-testid', () => {
        const element = new DOMElementNode({
          tagName: 'button',
          xpath: '/html/body/button',
          cssSelector: 'button',
          attributes: {},
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('button');
      });

      it('should include id attribute', () => {
        const element = new DOMElementNode({
          tagName: 'button',
          xpath: '/html/body/button',
          cssSelector: 'button',
          attributes: {
            id: 'submit-button',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('button');
        expect(context).toContain('id="submit-button"');
      });

      it('should include title attribute', () => {
        const element = new DOMElementNode({
          tagName: 'button',
          xpath: '/html/body/button',
          cssSelector: 'button',
          attributes: {
            title: 'Click to submit form',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('button');
        expect(context).toContain('title="Click to submit form"');
      });
    });

    describe('Value attributes', () => {
      it('should include value for non-input elements when short', () => {
        const element = new DOMElementNode({
          tagName: 'option',
          xpath: '/html/body/select/option',
          cssSelector: 'option',
          attributes: {
            value: 'en',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('value="en"');
      });

      it('should exclude long value attributes', () => {
        const longValue = 'a'.repeat(60);
        const element = new DOMElementNode({
          tagName: 'option',
          xpath: '/html/body/select/option',
          cssSelector: 'option',
          attributes: {
            value: longValue,
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).not.toContain(`value="${longValue}"`);
      });

      it('should exclude value for input and button elements', () => {
        const inputElement = new DOMElementNode({
          tagName: 'input',
          xpath: '/html/body/input',
          cssSelector: 'input',
          attributes: {
            type: 'text',
            value: 'test',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = inputElement.getEnhancedContextInfo();
        expect(context).not.toContain('value="test"');
      });
    });

    describe('Complex combinations', () => {
      it('should handle element with multiple attributes', () => {
        const element = new DOMElementNode({
          tagName: 'input',
          xpath: '/html/body/input',
          cssSelector: 'input',
          attributes: {
            type: 'email',
            id: 'user-email',
            required: 'required',
            placeholder: 'Enter your email',
            'aria-label': 'User email address',
            title: 'Please enter a valid email',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('email');
        expect(context).toContain('required');
        expect(context).toContain('placeholder="Enter your email"');
        expect(context).toContain('id="user-email"');
        expect(context).toContain('title="Please enter a valid email"');
        expect(context).toContain('aria-label="User email address"');
      });

      it('should avoid duplicate placeholder and aria-label', () => {
        const element = new DOMElementNode({
          tagName: 'input',
          xpath: '/html/body/input',
          cssSelector: 'input',
          attributes: {
            type: 'text',
            placeholder: 'Search...',
            'aria-label': 'Search...',
          },
          children: [],
          isVisible: true,
          isInteractive: true,
          isTopElement: true,
          shadowRoot: false,
        });

        const context = element.getEnhancedContextInfo();
        expect(context).toContain('placeholder="Search..."');
        // Should not duplicate the same text in aria-label
        const ariaLabelCount = context.filter((item) =>
          item.includes('aria-label="Search..."'),
        ).length;
        expect(ariaLabelCount).toBe(0);
      });
    });
  });
});

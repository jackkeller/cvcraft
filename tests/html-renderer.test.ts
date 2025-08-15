import { describe, it, expect, beforeEach } from 'vitest';
import { HTMLRenderer } from '../src/html-renderer';
import { ThemeManager } from '../src/themes';

describe('HTMLRenderer', () => {
  let renderer: HTMLRenderer;
  let themeManager: ThemeManager;

  beforeEach(async () => {
    renderer = new HTMLRenderer();
    await renderer.initialize(); // Initialize the renderer's theme system
    themeManager = new ThemeManager();
    await themeManager.initialize(); // Initialize the test theme manager
  });

  describe('render', () => {
    it('should render basic HTML with theme', async () => {
      const parsedContent = {
        html: '<h1>John Doe</h1><p>Software Engineer</p>',
        metadata: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '(555) 123-4567',
        },
        sections: [],
      };

      const html = await renderer.render(parsedContent, 'modern');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>John Doe</title>');
      expect(html).toContain('<h1>John Doe</h1>');
      expect(html).toContain('john@example.com');
      expect(html).toContain('(555) 123-4567');
    });

    it('should handle metadata without name', async () => {
      const parsedContent = {
        html: '<h1>Resume</h1>',
        metadata: {
          email: 'test@example.com',
        },
        sections: [],
      };

      const html = await renderer.render(parsedContent, 'classic');

      expect(html).toContain('<title>Resume Preview</title>');
      expect(html).toContain('<h1>Resume</h1>');
      // Note: email won't appear because renderHeader returns empty string when no name/title
      expect(html).not.toContain('test@example.com');
    });

    it('should render contact information with proper links', async () => {
      const parsedContent = {
        html: '<h1>Test</h1>',
        metadata: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '555-1234',
          website: 'example.com',
          location: 'New York, NY',
        },
        sections: [],
      };

      const html = await renderer.render(parsedContent, 'minimal');

      expect(html).toContain('href="mailto:test@example.com"');
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('New York, NY');
      expect(html).toContain('555-1234'); // Phone should be plain text
    });

    it('should handle website URLs with existing protocol', async () => {
      const parsedContent = {
        html: '<h1>Test</h1>',
        metadata: {
          name: 'Test User',
          website: 'https://example.com',
        },
        sections: [],
      };

      const html = await renderer.render(parsedContent, 'modern');

      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('>example.com<'); // Display text should be clean
    });

    it('should apply theme styles correctly', async () => {
      const parsedContent = {
        html: '<h1>Test</h1>',
        metadata: { name: 'Test' },
        sections: [],
      };

      const html = await renderer.render(parsedContent, 'modern');
      const theme = themeManager.getTheme('modern');

      expect(html).toContain(theme.colors.primary);
      expect(html).toContain(theme.fonts.body);
      expect(html).toContain('font-family:');
      expect(html).toContain('color:');
    });

    it('should handle empty content gracefully', async () => {
      const parsedContent = {
        html: '',
        metadata: {},
        sections: [],
      };

      const html = await renderer.render(parsedContent, 'classic');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Resume Preview</title>');
    });
  });
});

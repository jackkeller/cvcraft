import { describe, it, expect, beforeEach } from 'vitest';
import { CSSThemeManager } from '../src/css-theme-manager';

describe('Themes Integration', () => {
  let themeManager: CSSThemeManager;

  beforeEach(async () => {
    themeManager = new CSSThemeManager('themes');
    await themeManager.initialize();
  });

  describe('getAvailableThemes', () => {
    it('should return all available theme info objects', () => {
      const themes = themeManager.getAvailableThemes();

      expect(themes.length).toBeGreaterThanOrEqual(3);

      // Check that we have the expected themes
      const themeNames = themes.map(t => t.name);
      expect(themeNames).toContain('modern');
      expect(themeNames).toContain('classic');
      expect(themeNames).toContain('minimal');

      // Check that each theme has the correct structure
      themes.forEach(theme => {
        expect(theme).toHaveProperty('name');
        expect(theme).toHaveProperty('displayName');
        expect(theme).toHaveProperty('cssPath');
        expect(theme).toHaveProperty('customizable');
        expect(typeof theme.name).toBe('string');
        expect(typeof theme.displayName).toBe('string');
        expect(typeof theme.cssPath).toBe('string');
        expect(typeof theme.customizable).toBe('boolean');
      });
    });
  });

  describe('getThemeInfo', () => {
    it('should return modern theme info', () => {
      const themeInfo = themeManager.getThemeInfo('modern');

      expect(themeInfo).toBeDefined();
      expect(themeInfo?.name).toBe('modern');
      expect(themeInfo?.displayName).toBe('Modern');
      expect(themeInfo?.customizable).toBeDefined();
      expect(themeInfo?.cssPath).toBeDefined();
    });

    it('should return classic theme info', () => {
      const themeInfo = themeManager.getThemeInfo('classic');

      expect(themeInfo).toBeDefined();
      expect(themeInfo?.name).toBe('classic');
      expect(themeInfo?.displayName).toBe('Classic');
      expect(themeInfo?.customizable).toBeDefined();
      expect(themeInfo?.cssPath).toBeDefined();
    });

    it('should return minimal theme info', () => {
      const themeInfo = themeManager.getThemeInfo('minimal');

      expect(themeInfo).toBeDefined();
      expect(themeInfo?.name).toBe('minimal');
      expect(themeInfo?.displayName).toBe('Minimal');
      expect(themeInfo?.customizable).toBeDefined();
      expect(themeInfo?.cssPath).toBeDefined();
    });

    it('should return undefined for invalid theme name', () => {
      const themeInfo = themeManager.getThemeInfo('nonexistent');
      expect(themeInfo).toBeUndefined();
    });
  });

  describe('getThemeCSS', () => {
    it('should return CSS content for all themes', async () => {
      const themes = themeManager.getAvailableThemes();

      for (const theme of themes) {
        const css = await themeManager.getThemeCSS(theme.name);
        expect(css).toBeDefined();
        expect(typeof css).toBe('string');
        expect(css.length).toBeGreaterThan(0);
      }
    });

    it('should throw error for non-existent theme', async () => {
      await expect(themeManager.getThemeCSS('nonexistent')).rejects.toThrow();
    });
  });
});

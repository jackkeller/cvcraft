import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CSSThemeManager, ThemeCustomization } from '../src/css-theme-manager';
import fs from 'fs-extra';
import path from 'path';
import { tmpdir } from 'os';

describe('CSSThemeManager', () => {
  let themeManager: CSSThemeManager;
  let testThemesDir: string;

  beforeEach(async () => {
    // Create a temporary themes directory for testing
    testThemesDir = path.join(tmpdir(), `cvcraft-test-themes-${Date.now()}`);
    await fs.ensureDir(testThemesDir);

    // Create test theme files
    await createTestThemeFiles();

    themeManager = new CSSThemeManager(testThemesDir);
    await themeManager.initialize();
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testThemesDir);
  });

  async function createTestThemeFiles() {
    // Create a customizable theme with CSS variables
    const customizableTheme = `
:root {
  --theme-primary: #3b82f6;
  --theme-primary-dark: #2563eb;
  --theme-primary-light: #60a5fa;
  --theme-secondary: #64748b;
  --theme-accent: #f59e0b;
}

.resume-container {
  font-family: 'Inter', sans-serif;
  color: var(--theme-primary);
}

.header h1 {
  color: var(--theme-primary-dark);
}
`;

    // Create a non-customizable theme without CSS variables
    const staticTheme = `
.resume-container {
  font-family: 'Times New Roman', serif;
  color: #000000;
}

.header h1 {
  color: #333333;
}
`;

    await fs.writeFile(
      path.join(testThemesDir, 'theme-test-customizable.css'),
      customizableTheme
    );
    await fs.writeFile(
      path.join(testThemesDir, 'theme-test-static.css'),
      staticTheme
    );
    await fs.writeFile(
      path.join(testThemesDir, 'not-a-theme.css'),
      'body { color: red; }'
    );
    await fs.writeFile(
      path.join(testThemesDir, 'theme-invalid'),
      'invalid file'
    );
  }

  describe('initialization and theme discovery', () => {
    it('should initialize successfully', async () => {
      expect(themeManager).toBeDefined();
    });

    it('should discover theme files correctly', () => {
      const themes = themeManager.getAvailableThemes();

      expect(themes).toHaveLength(2);
      expect(themes.map(t => t.name)).toContain('test-customizable');
      expect(themes.map(t => t.name)).toContain('test-static');
    });

    it('should ignore non-theme files', () => {
      const themes = themeManager.getAvailableThemes();
      const themeNames = themes.map(t => t.name);

      expect(themeNames).not.toContain('not-a-theme');
      expect(themeNames).not.toContain('invalid');
    });

    it('should format display names correctly', () => {
      const themes = themeManager.getAvailableThemes();
      const customizableTheme = themes.find(
        t => t.name === 'test-customizable'
      );
      const staticTheme = themes.find(t => t.name === 'test-static');

      expect(customizableTheme?.displayName).toBe('Test Customizable');
      expect(staticTheme?.displayName).toBe('Test Static');
    });
  });

  describe('theme information', () => {
    it('should return correct theme info structure', () => {
      const themes = themeManager.getAvailableThemes();

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

    it('should detect customizable themes correctly', () => {
      const customizableTheme = themeManager.getThemeInfo('test-customizable');
      const staticTheme = themeManager.getThemeInfo('test-static');

      expect(customizableTheme?.customizable).toBe(true);
      expect(customizableTheme?.primaryColor).toBe('#3b82f6');
      expect(staticTheme?.customizable).toBe(false);
      expect(staticTheme?.primaryColor).toBeUndefined();
    });

    it('should return undefined for non-existent themes', () => {
      const nonExistentTheme = themeManager.getThemeInfo('non-existent');
      expect(nonExistentTheme).toBeUndefined();
    });
  });

  describe('CSS content retrieval', () => {
    it('should return CSS content for existing themes', async () => {
      const css = await themeManager.getThemeCSS('test-customizable');

      expect(css).toContain('--theme-primary: #3b82f6');
      expect(css).toContain('.resume-container');
      expect(css).toContain("font-family: 'Inter'");
    });

    it('should throw error for non-existent themes', async () => {
      await expect(themeManager.getThemeCSS('non-existent')).rejects.toThrow(
        "Theme 'non-existent' not found"
      );
    });

    it('should apply customizations to CSS content', async () => {
      const customization: ThemeCustomization = {
        primaryColor: '#ff0000',
      };

      const css = await themeManager.getThemeCSS(
        'test-customizable',
        customization
      );

      expect(css).toContain('--theme-primary: #ff0000');
      expect(css).toContain('--theme-primary-dark:'); // Should have generated dark variant
      expect(css).toContain('--theme-primary-light:'); // Should have generated light variant
    });

    it('should not modify non-customizable themes', async () => {
      const customization: ThemeCustomization = {
        primaryColor: '#ff0000',
      };

      const originalCSS = await themeManager.getThemeCSS('test-static');
      const customizedCSS = await themeManager.getThemeCSS(
        'test-static',
        customization
      );

      expect(customizedCSS).toBe(originalCSS);
    });
  });

  describe('color manipulation', () => {
    it('should darken colors correctly', () => {
      // Access private method for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = themeManager as any;

      const darkened = manager.darkenColor('#3b82f6', 20);
      expect(darkened).toMatch(/^#[0-9a-f]{6}$/i);
      expect(darkened).not.toBe('#3b82f6');
    });

    it('should lighten colors correctly', () => {
      // Access private method for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = themeManager as any;

      const lightened = manager.lightenColor('#3b82f6', 20);
      expect(lightened).toMatch(/^#[0-9a-f]{6}$/i);
      expect(lightened).not.toBe('#3b82f6');
    });

    it('should handle edge cases for color manipulation', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = themeManager as any;

      // Test with black
      const darkenedBlack = manager.darkenColor('#000000', 20);
      expect(darkenedBlack).toBe('#000000');

      // Test with white
      const lightenedWhite = manager.lightenColor('#ffffff', 20);
      expect(lightenedWhite).toBe('#ffffff');
    });
  });

  describe('theme refresh', () => {
    it('should refresh themes and discover new ones', async () => {
      const initialThemes = themeManager.getAvailableThemes();
      expect(initialThemes).toHaveLength(2);

      // Add a new theme file
      const newTheme = `
:root {
  --theme-primary: #10b981;
}
.resume-container { color: var(--theme-primary); }
`;
      await fs.writeFile(
        path.join(testThemesDir, 'theme-new-theme.css'),
        newTheme
      );

      // Refresh themes
      await themeManager.refreshThemes();

      const refreshedThemes = themeManager.getAvailableThemes();
      expect(refreshedThemes).toHaveLength(3);
      expect(refreshedThemes.map(t => t.name)).toContain('new-theme');
    });

    it('should remove deleted themes after refresh', async () => {
      const initialThemes = themeManager.getAvailableThemes();
      expect(initialThemes).toHaveLength(2);

      // Remove a theme file
      await fs.remove(path.join(testThemesDir, 'theme-test-static.css'));

      // Refresh themes
      await themeManager.refreshThemes();

      const refreshedThemes = themeManager.getAvailableThemes();
      expect(refreshedThemes).toHaveLength(1);
      expect(refreshedThemes.map(t => t.name)).not.toContain('test-static');
    });
  });

  describe('error handling', () => {
    it('should handle missing themes directory gracefully', async () => {
      const nonExistentDir = path.join(tmpdir(), 'non-existent-themes');
      const manager = new CSSThemeManager(nonExistentDir);

      // Should not throw when directory doesn't exist
      await manager.initialize();
      expect(manager.getAvailableThemes()).toHaveLength(0);
    });

    it('should handle corrupted CSS files gracefully', async () => {
      // Create a corrupted CSS file
      await fs.writeFile(
        path.join(testThemesDir, 'theme-corrupted.css'),
        'invalid css content @#$%'
      );

      const manager = new CSSThemeManager(testThemesDir);
      // Should not throw even with corrupted CSS files
      await manager.initialize();

      // Should still discover other valid themes
      const themes = manager.getAvailableThemes();
      expect(themes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('integration with real theme files', () => {
    it('should work with actual theme files if they exist', async () => {
      const realThemesDir = path.resolve('themes');

      if (await fs.pathExists(realThemesDir)) {
        const realManager = new CSSThemeManager(realThemesDir);
        await realManager.initialize();

        const themes = realManager.getAvailableThemes();
        expect(themes.length).toBeGreaterThan(0);

        // Test that we can get CSS for each theme
        for (const theme of themes) {
          const css = await realManager.getThemeCSS(theme.name);
          expect(css).toBeTruthy();
          expect(typeof css).toBe('string');
        }
      }
    });
  });
});

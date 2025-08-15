/**
 * Theme management for PDF styling
 */

import { Theme } from './types';
import { CSSThemeManager } from './css-theme-manager';

export class ThemeManager {
  private themes: Map<string, Theme> = new Map();
  private cssThemeManager: CSSThemeManager;

  constructor(cssThemeManager?: CSSThemeManager) {
    this.cssThemeManager = cssThemeManager || new CSSThemeManager();
    // Themes will be loaded dynamically via initialize()
  }

  /**
   * Initialize theme manager with dynamic theme discovery
   */
  async initialize(): Promise<void> {
    await this.cssThemeManager.initialize();
    await this.syncWithCSSThemes();
  }

  /**
   * Sync with CSS Theme Manager to ensure all discovered themes have definitions
   */
  private async syncWithCSSThemes(): Promise<void> {
    const cssThemes = this.cssThemeManager.getAvailableThemes();

    for (const cssTheme of cssThemes) {
      if (!this.themes.has(cssTheme.name)) {
        // Generate a theme definition for any CSS theme that doesn't have one
        const generatedTheme = this.generateThemeFromCSS(cssTheme);
        this.themes.set(cssTheme.name, generatedTheme);
      }
    }
  }

  /**
   * Generate a theme definition from CSS theme info
   */
  private generateThemeFromCSS(cssTheme: {
    name: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  }): Theme {
    // Default theme structure with sensible defaults
    const baseTheme: Theme = {
      name: cssTheme.name,
      fonts: {
        body: 'Helvetica, Arial, sans-serif',
        heading: 'Helvetica, Arial, sans-serif',
        monospace: 'Courier New, monospace',
      },
      colors: {
        primary: cssTheme.primaryColor || '#333333',
        secondary: cssTheme.secondaryColor || '#666666',
        text: '#000000',
        background: '#ffffff',
        accent: cssTheme.accentColor || '#0066cc',
      },
      spacing: {
        margin: '40px',
        padding: '15px',
        lineHeight: 1.6,
      },
      sizes: {
        h1: '24px',
        h2: '18px',
        h3: '16px',
        body: '12px',
        small: '11px',
      },
    };

    // Apply theme-specific overrides
    switch (cssTheme.name) {
      case 'ats':
        return {
          ...baseTheme,
          fonts: {
            body: 'Helvetica, Arial, sans-serif',
            heading: 'Helvetica, Arial, sans-serif',
            monospace: 'Courier New, monospace',
          },
          colors: {
            ...baseTheme.colors,
            primary: '#000000',
            secondary: '#333333',
            accent: '#000000',
          },
          spacing: {
            margin: '40px',
            padding: '10px',
            lineHeight: 1.5,
          },
        };
      case 'classic':
        return {
          ...baseTheme,
          fonts: {
            body: 'Times New Roman, serif',
            heading: 'Times New Roman, serif',
            monospace: 'Courier New, monospace',
          },
          colors: {
            ...baseTheme.colors,
            primary: '#000000',
            secondary: '#666666',
            accent: '#800000',
          },
          spacing: {
            margin: '50px',
            padding: '15px',
            lineHeight: 1.5,
          },
        };
      case 'minimal':
        return {
          ...baseTheme,
          fonts: {
            body: 'Helvetica, Arial, sans-serif',
            heading: 'Helvetica, Arial, sans-serif',
            monospace: 'Monaco, Consolas, monospace',
          },
          colors: {
            ...baseTheme.colors,
            primary: '#1a1a1a',
            secondary: '#666666',
            accent: '#0066cc',
          },
          spacing: {
            margin: '60px',
            padding: '10px',
            lineHeight: 1.7,
          },
        };
      case 'modern':
        return {
          ...baseTheme,
          fonts: {
            body: 'Arial, sans-serif',
            heading: 'Arial, sans-serif',
            monospace: 'Courier New, monospace',
          },
          colors: {
            ...baseTheme.colors,
            primary: '#2c3e50',
            secondary: '#3498db',
            accent: '#e74c3c',
          },
          spacing: {
            margin: '40px',
            padding: '20px',
            lineHeight: 1.6,
          },
        };
      default:
        // For any unknown theme (like 'wackytext'), use sensible defaults
        return baseTheme;
    }
  }

  /**
   * Get a theme by name
   */
  getTheme(name: string): Theme {
    const theme = this.themes.get(name);
    if (!theme) {
      throw new Error(
        `Theme '${name}' not found. Available themes: ${Array.from(this.themes.keys()).join(', ')}`
      );
    }
    return theme;
  }

  /**
   * Register a new theme
   */
  registerTheme(theme: Theme): void {
    this.themes.set(theme.name, theme);
  }

  /**
   * Get all available theme names
   */
  getAvailableThemes(): string[] {
    return Array.from(this.themes.keys());
  }

  /**
   * Refresh themes (useful when new CSS themes are added)
   */
  async refreshThemes(): Promise<void> {
    await this.cssThemeManager.refreshThemes();
    await this.syncWithCSSThemes();
  }
}

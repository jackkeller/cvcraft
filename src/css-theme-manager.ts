/**
 * Enhanced CSS-based Theme Manager
 * Supports dynamic theme discovery and color customization
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

export interface ThemeInfo {
  name: string;
  displayName: string;
  cssPath: string;
  customizable: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export interface ThemeCustomization {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export class CSSThemeManager {
  private themesDir: string;
  private themes: Map<string, ThemeInfo> = new Map();

  constructor(themesDir: string = 'themes') {
    this.themesDir = path.resolve(themesDir);
    // Don't call discoverThemes() here - it needs to be awaited
  }

  /**
   * Initialize the theme manager (must be called after construction)
   */
  async initialize(): Promise<void> {
    await this.discoverThemes();
  }

  /**
   * Discover all theme-*.css files in the themes directory
   */
  private async discoverThemes(): Promise<void> {
    try {
      console.log(`Looking for themes in: ${this.themesDir}`);

      if (!(await fs.pathExists(this.themesDir))) {
        console.warn(`Themes directory not found: ${this.themesDir}`);
        return;
      }

      const files = await fs.readdir(this.themesDir);

      const themeFiles = files.filter(
        file => file.startsWith('theme-') && file.endsWith('.css')
      );

      for (const file of themeFiles) {
        const themeName = file.replace('theme-', '').replace('.css', '');
        const displayName = this.formatDisplayName(themeName);
        const cssPath = path.join(this.themesDir, file);

        // Check if theme supports customization (has CSS variables)
        const customizable = await this.isThemeCustomizable(cssPath);
        const primaryColor = customizable
          ? await this.extractPrimaryColor(cssPath)
          : undefined;
        const secondaryColor = customizable
          ? await this.extractSecondaryColor(cssPath)
          : undefined;
        const accentColor = customizable
          ? await this.extractAccentColor(cssPath)
          : undefined;

        const themeInfo = {
          name: themeName,
          displayName,
          cssPath,
          customizable,
          primaryColor,
          secondaryColor,
          accentColor,
        };

        this.themes.set(themeName, themeInfo);
      }

      console.log(
        chalk.green(
          `Successfully discovered ${this.themes.size} themes:`,
          Array.from(this.themes.keys())
        )
      );
    } catch (error) {
      console.error(chalk.red('Error discovering themes:', error));
    }
  }

  /**
   * Format theme name for display
   */
  private formatDisplayName(themeName: string): string {
    return themeName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Check if theme supports customization by looking for CSS variables
   */
  private async isThemeCustomizable(cssPath: string): Promise<boolean> {
    try {
      const cssContent = await fs.readFile(cssPath, 'utf-8');
      return cssContent.includes('--theme-primary');
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract primary color from theme CSS
   */
  private async extractPrimaryColor(
    cssPath: string
  ): Promise<string | undefined> {
    try {
      const cssContent = await fs.readFile(cssPath, 'utf-8');
      const match = cssContent.match(/--theme-primary:\s*([^;]+);/);
      return match ? match[1].trim() : undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Extract secondary color from theme CSS
   */
  private async extractSecondaryColor(
    cssPath: string
  ): Promise<string | undefined> {
    try {
      const cssContent = await fs.readFile(cssPath, 'utf-8');
      const match = cssContent.match(/--theme-secondary:\s*([^;]+);/);
      return match ? match[1].trim() : undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Extract accent color from theme CSS
   */
  private async extractAccentColor(
    cssPath: string
  ): Promise<string | undefined> {
    try {
      const cssContent = await fs.readFile(cssPath, 'utf-8');
      const match = cssContent.match(/--theme-accent:\s*([^;]+);/);
      return match ? match[1].trim() : undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get all available themes
   */
  getAvailableThemes(): ThemeInfo[] {
    return Array.from(this.themes.values());
  }

  /**
   * Get theme info by name
   */
  getThemeInfo(name: string): ThemeInfo | undefined {
    return this.themes.get(name);
  }

  /**
   * Get theme CSS content
   */
  async getThemeCSS(
    name: string,
    customization?: ThemeCustomization
  ): Promise<string> {
    const theme = this.themes.get(name);
    if (!theme) {
      throw new Error(`Theme '${name}' not found`);
    }

    let cssContent = await fs.readFile(theme.cssPath, 'utf-8');

    // Apply customizations if provided and theme supports it
    if (customization && theme.customizable) {
      cssContent = this.applyCustomization(cssContent, customization);
    }

    return cssContent;
  }

  /**
   * Apply color customizations to CSS content
   */
  private applyCustomization(
    cssContent: string,
    customization: ThemeCustomization
  ): string {
    let customizedCSS = cssContent;

    if (customization.primaryColor) {
      // Replace primary color and generate variations
      const primaryColor = customization.primaryColor;
      const primaryDark = this.darkenColor(primaryColor, 20);
      const primaryLight = this.lightenColor(primaryColor, 20);

      customizedCSS = customizedCSS
        .replace(
          /--theme-primary:\s*[^;]+;/,
          `--theme-primary: ${primaryColor};`
        )
        .replace(
          /--theme-primary-dark:\s*[^;]+;/,
          `--theme-primary-dark: ${primaryDark};`
        )
        .replace(
          /--theme-primary-light:\s*[^;]+;/,
          `--theme-primary-light: ${primaryLight};`
        );
    }

    if (customization.secondaryColor) {
      customizedCSS = customizedCSS.replace(
        /--theme-secondary:\s*[^;]+;/,
        `--theme-secondary: ${customization.secondaryColor};`
      );
    }

    if (customization.accentColor) {
      customizedCSS = customizedCSS.replace(
        /--theme-accent:\s*[^;]+;/,
        `--theme-accent: ${customization.accentColor};`
      );
    }

    return customizedCSS;
  }

  /**
   * Darken a hex color by a percentage
   */
  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = ((num >> 8) & 0x00ff) - amt;
    const B = (num & 0x0000ff) - amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  /**
   * Lighten a hex color by a percentage
   */
  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  /**
   * Refresh theme discovery (useful for detecting new themes)
   */
  async refreshThemes(): Promise<void> {
    this.themes.clear();
    await this.discoverThemes();
  }
}

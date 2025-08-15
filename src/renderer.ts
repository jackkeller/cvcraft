/**
 * PDF renderer using puppeteer-core for HTML to PDF conversion
 */

import puppeteer from 'puppeteer-core';
import * as fs from 'fs';
import MarkdownIt from 'markdown-it';
import { ParsedContent, ConversionOptions, Section } from './types';
import { CSSThemeManager } from './css-theme-manager';

export class PDFRenderer {
  private cssThemeManager: CSSThemeManager;

  constructor(cssThemeManager?: CSSThemeManager) {
    this.cssThemeManager = cssThemeManager || new CSSThemeManager();
  }

  async initialize(): Promise<void> {
    await this.cssThemeManager.initialize();
  }

  /**
   * Render parsed content to PDF
   */
  async render(
    content: ParsedContent,
    options: ConversionOptions
  ): Promise<void> {
    // Ensure CSS theme manager is initialized
    await this.cssThemeManager.initialize();

    const themeName =
      typeof options.theme === 'string' ? options.theme : 'modern';

    // Get theme CSS
    const themeCSS = await this.cssThemeManager.getThemeCSS(themeName);

    // Generate HTML using CSS theme system
    const html = this.generateHTMLWithCSS(content, themeCSS);

    let browser;
    try {
      // Try to launch with system Chrome first
      browser = await puppeteer.launch({
        executablePath: this.findChrome(),
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Configure PDF options
      const pdfOptions = {
        path: options.outputPath,
        format: (options.format || 'Letter') as 'A4' | 'Letter',
        margin: {
          top: options.margins?.top || '20mm',
          right: options.margins?.right || '20mm',
          bottom: options.margins?.bottom || '20mm',
          left: options.margins?.left || '20mm',
        },
        printBackground: true,
      };

      await page.pdf(pdfOptions);
    } catch (error) {
      throw new Error(
        `Failed to generate PDF: ${
          error instanceof Error ? error.message : 'Unknown error'
        }. Make sure Chrome/Chromium is installed on your system.`
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Find Chrome executable path on the system
   */
  private findChrome(): string {
    const possiblePaths = [
      // macOS
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      // Linux
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      // Windows
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];

    for (const path of possiblePaths) {
      try {
        if (fs.existsSync(path)) {
          return path;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    // Fallback to system PATH
    return 'google-chrome';
  }

  /**
   * Generate complete HTML document with CSS theme for PDF generation
   */
  private generateHTMLWithCSS(
    content: ParsedContent,
    themeCSS: string
  ): string {
    const title = content.metadata.name || content.metadata.title || 'Resume';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
      * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
      }
      
      body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
      }
      
      /* PDF-specific styles */
      .page-break {
          page-break-before: always;
      }
      
      /* Resume section containers for better page breaks */
      .resume-section {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 20px;
      }
      
      .resume-section h1,
      .resume-section h2,
      .resume-section h3,
      .resume-section h4 {
          page-break-after: avoid;
          break-after: avoid;
      }
      
      h1, h2, h3 {
          page-break-after: avoid;
      }
      
      ${themeCSS}
  </style>
</head>
<body>
  <div class="resume-container ats-optimized" role="document">
      ${this.renderHeaderFromMetadata(content.metadata)}
      <main class="content" role="main">
          ${this.renderStructuredContent(content)}
      </main>
  </div>
</body>
</html>`;
  }

  /**
   * Render header section from metadata
   */
  private renderHeaderFromMetadata(
    metadata: Record<string, undefined | string>
  ): string {
    if (!metadata.name && !metadata.title) {
      return '';
    }

    const name = metadata.name || metadata.title || '';
    const email = metadata.email || '';
    const phone = metadata.phone || '';
    const website = metadata.website || metadata.url || '';
    const location = metadata.location || metadata.address || '';

    // Use semantic HTML structure for better ATS parsing
    const contactItems = [];
    if (email) {
      contactItems.push(
        `<p class="contact-item"><a href="mailto:${email}">${email}</a></p>`
      );
    }
    if (phone) contactItems.push(`<p class="contact-item">${phone}</p>`);
    if (website) {
      const url = website.startsWith('http') ? website : `https://${website}`;
      const displayText = website.replace(/^https?:\/\//, '');
      contactItems.push(
        `<p class="contact-item"><a href="${url}" target="_blank">${displayText}</a></p>`
      );
    }
    if (location) contactItems.push(`<p class="contact-item">${location}</p>`);

    return `
        <header class="header resume-section" role="banner">
            <h1>${name}</h1>
            ${
              contactItems.length > 0
                ? `<div class="contact-info" role="contentinfo">${contactItems.join('')}</div>`
                : ''
            }
        </header>
    `;
  }

  /**
   * Render content using structured sections for better page breaks
   */
  private renderStructuredContent(content: ParsedContent): string {
    // Use a simpler approach - start with the original HTML and wrap job experiences
    let html = content.html;

    // Find and wrap job experience blocks with resume-section containers
    // Look for h3 headings followed by company/date patterns and bullet points
    const jobExperiencePattern =
      /(<h3[^>]*>.*?<\/h3>\s*<p[^>]*>\s*<strong>.*?<\/strong>.*?<\/p>\s*<ul>.*?<\/ul>)/gs;

    html = html.replace(
      jobExperiencePattern,
      '<div class="resume-section">$1</div>'
    );

    return html;
  }

  /**
   * Group sections into logical blocks (e.g., job experience = heading + content + bullets)
   */
  private groupSectionsIntoBlocks(sections: Section[]): Section[][] {
    const blocks: Section[][] = [];
    let currentBlock: Section[] = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const nextSection = sections[i + 1];

      if (section.type === 'header' && section.level && section.level >= 3) {
        // Only start new blocks for h3+ headings that look like job experiences
        // (headings followed by content that includes company info, dates, etc.)
        if (this.looksLikeJobExperience(section, nextSection)) {
          if (currentBlock.length > 0) {
            blocks.push(currentBlock);
          }
          currentBlock = [section];
        } else {
          // Add to current block for intro content or section headings
          currentBlock.push(section);
        }
      } else {
        // Add to current block
        currentBlock.push(section);
      }
    }

    // Add the last block
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }

    return blocks;
  }

  /**
   * Determine if a heading looks like a job experience entry
   */
  private looksLikeJobExperience(
    header: Section,
    nextSection?: Section
  ): boolean {
    if (!nextSection || header.level !== 3) {
      return false;
    }

    // Check if the next section contains typical job experience patterns
    const content = nextSection.content?.toLowerCase() || '';

    // Look for company indicators, date patterns, or job-related keywords
    const jobPatterns = [
      /\*\*.*\*\*.*\|/, // **Company** | dates pattern
      /\d{4}\s*-\s*\d{4}/, // Date ranges like 2020 - 2023
      /\d{4}\s*-\s*present/i, // 2020 - Present
      /company|corp|inc|ltd|llc/i, // Company suffixes
      /remote|onsite|hybrid/i, // Work arrangements
    ];

    return jobPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Render an individual section to HTML
   */
  private renderSection(section: Section): string {
    switch (section.type) {
      case 'header': {
        const level = section.level || 1;
        const tag = `h${Math.min(level, 6)}`;
        // Wrap headers in semantic sections for better ATS parsing
        if (level === 2) {
          return `<section class="resume-section" role="region" aria-labelledby="section-${section.content.toLowerCase().replace(/\s+/g, '-')}">
            <${tag} id="section-${section.content.toLowerCase().replace(/\s+/g, '-')}">${this.escapeHtml(section.content)}</${tag}>`;
        }
        return `<${tag}>${this.escapeHtml(section.content)}</${tag}>`;
      }

      case 'paragraph': {
        // Use markdown-it to render the paragraph content
        const md = new MarkdownIt();
        const rendered = md.render(section.content);
        // Close section if this appears to be the end of a section
        return rendered;
      }

      case 'list': {
        if (section.items && section.items.length > 0) {
          const listItems = section.items
            .map((item: string) => `<li>${this.escapeHtml(item)}</li>`)
            .join('');
          return `<ul role="list">${listItems}</ul>`;
        }
        return '';
      }

      default:
        return this.escapeHtml(section.content);
    }
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (match: string) => {
      const escapeMap: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return escapeMap[match];
    });
  }
}

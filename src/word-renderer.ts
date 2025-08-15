/**
 * Word Document Renderer
 * Converts resume content to .docx format for ATS compatibility using docx library
 */

import * as fs from 'fs-extra';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { ResumeMetadata } from './types';

export interface WordRenderOptions {
  theme?: string;
  customization?: Record<string, string>;
  outputPath?: string;
}

export class WordRenderer {
  /**
   * Render parsed resume content to Word document
   */
  async renderToWord(
    htmlContent: string,
    metadata: ResumeMetadata,
    options: WordRenderOptions = {}
  ): Promise<Buffer> {
    try {
      // Create Word document using docx library with proper styling
      const doc = new Document({
        styles: {
          default: {
            document: {
              run: {
                font: this.getThemeFont(options.theme),
                size: 22, // 11pt
              },
              paragraph: {
                spacing: {
                  after: 120, // 6pt spacing after paragraphs
                },
              },
            },
          },
        },
        sections: [
          {
            properties: {},
            children: this.createWordElements(htmlContent, metadata, options),
          },
        ],
      });

      // Generate buffer
      const buffer = await Packer.toBuffer(doc);
      return buffer;
    } catch (error) {
      console.error('Word rendering failed:', error);
      throw new Error(`Failed to render Word document: ${error}`);
    }
  }

  /**
   * Get appropriate font based on theme
   */
  private getThemeFont(theme?: string): string {
    switch (theme) {
      case 'modern':
      case 'ats':
        return 'Helvetica';
      case 'classic':
        return 'Times New Roman';
      case 'minimal':
        return 'Arial';
      default:
        return 'Helvetica'; // Default to Helvetica for ATS compatibility
    }
  }

  /**
   * Create Word document elements from HTML content
   */
  private createWordElements(
    htmlContent: string,
    metadata: ResumeMetadata,
    options: WordRenderOptions = {}
  ): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const themeFont = this.getThemeFont(options.theme);

    // Add header with name and contact info
    if (metadata.name) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: metadata.name,
              font: themeFont,
              size: 32, // 16pt for title
              bold: true,
            }),
          ],
          heading: HeadingLevel.TITLE,
          spacing: {
            after: 240, // 12pt spacing after title
          },
        })
      );
    }

    // Add contact information
    const contactInfo: string[] = [];
    if (metadata.email) contactInfo.push(metadata.email);
    if (metadata.phone) contactInfo.push(metadata.phone);
    if (metadata.website) contactInfo.push(metadata.website);
    if (metadata.location) contactInfo.push(metadata.location);

    if (contactInfo.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: contactInfo.join(' | '),
              font: themeFont,
              size: 20, // 10pt for contact info
            }),
          ],
          spacing: {
            after: 360, // 18pt spacing after contact info
          },
        })
      );
    }

    // Extract clean content from HTML
    const cleanContent = this.extractCleanContent(htmlContent);
    const contentElements = this.parseContentToElements(cleanContent);

    // Convert content elements to Word paragraphs
    for (const element of contentElements) {
      if (element.type === 'heading') {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: element.text,
                font: themeFont,
                size: element.level === 1 ? 28 : 24, // 14pt for H1, 12pt for H2
                bold: true,
              }),
            ],
            heading:
              element.level === 1
                ? HeadingLevel.HEADING_1
                : HeadingLevel.HEADING_2,
            spacing: {
              before: element.level === 1 ? 360 : 240, // 18pt before H1, 12pt before H2
              after: 180, // 9pt after headings
            },
          })
        );
      } else if (element.type === 'paragraph' && element.text.trim()) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: element.text,
                font: themeFont,
                size: 22, // 11pt for body text
              }),
            ],
            spacing: {
              after: 120, // 6pt after paragraphs
            },
          })
        );
      } else if (element.type === 'list-item') {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${element.text}`,
                font: themeFont,
                size: 22, // 11pt for list items
              }),
            ],
            spacing: {
              after: 60, // 3pt after list items
            },
            indent: {
              left: 360, // 0.25" indent for list items
            },
          })
        );
      }
    }

    return paragraphs;
  }

  /**
   * Extract clean content from HTML, removing styles, scripts, and unwanted elements
   */
  private extractCleanContent(htmlContent: string): string {
    // Remove style and script tags completely
    let cleanHtml = htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    cleanHtml = cleanHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Extract only the content div if it exists
    const contentMatch = cleanHtml.match(
      /<div[^>]*class="content"[^>]*>([\s\S]*?)<\/div>/
    );
    if (contentMatch) {
      cleanHtml = contentMatch[1];
    }

    // Remove header div since we handle metadata separately
    cleanHtml = cleanHtml.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    cleanHtml = cleanHtml.replace(
      /<div[^>]*class="header"[^>]*>[\s\S]*?<\/div>/gi,
      ''
    );

    return cleanHtml;
  }

  /**
   * Parse clean HTML content to structured elements
   */
  private parseContentToElements(content: string): Array<{
    type: 'heading' | 'paragraph' | 'list-item';
    text: string;
    level?: number;
  }> {
    const elements: Array<{
      type: 'heading' | 'paragraph' | 'list-item';
      text: string;
      level?: number;
    }> = [];

    // Split into lines and process each one
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and unwanted tags
      if (
        !trimmedLine ||
        trimmedLine.startsWith('<!') ||
        trimmedLine.match(/^<\/?(?:html|body|div|section|article)(?:\s|>)/)
      ) {
        continue;
      }

      // Parse headings
      const h1Match = trimmedLine.match(/<h1[^>]*>(.*?)<\/h1>/);
      if (h1Match) {
        elements.push({
          type: 'heading',
          text: this.stripHtmlTags(h1Match[1]),
          level: 1,
        });
        continue;
      }

      const h2Match = trimmedLine.match(/<h2[^>]*>(.*?)<\/h2>/);
      if (h2Match) {
        elements.push({
          type: 'heading',
          text: this.stripHtmlTags(h2Match[1]),
          level: 2,
        });
        continue;
      }

      const h3Match = trimmedLine.match(/<h3[^>]*>(.*?)<\/h3>/);
      if (h3Match) {
        elements.push({
          type: 'heading',
          text: this.stripHtmlTags(h3Match[1]),
          level: 2,
        });
        continue;
      }

      // Parse list items
      const liMatch = trimmedLine.match(/<li[^>]*>(.*?)<\/li>/);
      if (liMatch) {
        elements.push({
          type: 'list-item',
          text: this.stripHtmlTags(liMatch[1]),
        });
        continue;
      }

      // Parse paragraphs
      const pMatch = trimmedLine.match(/<p[^>]*>(.*?)<\/p>/);
      if (pMatch) {
        const text = this.stripHtmlTags(pMatch[1]);
        if (text.trim()) {
          elements.push({ type: 'paragraph', text });
        }
        continue;
      }

      // Handle plain text (skip if it looks like code)
      const plainText = this.stripHtmlTags(trimmedLine);
      if (plainText.trim() && !this.looksLikeCode(plainText)) {
        elements.push({ type: 'paragraph', text: plainText });
      }
    }

    return elements;
  }

  /**
   * Check if text looks like code/CSS/JS that should be skipped
   */
  private looksLikeCode(text: string): boolean {
    return (
      text.includes('{') ||
      text.includes('}') ||
      text.includes('function') ||
      text.includes('const ') ||
      text.includes('var ') ||
      text.includes('let ') ||
      text.includes('margin:') ||
      text.includes('padding:') ||
      text.includes('font-') ||
      text.includes('color:') ||
      text.includes('background') ||
      text.includes('border') ||
      text.includes('ws.on') ||
      text.includes('location.reload') ||
      text.includes('Theme:')
    );
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Save Word document to file
   */
  async saveWordDocument(
    htmlContent: string,
    metadata: ResumeMetadata,
    outputPath: string,
    options: WordRenderOptions = {}
  ): Promise<void> {
    try {
      const docxBuffer = await this.renderToWord(
        htmlContent,
        metadata,
        options
      );

      // Write to file
      await fs.writeFile(outputPath, docxBuffer);
      console.log(`Word document saved to: ${outputPath}`);
    } catch (error) {
      console.error(`Failed to save Word document to ${outputPath}:`, error);
      throw error;
    }
  }

  /**
   * Get suggested filename for Word document
   */
  getSuggestedFilename(metadata: ResumeMetadata, theme?: string): string {
    const name = metadata.name || 'resume';
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const themePrefix = theme ? `${theme}-` : '';
    return `${themePrefix}${cleanName}.docx`;
  }
}

/**
 * Markdown parser for converting markdown to structured content
 */

import MarkdownIt from 'markdown-it';
import { ParsedContent, Section } from './types';

export class MarkdownParser {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true, // Convert single line breaks to <br> tags for better resume formatting
    });
  }

  /**
   * Parse markdown content into structured format
   */
  parse(markdown: string): ParsedContent {
    // Extract metadata from front matter
    const { content, metadata } = this.extractFrontMatter(markdown);

    // Convert to HTML
    const html = this.md.render(content);

    // Parse into sections for better PDF formatting
    const sections = this.parseSections(content);

    return {
      html,
      metadata,
      sections,
    };
  }

  /**
   * Extract YAML front matter from markdown
   */
  private extractFrontMatter(markdown: string): {
    content: string;
    metadata: Record<string, string>;
  } {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = markdown.match(frontMatterRegex);

    if (!match) {
      return { content: markdown, metadata: {} };
    }

    const yamlContent = match[1];
    const content = match[2];

    // Simple YAML parser for basic key-value pairs
    const metadata: Record<string, string> = {};
    yamlContent.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        metadata[key] = value;
      }
    });

    return { content, metadata };
  }

  /**
   * Parse markdown into structured sections
   */
  private parseSections(markdown: string): Section[] {
    const lines = markdown.split('\n');
    const sections: Section[] = [];
    let currentSection: Section | null = null;

    for (const line of lines) {
      if (line.startsWith('#')) {
        // Header
        const level = line.match(/^#+/)?.[0].length || 1;
        const content = line.replace(/^#+\s*/, '');

        if (currentSection) {
          sections.push(currentSection);
        }

        currentSection = {
          type: 'header',
          content,
          level,
        };
      } else if (
        line.startsWith('- ') ||
        line.startsWith('* ') ||
        line.match(/^\d+\./)
      ) {
        // List item
        if (!currentSection || currentSection.type !== 'list') {
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = {
            type: 'list',
            content: '',
            items: [],
          };
        }

        const item = line.replace(/^[-*]\s*|\d+\.\s*/, '');
        if (currentSection.items) {
          currentSection.items.push(item);
        }
      } else if (line.trim() && currentSection?.type === 'header') {
        // Convert header to paragraph if it has content
        currentSection.type = 'paragraph';
        currentSection.content += '\n' + line;
      } else if (line.trim()) {
        // Regular paragraph
        if (!currentSection || currentSection.type === 'list') {
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = {
            type: 'paragraph',
            content: line,
          };
        } else {
          currentSection.content += '\n' + line;
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }
}

/**
 * Word Document Converter
 * High-level interface for converting markdown to Word documents
 */

import { MarkdownParser } from './parser';
import { HTMLRenderer } from './html-renderer';
import { WordRenderer } from './word-renderer';

export interface WordConvertOptions {
  theme?: string;
  outputPath: string;
  customization?: Record<string, string>;
}

/**
 * Convert markdown content to Word document
 */
export async function convertMarkdownToWord(
  markdownContent: string,
  options: WordConvertOptions
): Promise<void> {
  try {
    // Parse markdown content
    const parser = new MarkdownParser();
    const parsedContent = parser.parse(markdownContent);

    // Initialize renderers
    const htmlRenderer = new HTMLRenderer();
    const wordRenderer = new WordRenderer();

    // Get theme name
    const theme = options.theme || 'modern';

    // Render to HTML first - use the correct method name
    const htmlContent = await htmlRenderer.render(parsedContent, theme);

    // Convert HTML to Word document
    await wordRenderer.saveWordDocument(
      htmlContent,
      parsedContent.metadata,
      options.outputPath,
      {
        theme,
        customization: options.customization,
      }
    );

    console.log(`Word document saved successfully: ${options.outputPath}`);
  } catch (error) {
    console.error('Word conversion failed:', error);
    throw new Error(`Failed to convert markdown to Word: ${error}`);
  }
}

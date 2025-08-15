/**
 * Main converter function that orchestrates the conversion process
 */

import { MarkdownParser } from './parser';
import { PDFRenderer } from './renderer';
import { ConversionOptions } from './types';

/**
 * Convert markdown content to PDF
 */
export async function convertMarkdownToPDF(
  markdownContent: string,
  options: ConversionOptions
): Promise<void> {
  const parser = new MarkdownParser();
  const renderer = new PDFRenderer();

  // Parse markdown content
  const parsedContent = parser.parse(markdownContent);

  // Render to PDF
  await renderer.render(parsedContent, options);
}

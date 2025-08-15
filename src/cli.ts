#!/usr/bin/env node

/**
 * CLI interface for CVCraft
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { convertMarkdownToPDF } from './converter';
import { ThemeManager } from './themes';
import { CSSThemeManager } from './css-theme-manager';
import { config } from './config';

interface CLIOptions {
  theme?: string;
  format?: string;
  pageFormat?: 'A4' | 'Letter';
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
}

const program = new Command();

// Function to get the correct themes directory path
function getThemesDirectory(): string {
  // When installed globally, themes are in the package directory
  // When running locally, themes are in the project root
  const packageDir = path.dirname(path.dirname(__filename)); // Go up from dist/ to package root
  const globalThemesPath = path.join(packageDir, 'themes');
  const localThemesPath = path.resolve('themes');

  // Check if global themes path exists (for npm installed package)
  if (fs.existsSync(globalThemesPath)) {
    return globalThemesPath;
  }

  // Fall back to local themes path
  return localThemesPath;
}

const cssThemeManager = new CSSThemeManager(getThemesDirectory());
const themeManager = new ThemeManager(cssThemeManager);

program
  .name(config.getCliName())
  .description('Convert markdown resumes to beautiful PDFs or Word Documents')
  .version(config.getVersion());

program
  .command('convert')
  .description('Convert a markdown file to PDF or Word document')
  .argument('<input>', 'Input markdown file')
  .argument('<output>', 'Output file (PDF or Word)')
  .option('-t, --theme <theme>', 'Theme to use for styling', 'modern')
  .option(
    '-f, --format <format>',
    'Output format (pdf, word, docx) or PDF page format (A4, Letter)',
    'pdf'
  )
  .option('--page-format <format>', 'PDF page format (A4 or Letter)', 'A4')
  .option('--margin-top <margin>', 'Top margin', '20mm')
  .option('--margin-right <margin>', 'Right margin', '20mm')
  .option('--margin-bottom <margin>', 'Bottom margin', '20mm')
  .option('--margin-left <margin>', 'Left margin', '20mm')
  .action(async (input: string, output: string, options: CLIOptions) => {
    try {
      // Validate input file
      if (!(await fs.pathExists(input))) {
        console.error(chalk.red(`Error: Input file '${input}' does not exist`));
        process.exit(1);
      }

      // Set defaults for optional values
      const theme = options.theme || 'modern';
      const pageFormat = options.pageFormat || 'A4';
      let outputFormat = 'pdf';
      const marginTop = options.marginTop || '20mm';
      const marginRight = options.marginRight || '20mm';
      const marginBottom = options.marginBottom || '20mm';
      const marginLeft = options.marginLeft || '20mm';

      // Determine output format from --format option or file extension
      if (options.format) {
        const formatLower = options.format.toLowerCase();
        if (['word', 'docx'].includes(formatLower)) {
          outputFormat = 'word';
        } else if (formatLower === 'pdf') {
          outputFormat = 'pdf';
        } else if (['a4', 'letter'].includes(formatLower)) {
          // Legacy: treat A4/Letter as PDF page format
          outputFormat = 'pdf';
        } else {
          outputFormat = formatLower;
        }
      } else {
        // Auto-detect from file extension if no format specified
        const ext = path.extname(output).toLowerCase();
        if (ext === '.docx') {
          outputFormat = 'word';
        } else if (ext === '.pdf') {
          outputFormat = 'pdf';
        }
      }

      // Validate output format
      if (!['pdf', 'word', 'docx'].includes(outputFormat)) {
        console.error(
          chalk.red(`Error: Invalid output format '${outputFormat}'`)
        );
        console.error(chalk.yellow('Available formats: pdf, word, docx'));
        process.exit(1);
      }

      // Normalize word format
      const normalizedFormat = outputFormat === 'docx' ? 'word' : outputFormat;

      // Initialize theme manager and validate theme
      await themeManager.initialize();
      const availableThemes = themeManager.getAvailableThemes();
      if (!availableThemes.includes(theme)) {
        console.error(chalk.red(`Error: Theme '${theme}' not found`));
        console.error(
          chalk.yellow(`Available themes: ${availableThemes.join(', ')}`)
        );
        process.exit(1);
      }

      // Ensure output directory exists
      const outputDir = path.dirname(output);
      await fs.ensureDir(outputDir);

      console.log(chalk.blue(`Converting ${input} to ${output}...`));
      console.log(chalk.gray(`Using theme: ${theme}`));
      console.log(
        chalk.gray(`Output format: ${normalizedFormat.toUpperCase()}`)
      );

      // Read markdown content
      const markdownContent = await fs.readFile(input, 'utf-8');

      if (normalizedFormat === 'word') {
        // Convert to Word document using inline implementation
        try {
          const { MarkdownParser } = await import('./parser');
          const { HTMLRenderer } = await import('./html-renderer');
          const { WordRenderer } = await import('./word-renderer');

          // Parse markdown content
          const parser = new MarkdownParser();
          const parsedContent = parser.parse(markdownContent);

          // Render to HTML
          const htmlRenderer = new HTMLRenderer(themeManager);
          const htmlContent = await htmlRenderer.render(parsedContent, theme);

          // Convert to Word using docx library
          const wordRenderer = new WordRenderer();
          const wordBuffer = await wordRenderer.renderToWord(
            htmlContent,
            parsedContent.metadata
          );

          // Write Word document to file
          await fs.writeFile(output, wordBuffer);
        } catch (error) {
          console.error(chalk.red('Word conversion failed:'), error);
          process.exit(1);
        }
      } else {
        // Convert to PDF
        await convertMarkdownToPDF(
          markdownContent,
          {
            theme,
            outputPath: output,
            format: pageFormat,
            margins: {
              top: marginTop,
              right: marginRight,
              bottom: marginBottom,
              left: marginLeft,
            },
          },
          cssThemeManager
        );
      }

      console.log(
        chalk.green(`✓ Successfully converted '${input}' to '${output}'`)
      );
    } catch (error) {
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
      process.exit(1);
    }
  });

program
  .command('themes')
  .description('List available themes')
  .action(async () => {
    try {
      await themeManager.initialize();
      const themes = themeManager.getAvailableThemes();
      console.log(chalk.blue('Available themes:'));
      themes.forEach(theme => {
        console.log(chalk.green(`  • ${theme}`));
      });
    } catch (error) {
      console.error(chalk.red('Error loading themes:'), error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Create a sample resume template')
  .argument('[filename]', 'Output filename', 'resume.md')
  .action(async (filename: string) => {
    const template = `---
name: John Doe
email: john.doe@example.com
phone: (555) 123-4567
location: San Francisco, CA
---

## Experience

### Senior Software Engineer
**Tech Company** | 2020 - Present
- Developed scalable web applications using React and Node.js
- Led a team of 5 developers on multiple projects
- Improved application performance by 40%

### Software Engineer
**Previous Company** | 2018 - 2020
- Built REST APIs using Python and Django
- Collaborated with cross-functional teams
- Implemented automated testing procedures

## Education

### Bachelor of Science in Computer Science
**University of Technology** | 2014 - 2018
- Graduated Magna Cum Laude
- Relevant coursework: Data Structures, Algorithms, Software Engineering

## Skills

- **Programming Languages**: JavaScript, Python, TypeScript, Java
- **Frameworks**: React, Node.js, Django, Express
- **Tools**: Git, Docker, AWS, Jenkins
`;

    try {
      if (await fs.pathExists(filename)) {
        console.log(
          chalk.yellow(
            `File '${filename}' already exists. Use a different name or remove the existing file.`
          )
        );
        return;
      }

      await fs.writeFile(filename, template);
      console.log(chalk.green(`✓ Created sample resume template: ${filename}`));
      console.log(
        chalk.blue(
          `Edit the file and then run: ${config.getCliName()} convert ${filename} resume.pdf`
        )
      );
    } catch (error) {
      console.error(
        chalk.red(
          `Error creating template: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('Invalid command: %s'), program.args.join(' '));
  console.log(chalk.yellow('See --help for a list of available commands.'));
  process.exit(1);
});

program.parse();

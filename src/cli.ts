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
import { config } from './config';

interface CLIOptions {
  theme?: string;
  format?: 'A4' | 'Letter';
  outputFormat?: 'pdf' | 'word' | 'docx';
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
}

const program = new Command();
const themeManager = new ThemeManager();

program
  .name(config.getCliName())
  .description('Convert markdown resumes to beautiful PDFs')
  .version(config.getVersion());

program
  .command('convert')
  .description('Convert a markdown file to PDF or Word document')
  .argument('<input>', 'Input markdown file')
  .argument('<output>', 'Output file (PDF or Word)')
  .option('-t, --theme <theme>', 'Theme to use for styling', 'modern')
  .option('-f, --format <format>', 'PDF format (A4 or Letter)', 'A4')
  .option('--output-format <format>', 'Output format (pdf, word, docx)', 'pdf')
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
      const format = options.format || 'Letter';
      const outputFormat = options.outputFormat || 'pdf';
      const marginTop = options.marginTop || '20mm';
      const marginRight = options.marginRight || '20mm';
      const marginBottom = options.marginBottom || '20mm';
      const marginLeft = options.marginLeft || '20mm';

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

      // Validate theme
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
          const htmlRenderer = new HTMLRenderer();
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
        await convertMarkdownToPDF(markdownContent, {
          theme,
          outputPath: output,
          format,
          margins: {
            top: marginTop,
            right: marginRight,
            bottom: marginBottom,
            left: marginLeft,
          },
        });
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
  .action(() => {
    const themes = themeManager.getAvailableThemes();
    console.log(chalk.blue('Available themes:'));
    themes.forEach(theme => {
      console.log(chalk.green(`  • ${theme}`));
    });
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

# John Doe

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

#!/usr/bin/env node

/**
 * API server for CVCraft Vite frontend
 */

import express from 'express';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import { MarkdownParser } from './parser';
import { PDFRenderer } from './renderer';
import { CSSThemeManager } from './css-theme-manager';
import { ParsedContent, ResumeMetadata } from './types';
import { config } from './config';

const app = express();
const PORT = config.getApiPort();

// Initialize components
const parser = new MarkdownParser();
const pdfRenderer = new PDFRenderer();
const cssThemeManager = new CSSThemeManager();

// Initialize CSS theme manager async
let themeManagerReady = false;
cssThemeManager
  .initialize()
  .then(() => {
    themeManagerReady = true;
    console.log(chalk.green('CSS Theme Manager initialized successfully'));
  })
  .catch(error => {
    console.error(chalk.red('Failed to initialize CSS Theme Manager:', error));
  });

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS for Vite dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Helper function to generate HTML with CSS theme
async function generateHTMLWithCSS(
  parsed: ParsedContent,
  themeCSS: string
): Promise<string> {
  const title = parsed.metadata.name || parsed.metadata.title || 'Resume';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        ${themeCSS}
    </style>
</head>
<body>
    <div class="resume-container">
        ${renderHeader(parsed.metadata)}
        <div class="content">
            ${parsed.html}
        </div>
    </div>
</body>
</html>`;
}

// Helper function to render header with contact info
function renderHeader(metadata: ResumeMetadata): string {
  if (!metadata.name && !metadata.title) {
    return '';
  }

  const name = metadata.name || '';
  const title = metadata.title || '';
  const email = metadata.email || '';
  const phone = metadata.phone || '';
  const website = metadata.website || '';
  const location = metadata.location || '';

  const contactItems = [];
  if (email) contactItems.push(`<a href="mailto:${email}">${email}</a>`);
  if (phone) contactItems.push(`<span>${phone}</span>`);
  if (website) {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const displayText = website.replace(/^https?:\/\//, '');
    contactItems.push(`<a href="${url}" target="_blank">${displayText}</a>`);
  }
  if (location) contactItems.push(`<span>${location}</span>`);

  return `
    <div class="header">
      ${name ? `<h1>${name}</h1>` : ''}
      ${title ? `<div class="subtitle">${title}</div>` : ''}
      ${
        contactItems.length > 0
          ? `<div class="contact-info">${contactItems.join('')}</div>`
          : ''
      }
    </div>
  `;
}

// Helper function to generate personalized filename from metadata
function generatePersonalizedFilename(
  metadata: Record<string, undefined | string>
): string {
  try {
    const name = metadata.name || metadata.title;

    if (name) {
      // Convert name to filename-friendly format
      const cleanName = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

      // Get current date in YYYY-MM-DD format
      const date = new Date().toISOString().split('T')[0];

      return `resume-${cleanName}-${date}.pdf`;
    }

    // Fallback to timestamp if no name found
    return `resume-${Date.now()}.pdf`;
  } catch (error) {
    console.warn('Failed to generate personalized filename:', error);
    return `resume-${Date.now()}.pdf`;
  }
}

// API Routes

// Get available themes with customization info
app.get('/api/themes', async (req, res) => {
  try {
    console.log(chalk.gray('=== THEMES API CALLED ==='));

    // Ensure theme manager is initialized
    if (!themeManagerReady) {
      console.log(chalk.gray('Initializing theme manager...'));
      await cssThemeManager.initialize();
      themeManagerReady = true;
      console.log(chalk.gray('Theme manager initialized'));
    }

    const themes = cssThemeManager.getAvailableThemes();
    console.log(
      chalk.gray(
        `Themes from CSS manager: ${themes.map(t => t.name).join(', ')}`
      )
    );

    res.json(themes);
  } catch (error) {
    console.error(chalk.red(`Error getting themes: ${error}`));
    res.status(500).json({ error: 'Failed to get themes' });
  }
});

// Generate HTML preview with CSS-based themes
app.post('/api/preview', async (req, res) => {
  try {
    // Ensure theme manager is initialized
    if (!themeManagerReady) {
      await cssThemeManager.initialize();
      themeManagerReady = true;
    }

    const { markdown, theme = 'modern', customization } = req.body;

    if (!markdown) {
      return res.status(400).json({ error: 'Markdown content is required' });
    }

    // Parse markdown
    const parsed = parser.parse(markdown);

    // Get theme CSS with customization
    const themeCSS = await cssThemeManager.getThemeCSS(theme, customization);

    // Generate HTML with CSS theme
    const html = await generateHTMLWithCSS(parsed, themeCSS);

    res.send(html);
  } catch (error) {
    console.error(chalk.red(`Error generating preview: ${error}`));
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Generate and download PDF
app.post('/api/generate-pdf', async (req, res) => {
  try {
    // Ensure theme manager is initialized
    if (!themeManagerReady) {
      await cssThemeManager.initialize();
      themeManagerReady = true;
    }

    const {
      markdown,
      theme = 'modern',
      format = 'Letter',
      // customization,
    } = req.body;

    if (!markdown) {
      return res.status(400).json({ error: 'Markdown content is required' });
    }

    console.log(`Generating PDF with theme: ${theme}, format: ${format}`);

    // Parse markdown
    const parsed = parser.parse(markdown);

    // Generate PDF using existing PDFRenderer with temporary file
    const tempPath = `/tmp/resume-${Date.now()}.pdf`;

    await pdfRenderer.render(parsed, {
      theme,
      format: format,
      outputPath: tempPath,
      margins: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    });

    // Read the generated PDF
    const pdfBuffer = await fs.readFile(tempPath);

    // Clean up temp file
    await fs.remove(tempPath);

    // Generate filename
    const filename = generatePersonalizedFilename(parsed.metadata);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);

    console.log(chalk.green(`✓ PDF generated: ${filename}`));
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Generate and download Word document
app.post('/api/export/word', async (req, res) => {
  try {
    const { markdown, theme = 'modern', customization } = req.body;

    if (!markdown) {
      return res.status(400).json({ error: 'Markdown content is required' });
    }

    console.log(`Generating Word document with theme: ${theme}`);

    // Parse markdown
    const parsed = parser.parse(markdown);

    // Import Word renderer and converter
    const { WordRenderer } = await import('./word-renderer');
    const { HTMLRenderer } = await import('./html-renderer');

    const wordRenderer = new WordRenderer();
    const htmlRenderer = new HTMLRenderer();

    // Render to HTML first using the correct method name
    const htmlContent = await htmlRenderer.render(parsed, theme);

    // Convert HTML to Word document buffer
    const wordBuffer = await wordRenderer.renderToWord(
      htmlContent,
      parsed.metadata,
      {
        theme,
        customization,
      }
    );

    // Generate filename
    const baseName = parsed.metadata.name || 'resume';
    const cleanName = baseName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `${cleanName}.docx`;

    // Set response headers for Word document
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', wordBuffer.length);

    // Send Word document
    res.send(wordBuffer);

    console.log(chalk.green(`✓ Word document generated: ${filename}`));
  } catch (error) {
    console.error('Error generating Word document:', error);
    res.status(500).json({ error: 'Failed to generate Word document' });
  }
});

// Get sample resume
app.get('/api/sample', async (req, res) => {
  try {
    const samplePath = path.join(
      __dirname,
      '..',
      'examples',
      'sample-resume.md'
    );

    // Check if sample file exists
    if (await fs.pathExists(samplePath)) {
      const sampleContent = await fs.readFile(samplePath, 'utf-8');
      res.send(sampleContent);
    } else {
      // Fallback sample content
      const fallbackSample = `---
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
      res.send(fallbackSample);
    }
  } catch (error) {
    console.error('Error loading sample:', error);
    res.status(500).json({ error: 'Failed to load sample' });
  }
});

// Get theme customization options
app.get('/api/themes/:themeName/customization', async (req, res) => {
  try {
    // Ensure theme manager is initialized
    if (!themeManagerReady) {
      await cssThemeManager.initialize();
      themeManagerReady = true;
    }

    const { themeName } = req.params;
    const themeInfo = cssThemeManager.getThemeInfo(themeName);

    if (!themeInfo) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    res.json({
      customizable: themeInfo.customizable,
      primaryColor: themeInfo.primaryColor,
      options: themeInfo.customizable
        ? {
            primaryColor: {
              type: 'color',
              label: 'Primary Color',
              default: themeInfo.primaryColor,
            },
            secondaryColor: {
              type: 'color',
              label: 'Secondary Color',
              default: themeInfo.secondaryColor,
            },
            accentColor: {
              type: 'color',
              label: 'Accent Color',
              default: themeInfo.accentColor,
            },
          }
        : {},
    });
  } catch (error) {
    console.error('Error getting theme customization:', error);
    res.status(500).json({ error: 'Failed to get theme customization' });
  }
});

// Refresh themes (useful for detecting new theme files)
app.post('/api/themes/refresh', async (req, res) => {
  try {
    await cssThemeManager.refreshThemes();
    const themes = cssThemeManager.getAvailableThemes();
    res.json({ message: 'Themes refreshed', themes });
  } catch (error) {
    console.error('Error refreshing themes:', error);
    res.status(500).json({ error: 'Failed to refresh themes' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CVCraft API',
  });
});

// Export function to create server (for testing)
export async function createServer(): Promise<express.Application> {
  // Ensure theme manager is initialized
  if (!themeManagerReady) {
    await cssThemeManager.initialize();
    themeManagerReady = true;
  }
  return app;
}

// Start server when run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      chalk.blue(
        `🚀 ${config.getName()} API Server running on http://localhost:${PORT}`
      )
    );
    console.log(
      chalk.bgGreenBright(
        chalk.blackBright(
          `💻 API endpoints available at http://localhost:${PORT}/api`
        )
      )
    );
  });
}

export default app;

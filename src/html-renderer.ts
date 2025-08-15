/**
 * HTML renderer for preview server
 */

import { Theme, ParsedContent, ResumeMetadata } from './types';
import { ThemeManager } from './themes';

export class HTMLRenderer {
  private themeManager: ThemeManager;
  private initialized: boolean = false;

  constructor(themeManager?: ThemeManager) {
    this.themeManager = themeManager || new ThemeManager();
  }

  /**
   * Initialize the renderer with dynamic theme discovery
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.themeManager.initialize();
      this.initialized = true;
    }
  }

  /**
   * Render parsed content to HTML with live preview styling
   */
  async render(
    content: ParsedContent,
    themeName: string = 'modern'
  ): Promise<string> {
    // Ensure themes are loaded
    await this.initialize();

    const theme = this.themeManager.getTheme(themeName);
    return this.generateHTML(content, theme);
  }

  /**
   * Generate complete HTML document with styling
   */
  private generateHTML(content: ParsedContent, theme: Theme): string {
    const css = this.generateCSS(theme);
    const title =
      content.metadata.name || content.metadata.title || 'Resume Preview';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        ${css}
    </style>
    <script>
        // WebSocket for hot reloading
        const ws = new WebSocket('ws://localhost:3001');
        ws.onmessage = function(event) {
            if (event.data === 'reload') {
                location.reload();
            }
        };
        ws.onclose = function() {
            // Try to reconnect after 1 second
            setTimeout(() => {
                location.reload();
            }, 1000);
        };
    </script>
</head>
<body>
    <div class="resume-container">
        ${this.renderHeader(content.metadata, theme)}
        <div class="content">
            ${content.html}
        </div>
    </div>
    
    <!-- Theme selector for live preview -->
    <div class="theme-selector" style="display:none;">
        <label>Theme: </label>
        <select onchange="changeTheme(this.value)">
            <option value="modern">Modern</option>
            <option value="classic">Classic</option>
            <option value="minimal">Minimal</option>
        </select>
    </div>
    
    <script>
        function changeTheme(theme) {
            fetch('/api/theme/' + theme, { method: 'POST' })
                .then(() => location.reload());
        }
    </script>
</body>
</html>`;
  }

  /**
   * Generate CSS from theme
   */
  private generateCSS(theme: Theme): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: ${theme.fonts.body};
            font-size: ${theme.sizes.body};
            line-height: ${theme.spacing.lineHeight};
            color: ${theme.colors.text};
            background-color: #f5f5f5;
        }

        .resume-container {
            max-width: 800px;
            margin: 0 auto;
            padding: ${theme.spacing.padding};
            background-color: ${theme.colors.background};
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            border-radius: 8px;
            min-height: 1000px;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid ${theme.colors.primary};
        }

        .header h1 {
            font-size: ${theme.sizes.h1};
            color: ${theme.colors.primary};
            margin-bottom: 10px;
            font-weight: bold;
        }

        .header .contact-info {
            font-size: ${theme.sizes.small};
            color: ${theme.colors.secondary};
            margin-top: 10px;
        }

        .header .contact-info span,
        .header .contact-info a,
        .header .contact-info .phone-contact {
            margin: 0 15px;
            color: inherit;
            text-decoration: none;
        }
        
        .header .contact-info a:hover {
            text-decoration: underline;
        }

        .content h1 {
            font-size: ${theme.sizes.h1};
            color: ${theme.colors.primary};
            font-family: ${theme.fonts.heading};
            margin: 25px 0 15px 0;
            font-weight: bold;
        }

        .content h2 {
            font-size: ${theme.sizes.h2};
            color: ${theme.colors.primary};
            font-family: ${theme.fonts.heading};
            margin: 20px 0 12px 0;
            font-weight: bold;
            border-bottom: 1px solid ${theme.colors.secondary};
            padding-bottom: 5px;
        }

        .content h3 {
            font-size: ${theme.sizes.h3};
            color: ${theme.colors.secondary};
            font-family: ${theme.fonts.heading};
            margin: 15px 0 8px 0;
            font-weight: bold;
        }

        .content p {
            margin-bottom: 12px;
            text-align: justify;
        }

        .content ul, .content ol {
            margin: 12px 0;
            padding-left: 25px;
        }

        .content li {
            margin-bottom: 6px;
        }

        .content strong {
            color: ${theme.colors.primary};
            font-weight: bold;
        }

        .content em {
            color: ${theme.colors.secondary};
            font-style: italic;
        }

        .content a {
            color: ${theme.colors.accent};
            text-decoration: none;
        }

        .content a:hover {
            text-decoration: underline;
        }

        .content code {
            font-family: ${theme.fonts.monospace};
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 0.9em;
        }

        .content pre {
            background-color: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            overflow-x: auto;
        }

        .content pre code {
            background-color: transparent;
            padding: 0;
        }

        .content table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }

        .content th, .content td {
            border: 1px solid ${theme.colors.secondary};
            padding: 8px 12px;
            text-align: left;
        }

        .content th {
            background-color: ${theme.colors.primary};
            color: white;
            font-weight: bold;
        }

        .content blockquote {
            border-left: 4px solid ${theme.colors.accent};
            padding-left: 20px;
            margin: 15px 0;
            font-style: italic;
            color: ${theme.colors.secondary};
        }

        /* Theme selector */
        .theme-selector {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
        }

        .theme-selector select {
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 3px;
        }

        /* Print styles */
        @media print {
            body {
                background-color: white;
                padding: 0;
            }
            
            .resume-container {
                box-shadow: none;
                border-radius: 0;
            }
            
            .theme-selector {
                display: none;
            }
        }
    `;
  }

  /**
   * Render header section from metadata
   */
  private renderHeader(metadata: ResumeMetadata, _theme: Theme): string {
    if (!metadata.name && !metadata.title) {
      return '';
    }

    const name = metadata.name || metadata.title || '';
    const email = metadata.email || '';
    const phone = metadata.phone || '';
    const website = metadata.website || metadata.url || '';
    const location = metadata.location || metadata.address || '';

    // Create contact info with appropriate links
    const contactItems = [];

    if (email) {
      contactItems.push(`<a href="mailto:${email}">${email}</a>`);
    }
    if (phone) {
      contactItems.push(
        `<a class="phone-contact" href="tel:${phone}">${phone}</a>`
      );
    }
    if (website) {
      const url = website.startsWith('http') ? website : `https://${website}`;
      const displayText = website.replace(/^https?:\/\//, '');
      contactItems.push(`<a href="${url}" target="_blank">${displayText}</a>`);
    }
    if (location) {
      contactItems.push(`<span>${location}</span>`);
    }

    const contactInfo = contactItems.join('');

    return `
        <div class="header">
            <h1>${name}</h1>
            ${
              contactInfo
                ? `<div class="contact-info">${contactInfo}</div>`
                : ''
            }
        </div>
    `;
  }
}

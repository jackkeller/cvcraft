# CVCraft - Markdown Resume to PDF & Word Converter

> **A markdown-to-PDF and Word converter with live preview, customizable themes, ATS optimization, and a modern web interface.**

CVCraft transforms your markdown resume into beautifully formatted PDFs and Word documents (.docx) with real-time preview, dynamic theming, and professional styling optimized for Applicant Tracking Systems (ATS). Built with TypeScript and modern web technologies.

## Features

### **Web Interface**

- **Live markdown editor**
- **Real-time HTML preview** - See changes instantly as you type w/ ATS warnings
- **Theme switching** - Switch between themes with live preview
- **Auto-save & restore** - Never lose your work with localStorage persistence

### **Theme System**

- **Dynamic theme discovery** - Automatically detects custom `theme-*.css` files
- **Real-time color customization** - Live color picker with instant preview
- **User-extensible themes** - Drop in your own CSS theme files
- **Modern nested CSS** - Clean, maintainable theme structure

### **Professional PDF & Word Export**

- **High-quality PDFs** using Puppeteer with system Chrome
- **Word documents (.docx)** with perfect font consistency and ATS optimization
- **Theme-consistent output** - Both PDF and Word exports match web preview exactly
- **Custom color support** - Color customizations apply to all export formats
- **Personalized filenames** - Auto-generated from resume metadata
- **Multiple formats** - Letter, A4, and custom page sizes

### **ATS (Applicant Tracking System) Compatibility**

- **ATS-optimized theme** - Clean, minimal styling for maximum compatibility
- **Consistent fonts** - Theme-based fonts applied throughout Word documents
- **Semantic HTML structure** - Proper heading hierarchy and content organization
- **Clean Word export** - No CSS artifacts or formatting issues in .docx files

### **Developer Experience**

- **TypeScript** - Full type safety and modern development
- **Comprehensive testing** - 44+ passing tests with decent coverage
- **Modern tooling** - Vite, Bun, ESM modules
- **CLI & Web Interface** - Use however you prefer

## Installation

### Package Manager Compatibility

**CVCraft** works with any package manager:

```bash
# npm
npm install -g cvcraft

# yarn
yarn global add cvcraft

# pnpm
pnpm add -g cvcraft

# bun (recommended for performance)
bun add -g cvcraft
```

## Usage

### Web Interface (Recommended)

Start the modern web interface with live preview:

```bash
# Using bun (recommended)
bun run web

# Using npm/yarn/pnpm - replace 'bunx' with 'npx'/'yarn dlx'/'pnpm dlx'
npm run web
```

Then open http://localhost:5173 for the full experience:

- ✅ Live markdown editing with preview
- ✅ Real-time theme switching and customization
- ✅ Instant PDF and Word document generation and download
- ✅ ATS compatibility warnings and optimization tips
- ✅ Auto-save and restore functionality

### Command Line Interface

```bash
# Convert markdown to PDF
cvcraft convert resume.md resume.pdf

# Convert markdown to Word document (.docx)
cvcraft convert resume.md resume.docx --format word

# Use specific theme (works for both PDF and Word)
cvcraft convert resume.md resume.pdf --theme ats
cvcraft convert resume.md resume.docx --format word --theme ats

# Custom format and margins (PDF only)
cvcraft convert resume.md resume.pdf --format Letter --margin-top 15mm

# List available themes
cvcraft themes

# Create sample resume template
cvcraft init my-resume.md
```

### Theme System

**CVCraft** features a robust CSS-based theme system:

#### Built-in Themes

- **Modern** - Clean, contemporary design with blue accents and gradients
- **Classic** - Traditional serif fonts with professional styling
- **Minimal** - Simple, clean layout with maximum readability
- **ATS** - Optimized for Applicant Tracking Systems with maximum compatibility

#### Custom Themes

Create your own themes by adding CSS files to the `themes/` folder:

```css
/* themes/theme-mycustomtheme.css */
:root {
  --theme-primary: #1a365d;
  --theme-secondary: #2d3748;
  --theme-background: #ffffff;
  /* ... more variables */
}

.header {
  h1 {
    font-size: 2.5rem;
    color: var(--theme-primary);
  }
}
```

#### Color Customization

Use the web interface to customize theme colors in real-time:

- Live color picker with instant preview
- Custom colors apply to both web preview and PDF export
- Settings automatically saved to localStorage

### Development Setup

#### For Contributors

```bash
# Clone the repository
git clone https://github.com/jackkeller/cvcraft.git
cd cvcraft

# Install dependencies (we recommend bun for performance)
bun install
# or: npm install / yarn / pnpm install

# Start development servers
bun run web        # Web interface + API server
bun run api        # API server only
bun run web:dev    # Vite dev server only

# Run tests
bun run test       # Watch mode
bun run test:run   # Single run
bun run coverage   # With coverage report

# Build for production
bun run build      # Build everything
bun run build:lib  # Build library only
bun run build:web  # Build web interface only
```

#### Package Manager Compatibility

For development, we use Bun for performance, but you can use any package manager:

```bash
# Replace 'bunx' with your preferred tool:
# npm users: replace 'bunx' with 'npx'
# yarn users: replace 'bunx' with 'yarn dlx'
# pnpm users: replace 'bunx' with 'pnpm dlx'

# Example for pnpm users:
"web:dev": "pnpm dlx vite"
"web:build": "pnpm dlx vite build"
```

## Architecture

CVCraft is built with modern technologies:

- **Frontend**: TypeScript + Vite + Vanilla JavaScript
- **Backend**: Node.js + Express + TypeScript
- **PDF Generation**: Puppeteer-core with system Chrome
- **Word Export**: docx library with custom HTML parser for clean .docx output
- **Theme System**: CSS-based with CSS variables and dynamic discovery
- **ATS Optimization**: Semantic HTML structure and font consistency
- **Testing**: Vitest with comprehensive coverage
- **Build**: TypeScript compiler + Vite bundler

## Project Structure

```bash
cvcraft/
├── src/                     # Core library code
│   ├── api-server.ts        # Express API server
│   ├── cli.ts               # Command-line interface
│   ├── config.ts            # Configuration management
│   ├── converter.ts         # Format conversion utilities
│   ├── css-theme-manager.ts # Dynamic theme discovery
│   ├── html-renderer.ts     # HTML generation
│   ├── parser.ts            # Markdown parser
│   ├── renderer.ts          # PDF renderer (Puppeteer)
│   ├── themes.ts            # Theme management
│   ├── types.ts             # TypeScript type definitions
│   ├── word-converter.ts    # Word document conversion
│   ├── word-renderer.ts     # Word document generation
│   └── index.ts             # Library exports
├── web/                     # Web interface
│   ├── main.ts              # Web app logic
│   ├── index.html           # Web app HTML
│   ├── styles.css           # Web app styles
│   ├── ats-warnings.css     # ATS warnings styles
├── themes/                  # CSS theme files
│   ├── theme-modern.css     # Modern professional theme
│   ├── theme-classic.css    # Traditional serif theme
│   ├── theme-minimal.css    # Clean minimal theme
│   └── theme-ats.css        # ATS-optimized theme
├── samples/                 # Example files
│   ├── resume-sample.md     # Sample resume content
│   └── theme-sample.css     # Theme template for users
├── tests/                   # Test suite
├── dist/                    # Built output
└── coverage/                # Test coverage reports
```

### Development Guidelines

- **TypeScript** - All code should be properly typed
- **Tests** - Add tests for new features
- **CSS Themes** - Follow existing theme structure for new themes
- **Documentation** - Update README for significant changes

## Examples

### Sample Resume Markdown

```markdown
---
name: 'Jane Smith'
email: 'jane@example.com'
phone: '555-123-4567'
website: 'https://janesmith.dev'
---

## Experience

**Senior Software Engineer** | Tech Corp | 2021-2024

- Led development of microservices architecture
- Mentored junior developers and conducted code reviews
- Improved system performance by 40%

**Software Engineer** | StartupCo | 2019-2021

- Built responsive web applications using React and Node.js
- Collaborated with design team on user experience improvements

## Skills

- **Languages**: JavaScript, TypeScript, Python, Go
- **Frameworks**: React, Node.js, Express, Next.js
- **Tools**: Docker, Kubernetes, AWS, Git
```

### **Important Formatting Note**

**Experience blocks use single line breaks intentionally** to improve export formatting in both PDF and Word documents. This ensures proper spacing and prevents awkward page breaks or formatting issues in exported files. Each job experience should be separated by a single blank line for optimal results.

## Troubleshooting

### Common Issues

**PDF generation fails:**

- Ensure Chrome/Chromium is installed on your system
- Check that port 3001 is available for the API server

**Themes not loading:**

- Verify theme files are in the `themes/` folder
- Check that theme files follow the `theme-*.css` naming convention

**Web interface not starting:**

- Ensure ports 5173 and 3001 are available
- Try `bun run api` separately to isolate issues

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with ❤️ using:

- [Puppeteer](https://pptr.dev/) for PDF generation
- [Vite](https://vitejs.dev/) for modern build tooling
- [Vitest](https://vitest.dev/) for testing
- [Bun](https://bun.sh/) for fast package management

---

**Made with ❤️ by developers, for developers. Create beautiful resumes with the power of markdown and modern web technologies.**

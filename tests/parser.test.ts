import { describe, it, expect } from 'vitest';
import { MarkdownParser } from '../src/parser';

describe('MarkdownParser', () => {
  const parser = new MarkdownParser();

  describe('parseMarkdown', () => {
    it('should parse basic markdown content', () => {
      const markdown = '# Hello World\n\nThis is a test.';
      const result = parser.parse(markdown);

      expect(result.html).toContain('<h1>Hello World</h1>');
      expect(result.html).toContain('<p>This is a test.</p>');
      expect(result.metadata).toEqual({});
    });

    it('should extract front matter metadata', () => {
      const markdown = `---
name: John Doe
email: john@example.com
phone: 555-123-4567
---

# Resume

Content here.`;

      const result = parser.parse(markdown);

      expect(result.metadata).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
      });
      expect(result.html).toContain('<h1>Resume</h1>');
      expect(result.html).not.toContain('---');
    });

    it('should handle markdown without front matter', () => {
      const markdown = '# No Front Matter\n\nJust content.';
      const result = parser.parse(markdown);

      expect(result.metadata).toEqual({});
      expect(result.html).toContain('<h1>No Front Matter</h1>');
    });

    it('should parse lists correctly', () => {
      const markdown = `- Item 1
- Item 2
- Item 3`;

      const result = parser.parse(markdown);

      expect(result.html).toContain('<ul>');
      expect(result.html).toContain('<li>Item 1</li>');
      expect(result.html).toContain('<li>Item 2</li>');
      expect(result.html).toContain('<li>Item 3</li>');
    });

    it('should parse code blocks', () => {
      const markdown = '```javascript\nconst x = 1;\n```';
      const result = parser.parse(markdown);

      expect(result.html).toContain('<pre>');
      expect(result.html).toContain('<code');
      expect(result.html).toContain('const x = 1;');
    });

    it('should handle empty content', () => {
      const result = parser.parse('');

      expect(result.html).toBe('');
      expect(result.metadata).toEqual({});
    });

    it('should parse tables correctly', () => {
      const markdown = `| Name | Role |
|------|------|
| John | Developer |
| Jane | Designer |`;

      const result = parser.parse(markdown);

      expect(result.html).toContain('<table>');
      expect(result.html).toContain('<th>Name</th>');
      expect(result.html).toContain('<td>John</td>');
    });
  });

  describe('sections parsing', () => {
    it('should parse markdown into sections', () => {
      const markdown = `# Header 1

Some content.

## Header 2

- Item 1
- Item 2`;
      const result = parser.parse(markdown);

      expect(result.sections).toBeDefined();
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('should handle empty sections gracefully', () => {
      const markdown = '';
      const result = parser.parse(markdown);

      expect(result.sections).toBeDefined();
      expect(Array.isArray(result.sections)).toBe(true);
    });
  });
});

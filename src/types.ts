/**
 * Type definitions for CVCraft
 */

export interface Theme {
  name: string;
  fonts: {
    body: string;
    heading: string;
    monospace: string;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
    accent: string;
  };
  spacing: {
    margin: string;
    padding: string;
    lineHeight: number;
  };
  sizes: {
    h1: string;
    h2: string;
    h3: string;
    body: string;
    small: string;
  };
}

export interface ResumeMetadata {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  website?: string;
  location?: string;
  [key: string]: string | undefined; // Allow additional properties
}

export interface ParsedContent {
  html: string;
  metadata: ResumeMetadata;
  sections: Section[];
}

export interface Section {
  type: 'header' | 'paragraph' | 'list' | 'table' | 'code';
  content: string;
  level?: number;
  items?: string[];
}

export interface ConversionOptions {
  theme?: string | Theme;
  outputPath: string;
  format?: 'A4' | 'Letter';
  margins?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
}

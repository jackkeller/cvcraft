/**
 * CVCraft Web Application - Vite/TypeScript Version
 */

interface ToastOptions {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ThemeInfo {
  name: string;
  displayName: string;
  cssPath: string;
  customizable: boolean;
  primaryColor?: string;
}

interface ThemeCustomization {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

interface CustomizationOption {
  type: string;
  label: string;
  default?: string;
}

interface ATSWarning {
  type: 'error' | 'warning' | 'info';
  message: string;
  suggestion: string;
}

class CVCraftApp {
  private editor: HTMLTextAreaElement;
  private currentTheme: string = 'modern';
  private debounceTimer: number | null = null;
  private saveTimer: number | null = null;
  private previewContent: HTMLElement;
  private availableThemes: ThemeInfo[] = [];
  private currentCustomization: ThemeCustomization = {};
  private customizationModal: HTMLElement;
  private atsWarningsContainer: HTMLElement;

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    this.setupEditor();
    this.setupModal();
    this.setupEventListeners();
    await this.loadThemes();
    this.restoreFromLocalStorage();
    this.updatePreview();
  }

  setupEditor(): void {
    this.editor = document.getElementById(
      'markdown-editor'
    ) as HTMLTextAreaElement;
    this.previewContent = document.getElementById(
      'preview-content'
    ) as HTMLElement;

    if (!this.editor || !this.previewContent) {
      console.error('Required elements not found');
      return;
    }

    // Live preview on editor change
    this.editor.addEventListener('input', () => {
      this.debouncePreview();
      this.debounceSave();
    });

    // Auto-resize textarea
    this.editor.addEventListener('input', this.autoResize.bind(this));
    this.autoResize();
  }

  setupModal(): void {
    this.customizationModal = document.getElementById(
      'theme-customization-modal'
    ) as HTMLElement;

    if (!this.customizationModal) {
      console.error('Theme customization modal not found');
      return;
    }
  }

  autoResize(): void {
    this.editor.style.height = 'auto';
    this.editor.style.height = this.editor.scrollHeight + 'px';
  }

  setupEventListeners(): void {
    // Load sample button
    const loadSampleBtn = document.getElementById('load-sample-btn');
    loadSampleBtn?.addEventListener('click', () => this.loadSample());

    // Clear button
    const clearBtn = document.getElementById('clear-btn');
    clearBtn?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the editor?')) {
        this.editor.value = '';
        this.updatePreview();
        this.saveToLocalStorage();
      }
    });

    // Clear saved button
    const clearSavedBtn = document.getElementById('clear-saved-btn');
    clearSavedBtn?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all saved data?')) {
        this.clearSavedData();
      }
    });

    // Theme selector
    const themeSelector = document.getElementById(
      'theme-selector'
    ) as HTMLSelectElement;
    themeSelector?.addEventListener('change', e => {
      const target = e.target as HTMLSelectElement;
      this.currentTheme = target.value;
      this.updateThemeCustomizationButton();
      this.updatePreview();
      this.saveToLocalStorage();
    });

    // Customize theme button
    const customizeThemeBtn = document.getElementById('customize-theme-btn');
    customizeThemeBtn?.addEventListener('click', () =>
      this.openThemeCustomization()
    );

    // Refresh themes button
    const refreshThemesBtn = document.getElementById('refresh-themes-btn');
    refreshThemesBtn?.addEventListener('click', () => this.refreshThemes());

    // Modal event listeners
    const closeModalBtn = document.getElementById('close-modal-btn');
    closeModalBtn?.addEventListener('click', () =>
      this.closeThemeCustomization()
    );

    const resetCustomizationBtn = document.getElementById(
      'reset-customization-btn'
    );
    resetCustomizationBtn?.addEventListener('click', () =>
      this.resetCustomization()
    );

    const applyCustomizationBtn = document.getElementById(
      'apply-customization-btn'
    );
    applyCustomizationBtn?.addEventListener('click', () =>
      this.applyCustomization()
    );

    // Close modal when clicking outside
    this.customizationModal?.addEventListener('click', e => {
      if (e.target === this.customizationModal) {
        this.closeThemeCustomization();
      }
    });

    // Generate PDF button
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    generatePdfBtn?.addEventListener('click', () => this.generatePDF());

    // Generate Word button
    const generateWordBtn = document.getElementById('generate-word-btn');
    generateWordBtn?.addEventListener('click', () => this.generateWord());
  }

  debouncePreview(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.updatePreview();
    }, 300);
  }

  debounceSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = window.setTimeout(() => {
      this.saveToLocalStorage();
    }, 1000);
  }

  async updatePreview(): Promise<void> {
    try {
      const markdown = this.editor.value;

      if (!markdown.trim()) {
        this.previewContent.innerHTML = `
          <div class="empty-state">
            <h2>Start typing to see your resume preview</h2>
            <p>Your markdown will be rendered here in real-time</p>
          </div>
        `;
        return;
      }

      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markdown,
          theme: this.currentTheme,
          customization: this.currentCustomization,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();

      // Extract both CSS and body content to preserve theme styling
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Get the CSS styles from the head
      const styleElements = doc.head.querySelectorAll('style');
      let cssContent = '';
      styleElements.forEach(style => {
        cssContent += style.textContent || '';
      });

      // Get the body content
      const bodyContent = doc.body.innerHTML;

      // Create a complete HTML structure with styles preserved
      const styledContent = `
        <style>${cssContent}</style>
        <div class="resume-container">
          ${bodyContent}
        </div>
      `;

      // Update preview content with both styles and content
      this.previewContent.innerHTML = styledContent;

      // Analyze and display ATS warnings
      const atsWarnings = this.analyzeATSCompatibility(this.editor.value);
      this.displayATSWarnings(atsWarnings);
    } catch (error) {
      console.error('Preview update failed:', error);
      this.previewContent.innerHTML = `
        <div class="empty-state">
          <h2>Preview Error</h2>
          <p>Failed to render preview. Please check your markdown syntax.</p>
        </div>
      `;
      this.showToast({
        message: 'Failed to update preview',
        type: 'error',
      });
    }
  }

  async loadThemes(): Promise<void> {
    try {
      const response = await fetch('/api/themes');
      this.availableThemes = await response.json();

      const themeSelector = document.getElementById(
        'theme-selector'
      ) as HTMLSelectElement;
      if (themeSelector) {
        themeSelector.innerHTML = '';
        this.availableThemes.forEach((theme: ThemeInfo) => {
          const option = document.createElement('option');
          option.value = theme.name;
          option.textContent = theme.displayName;
          themeSelector.appendChild(option);
        });
        themeSelector.value = this.currentTheme;
      }

      this.updateThemeCustomizationButton();

      this.showToast({
        message: `Loaded ${this.availableThemes.length} themes`,
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to load themes:', error);
      this.showToast({
        message: 'Failed to load themes',
        type: 'error',
      });
    }
  }

  async loadSample(): Promise<void> {
    try {
      const response = await fetch('/api/sample');
      const sampleMarkdown = await response.text();

      this.editor.value = sampleMarkdown;
      this.autoResize();
      this.updatePreview();
      this.saveToLocalStorage();

      this.showToast({
        message: 'Sample resume loaded',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to load sample:', error);
      this.showToast({
        message: 'Failed to load sample resume',
        type: 'error',
      });
    }
  }

  async generatePDF(): Promise<void> {
    const btn = document.getElementById('generate-pdf-btn');
    const btnText = btn?.querySelector('.btn-text');
    const btnLoading = btn?.querySelector('.btn-loading');

    if (!btn || !btnText || !btnLoading) return;

    try {
      // Show loading state
      btn.setAttribute('disabled', 'true');
      (btnText as HTMLElement).style.display = 'none';
      (btnLoading as HTMLElement).style.display = 'inline';

      const markdown = this.editor.value;
      const formatSelector = document.getElementById(
        'format-selector'
      ) as HTMLSelectElement;
      const format = formatSelector?.value || 'Letter';

      // Generate filename from markdown
      const filename = this.generateFilename(markdown);

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markdown,
          theme: this.currentTheme,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      this.showToast({
        message: `PDF generated: ${filename}`,
        type: 'success',
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      this.showToast({
        message: 'Failed to generate PDF',
        type: 'error',
      });
    } finally {
      // Reset button state
      btn.removeAttribute('disabled');
      (btnText as HTMLElement).style.display = 'inline';
      (btnLoading as HTMLElement).style.display = 'none';
    }
  }

  async generateWord(): Promise<void> {
    const btn = document.getElementById(
      'generate-word-btn'
    ) as HTMLButtonElement;
    const btnText = btn.querySelector('.btn-text') as HTMLElement;
    const btnLoading = btn.querySelector('.btn-loading') as HTMLElement;

    if (!btn || !btnText || !btnLoading) {
      console.error('Word export button elements not found');
      return;
    }

    try {
      // Set button state
      btn.setAttribute('disabled', 'true');
      btnText.style.display = 'none';
      btnLoading.style.display = 'inline';

      const markdown = this.editor.value.trim();
      if (!markdown) {
        throw new Error('Please enter some content first');
      }

      // Generate filename
      const filename = this.generateWordFilename(markdown);

      console.log('Generating Word document...');

      const response = await fetch('/api/export/word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markdown,
          theme: this.currentTheme,
          customization: this.currentCustomization,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Download the Word document
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      this.showToast({
        message: `Word document generated: ${filename}`,
        type: 'success',
      });
    } catch (error) {
      console.error('Word generation failed:', error);
      this.showToast({
        message: 'Failed to generate Word document',
        type: 'error',
      });
    } finally {
      // Reset button state
      btn.removeAttribute('disabled');
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
    }
  }

  generateWordFilename(markdown: string): string {
    try {
      // Extract front matter
      const frontMatterMatch = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
      if (frontMatterMatch) {
        // Look for name field
        const nameMatch = frontMatterMatch[1].match(/^name:\s*(.+)$/m);
        if (nameMatch) {
          const name = nameMatch[1].trim();
          // Clean the name for filename
          const cleanName = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

          if (cleanName) {
            const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            return `resume-${cleanName}-${date}.docx`;
          }
        }
      }

      // Fallback to timestamp-based filename
      const timestamp = Date.now();
      return `resume-${timestamp}.docx`;
    } catch (error) {
      console.error('Error generating Word filename:', error);
      return `resume-${Date.now()}.docx`;
    }
  }

  generateFilename(markdown: string): string {
    try {
      console.log('Generating filename from markdown...');

      // Extract front matter
      const frontMatterMatch = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
      if (frontMatterMatch) {
        console.log('Front matter found:', frontMatterMatch[1]);

        // Look for name field
        const nameMatch = frontMatterMatch[1].match(/^name:\s*(.+)$/m);
        if (nameMatch) {
          const name = nameMatch[1].trim();
          console.log('Name extracted:', name);

          // Clean the name for filename
          const cleanName = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

          console.log('Clean name:', cleanName);

          if (cleanName) {
            const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const filename = `resume-${cleanName}-${date}.pdf`;
            console.log('Final filename:', filename);
            return filename;
          }
        }
      }

      // Fallback to timestamp-based filename
      const timestamp = Date.now();
      const fallbackFilename = `resume-${timestamp}.pdf`;
      console.log('Generated filename:', fallbackFilename);
      return fallbackFilename;
    } catch (error) {
      console.error('Error generating filename:', error);
      return `resume-${Date.now()}.pdf`;
    }
  }

  updateThemeCustomizationButton(): void {
    const customizeBtn = document.getElementById(
      'customize-theme-btn'
    ) as HTMLElement;
    const currentThemeInfo = this.availableThemes.find(
      t => t.name === this.currentTheme
    );

    if (customizeBtn && currentThemeInfo) {
      if (currentThemeInfo.customizable) {
        customizeBtn.style.display = 'inline-flex';
      } else {
        customizeBtn.style.display = 'none';
      }
    }
  }

  async refreshThemes(): Promise<void> {
    try {
      await fetch('/api/themes/refresh', { method: 'POST' });
      await this.loadThemes();
      this.showToast({
        message: 'Themes refreshed successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to refresh themes:', error);
      this.showToast({
        message: 'Failed to refresh themes',
        type: 'error',
      });
    }
  }

  async openThemeCustomization(): Promise<void> {
    const currentThemeInfo = this.availableThemes.find(
      t => t.name === this.currentTheme
    );
    if (!currentThemeInfo || !currentThemeInfo.customizable) {
      this.showToast({
        message: 'This theme is not customizable',
        type: 'info',
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/themes/${this.currentTheme}/customization`
      );
      const customizationInfo = await response.json();

      this.renderCustomizationOptions(customizationInfo);
      this.customizationModal.style.display = 'flex';
    } catch (error) {
      console.error('Failed to load theme customization:', error);
      this.showToast({
        message: 'Failed to load theme customization',
        type: 'error',
      });
    }
  }

  closeThemeCustomization(): void {
    this.customizationModal.style.display = 'none';
  }

  renderCustomizationOptions(customizationInfo: {
    options?: Record<string, CustomizationOption>;
  }): void {
    const optionsContainer = document.getElementById('customization-options');
    if (!optionsContainer) return;

    optionsContainer.innerHTML = '';

    Object.entries(customizationInfo.options || {}).forEach(
      ([key, option]: [string, CustomizationOption]) => {
        if (option.type === 'color') {
          const optionDiv = document.createElement('div');
          optionDiv.className = 'customization-option';

          const currentValue =
            this.currentCustomization[key as keyof ThemeCustomization] ||
            option.default ||
            '#3b82f6';

          optionDiv.innerHTML = `
          <label>${option.label}</label>
          <div class="color-input-group">
            <input type="color" class="color-input" data-key="${key}" value="${currentValue}">
            <input type="text" class="color-value" data-key="${key}" value="${currentValue}">
            <div class="color-preview" style="background-color: ${currentValue}"></div>
          </div>
        `;

          optionsContainer.appendChild(optionDiv);

          // Add event listeners for color inputs
          const colorInput = optionDiv.querySelector(
            '.color-input'
          ) as HTMLInputElement;
          const textInput = optionDiv.querySelector(
            '.color-value'
          ) as HTMLInputElement;
          const preview = optionDiv.querySelector(
            '.color-preview'
          ) as HTMLElement;

          colorInput.addEventListener('input', e => {
            const value = (e.target as HTMLInputElement).value;
            textInput.value = value;
            preview.style.backgroundColor = value;
          });

          textInput.addEventListener('input', e => {
            const value = (e.target as HTMLInputElement).value;
            if (/^#[0-9A-F]{6}$/i.test(value)) {
              colorInput.value = value;
              preview.style.backgroundColor = value;
            }
          });
        }
      }
    );
  }

  resetCustomization(): void {
    this.currentCustomization = {};
    this.updatePreview();
    this.saveToLocalStorage();
    this.closeThemeCustomization();
    this.showToast({
      message: 'Theme customization reset to default',
      type: 'success',
    });
  }

  applyCustomization(): void {
    const optionsContainer = document.getElementById('customization-options');
    if (!optionsContainer) return;

    const colorInputs = optionsContainer.querySelectorAll('.color-input');
    const newCustomization: ThemeCustomization = {};

    colorInputs.forEach(input => {
      const key = (input as HTMLInputElement).dataset.key;
      const value = (input as HTMLInputElement).value;
      if (key) {
        newCustomization[key as keyof ThemeCustomization] = value;
      }
    });

    this.currentCustomization = newCustomization;
    this.updatePreview();
    this.saveToLocalStorage();
    this.closeThemeCustomization();

    this.showToast({
      message: 'Theme customization applied',
      type: 'success',
    });
  }

  saveToLocalStorage(): void {
    try {
      const data = {
        markdown: this.editor.value,
        theme: this.currentTheme,
        customization: this.currentCustomization,
        timestamp: Date.now(),
      };
      localStorage.setItem('cvcraft-editor-data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  /**
   * Analyze resume content for ATS compatibility
   */
  analyzeATSCompatibility(content: string): ATSWarning[] {
    const warnings: ATSWarning[] = [];

    // Check for contact information
    const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(
      content
    );
    const hasPhone = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(content);

    if (!hasEmail) {
      warnings.push({
        type: 'error',
        message: 'Missing email address',
        suggestion:
          'Add your email address in the header section for ATS parsing',
      });
    }

    if (!hasPhone) {
      warnings.push({
        type: 'warning',
        message: 'Missing or invalid phone number',
        suggestion:
          'Add your phone number in a standard format (e.g., 555-123-4567)',
      });
    }

    // Check for standard sections
    const hasExperience = /^#+\s*(experience|work|employment)/im.test(content);
    const hasEducation = /^#+\s*(education|school|university)/im.test(content);
    const hasSkills = /^#+\s*(skills|technical|competencies)/im.test(content);

    if (!hasExperience) {
      warnings.push({
        type: 'warning',
        message: 'Missing Experience section',
        suggestion: 'Add an "## Experience" section with your work history',
      });
    }

    if (!hasEducation) {
      warnings.push({
        type: 'info',
        message: 'Missing Education section',
        suggestion: 'Consider adding an "## Education" section (if applicable)',
      });
    }

    if (!hasSkills) {
      warnings.push({
        type: 'info',
        message: 'Missing Skills section',
        suggestion:
          'Add a "## Skills" section to highlight your technical abilities (if applicable)',
      });
    }

    // Check for problematic characters or formatting
    if (
      content.includes('•') ||
      content.includes('→') ||
      content.includes('★')
    ) {
      warnings.push({
        type: 'warning',
        message: 'Special characters detected',
        suggestion:
          'Replace special bullets (•, →, ★) with simple dashes (-) for better ATS parsing',
      });
    }

    // Check for proper date formats
    const datePattern =
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\b/gi;
    const standardDates = content.match(datePattern);
    const nonStandardDates = /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(content);

    if (nonStandardDates && !standardDates) {
      warnings.push({
        type: 'info',
        message: 'Non-standard date format detected',
        suggestion:
          'Use "Month YYYY" format (e.g., "January 2023") for better ATS compatibility',
      });
    }

    return warnings;
  }

  /**
   * Display ATS warnings in the UI
   */
  displayATSWarnings(warnings: ATSWarning[]): void {
    if (!this.atsWarningsContainer) {
      this.setupATSWarningsContainer();
    }

    this.atsWarningsContainer.innerHTML = '';

    if (warnings.length === 0) {
      this.atsWarningsContainer.innerHTML = `
        <div class="ats-warning ats-success">
          <strong>✓ ATS Optimized</strong>
          <p>Your resume looks good for ATS systems!</p>
        </div>
      `;
      return;
    }

    warnings.forEach(warning => {
      const warningElement = document.createElement('div');
      warningElement.className = `ats-warning ats-${warning.type}`;
      warningElement.innerHTML = `
        <strong>${this.getWarningIcon(warning.type)} ${warning.message}</strong>
        <p>${warning.suggestion}</p>
      `;
      this.atsWarningsContainer.appendChild(warningElement);
    });
  }

  /**
   * Get icon for warning type
   */
  private getWarningIcon(type: string): string {
    switch (type) {
      case 'error':
        return '⚡';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  }

  /**
   * Setup ATS warnings container
   */
  private setupATSWarningsContainer(): void {
    this.atsWarningsContainer = document.createElement('div');
    this.atsWarningsContainer.id = 'ats-warnings';
    this.atsWarningsContainer.className = 'ats-warnings-container';

    // Insert after the editor
    const editorContainer = document.querySelector('.editor-container');
    if (editorContainer && editorContainer.parentNode) {
      editorContainer.parentNode.insertBefore(
        this.atsWarningsContainer,
        editorContainer.nextSibling
      );
    }
  }

  restoreFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('cvcraft-editor-data');
      if (saved) {
        const data = JSON.parse(saved);

        if (data.markdown) {
          this.editor.value = data.markdown;
          this.autoResize();
        }

        if (data.theme) {
          this.currentTheme = data.theme;
          const themeSelector = document.getElementById(
            'theme-selector'
          ) as HTMLSelectElement;
          if (themeSelector) {
            themeSelector.value = data.theme;
          }
        }

        if (data.customization) {
          this.currentCustomization = data.customization;
        }

        this.updateThemeCustomizationButton();

        if (data.timestamp) {
          const date = new Date(data.timestamp);
          this.showToast({
            message: `Work restored from ${date.toLocaleString()}`,
            type: 'success',
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Failed to restore from localStorage:', error);
    }
  }

  clearSavedData(): void {
    try {
      localStorage.removeItem('cvcraft-editor-data');
      this.showToast({
        message: 'Saved data cleared',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to clear saved data:', error);
    }
  }

  showToast({ message, type, duration = 5000 }: ToastOptions): void {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }, duration);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CVCraftApp();
});

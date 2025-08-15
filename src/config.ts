/**
 * Configuration management for CVCraft
 */

import * as fs from 'fs';
import * as path from 'path';

interface AppConfig {
  name: string;
  description: string;
  fullName: string;
  cliName: string;
  version: string;
  author: string;
  license: string;
  apiPort: number;
  webPort: number;
  nodeEnv: string;
}

class ConfigManager {
  private config: AppConfig;
  private envPath: string;

  constructor() {
    this.envPath = path.join(process.cwd(), '.env');
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    const defaults: AppConfig = {
      name: 'CVCraft',
      description: 'Markdown to PDF resume converter with theming support',
      fullName: 'CVCraft - Markdown Resume to PDF Converter',
      cliName: 'cvcraft',
      version: '1.0.0',
      author: 'Jack Keller, Claude Sonnet 4',
      license: 'MIT',
      apiPort: 3001,
      webPort: 5173,
      nodeEnv: 'development',
    };

    // Try to load .env file if it exists
    if (fs.existsSync(this.envPath)) {
      const envContent = fs.readFileSync(this.envPath, 'utf-8');
      const envVars = this.parseEnvFile(envContent);

      return {
        name: envVars.APP_NAME || defaults.name,
        description: envVars.APP_DESCRIPTION || defaults.description,
        fullName: envVars.APP_FULL_NAME || defaults.fullName,
        cliName: envVars.APP_CLI_NAME || defaults.cliName,
        version: envVars.APP_VERSION || defaults.version,
        author: envVars.APP_AUTHOR || defaults.author,
        license: envVars.APP_LICENSE || defaults.license,
        apiPort: parseInt(envVars.API_PORT || defaults.apiPort.toString()),
        webPort: parseInt(envVars.WEB_PORT || defaults.webPort.toString()),
        nodeEnv: envVars.NODE_ENV || defaults.nodeEnv,
      };
    }

    return defaults;
  }

  private parseEnvFile(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          result[key.trim()] = valueParts.join('=').trim();
        }
      }
    }

    return result;
  }

  public get(): AppConfig {
    return { ...this.config };
  }

  public getName(): string {
    return this.config.name;
  }

  public getFullName(): string {
    return this.config.fullName;
  }

  public getDescription(): string {
    return this.config.description;
  }

  public getCliName(): string {
    return this.config.cliName;
  }

  public getVersion(): string {
    return this.config.version;
  }

  public getAuthor(): string {
    return this.config.author;
  }

  public getLicense(): string {
    return this.config.license;
  }

  public getApiPort(): number {
    return this.config.apiPort;
  }

  public getWebPort(): number {
    return this.config.webPort;
  }
}

// Export singleton instance
export const config = new ConfigManager();
export type { AppConfig };

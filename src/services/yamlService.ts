import yaml from 'js-yaml';
import { validatePath } from '../utils/pathSecurity';

export interface SuricataConfig {
  rule_files: string[];
  [key: string]: any;
}

/** Güvenli YAML parse - arbitrary code execution zafiyetini önler (FAILSAFE_SCHEMA) */
function safeYamlLoad<T = unknown>(content: string): T {
  return yaml.load(content, { schema: yaml.FAILSAFE_SCHEMA }) as T;
}

export const readSuricataConfig = async (configPath: string): Promise<SuricataConfig> => {
  validatePath(configPath);
  try {
    const response = await fetch(`/api/config/read?path=${encodeURIComponent(configPath)}`);
    if (!response.ok) {
      throw new Error('Failed to read Suricata configuration');
    }
    const content = await response.text();
    return safeYamlLoad<SuricataConfig>(content);
  } catch (error) {
    console.error('Error reading Suricata configuration:', error);
    throw error;
  }
};
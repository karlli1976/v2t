export interface Segment {
  start: number;  // seconds
  end: number;    // seconds
  text: string;
}

export interface Config {
  language?: string;
  model?: string;
  backend?: 'local' | 'openai';
  outputDir?: string;
  openaiApiKey?: string;
}

export interface ResolvedConfig {
  language: string;
  model: string;
  backend: 'local' | 'openai';
  outputDir: string;
  openaiApiKey?: string;
}

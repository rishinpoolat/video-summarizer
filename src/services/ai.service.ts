// src/services/ai.service.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
}

export class AIService {
  private config: AIConfig;

  constructor() {
    this.config = this.getEnvApiKey();
    logger.info(`Using AI provider: ${this.config.provider} with model: ${this.config.model}`);
  }

  private getEnvApiKey(): AIConfig {
    // Priority order: Groq > OpenAI > Anthropic > Google
    if (process.env.GROQ_API_KEY) {
      return {
        provider: 'groq',
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.3-70b-versatile'
      };
    }
    
    if (process.env.OPENAI_API_KEY) {
      return {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini'
      };
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      return {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-3-5-haiku-20241022'
      };
    }
    
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY) {
      return {
        provider: 'google',
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY!,
        model: 'gemini-1.5-flash'
      };
    }

    throw new Error(`No AI API key found. Please set one of:
- export GROQ_API_KEY="your_key"                    # For Groq (Recommended - Fast & Free)
- export OPENAI_API_KEY="your_key"                  # For OpenAI  
- export ANTHROPIC_API_KEY="your_key"               # For Anthropic
- export GOOGLE_GENERATIVE_AI_API_KEY="your_key"    # For Google Gemini

Add to your ~/.zshrc or ~/.bashrc and run: source ~/.zshrc`);
  }

  async generateContent(prompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
    retryCount?: number;
  }): Promise<string> {
    const { temperature = 0.7, maxTokens = 1024, retryCount = 0 } = options || {};

    try {
      switch (this.config.provider) {
        case 'groq':
          return await this.callGroq(prompt, temperature, maxTokens);
        case 'openai':
          return await this.callOpenAI(prompt, temperature, maxTokens);
        case 'anthropic':
          return await this.callAnthropic(prompt, temperature, maxTokens);
        case 'google':
          return await this.callGoogle(prompt, temperature, maxTokens);
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error: any) {
      if (retryCount < 3 && error?.message?.includes('429')) {
        logger.warn(`Rate limit hit, retrying after delay...`);
        await this.delay(Math.pow(2, retryCount) * 2000);
        return this.generateContent(prompt, { ...options, retryCount: retryCount + 1 });
      }
      throw error;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async callGroq(prompt: string, temperature: number, maxTokens: number): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private async callOpenAI(prompt: string, temperature: number, maxTokens: number): Promise<string> {
    const openai = new OpenAI({ apiKey: this.config.apiKey });
    
    const response = await openai.chat.completions.create({
      model: this.config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0]?.message?.content || '';
  }

  private async callAnthropic(prompt: string, temperature: number, maxTokens: number): Promise<string> {
    const anthropic = new Anthropic({ apiKey: this.config.apiKey });
    
    const response = await anthropic.messages.create({
      model: this.config.model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock ? (textBlock as any).text : '';
  }

  private async callGoogle(prompt: string, temperature: number, maxTokens: number): Promise<string> {
    const genAI = new GoogleGenerativeAI(this.config.apiKey);
    const model = genAI.getGenerativeModel({ model: this.config.model });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        topK: 40,
        topP: 0.8,
        maxOutputTokens: maxTokens,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    return result.response.text();
  }
}
// src/services/llm.service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/config';

export class LLMService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateSummary(transcript: string): Promise<string> {
    try {
      const prompt = `
        Please provide a concise summary of the following video transcript. 
        Focus on the main points and key takeaways. Keep the summary clear and engaging.
        
        Transcript:
        ${transcript}
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }
}
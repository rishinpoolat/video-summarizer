// src/services/summary.service.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { GEMINI_API_KEY } from '../config/environment';

export class SummaryService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private readonly TARGET_WORDS = 500;

  constructor() {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private chunkTranscript(transcript: string, maxChunkSize: number = 5000): string[] {
    const words = transcript.split(' ');
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const word of words) {
      if (currentLength + word.length + 1 > maxChunkSize) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [word];
        currentLength = word.length + 1;
      } else {
        currentChunk.push(word);
        currentLength += word.length + 1;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }

  private async summarizeChunk(chunk: string): Promise<string> {
    const prompt = `
      Please analyze this video transcript segment and provide a detailed summary.
      
      Your summary should:
      - Capture key points, important details, and main arguments
      - Include relevant examples and quotes when appropriate
      - Maintain clear organization and logical flow
      - Be detailed enough to contribute to a final summary of approximately 500 words
      
      Transcript segment:
      ${chunk}
    `;

    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }]}],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 1024,
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

    const response = await result.response;
    return response.text();
  }

  async generateSummary(transcript: string): Promise<string> {
    try {
      logger.info('Starting summary generation');

      // Split transcript into manageable chunks
      const chunks = this.chunkTranscript(transcript);
      logger.debug(`Split transcript into ${chunks.length} chunks`);

      // Summarize each chunk
      const chunkSummaries = await Promise.all(
        chunks.map(chunk => this.summarizeChunk(chunk))
      );

      // If there's only one chunk, ensure it meets the target length
      if (chunkSummaries.length === 1) {
        const singleSummary = chunkSummaries[0];
        if (this.countWords(singleSummary) < this.TARGET_WORDS) {
          return this.expandSummary(singleSummary, transcript);
        }
        return singleSummary;
      }

      // For multiple chunks, generate final summary
      const combinedSummary = chunkSummaries.join('\n\n');
      const finalPrompt = `
        Generate a comprehensive summary of this video content in approximately 500 words.
        
        Guidelines:
        - Aim for roughly 500 words (a little more or less is fine)
        - Present a cohesive narrative that flows naturally
        - Include the most significant points and key details
        - Use specific examples and quotes where relevant
        - Organize information logically and clearly
        - Ensure the summary is both informative and engaging
        - Maintain appropriate context and connections between ideas
        
        Source summaries:
        ${combinedSummary}
      `;

      const finalResult = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: finalPrompt }]}],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      });

      const summary = finalResult.response.text();
      const wordCount = this.countWords(summary);

      // If summary is significantly shorter than target, expand it
      if (wordCount < this.TARGET_WORDS * 0.8) { // 20% margin
        return this.expandSummary(summary, transcript);
      }

      return summary;

    } catch (error) {
      logger.error('Error generating summary:', error);
      throw new Error('Failed to generate summary: ' + (error as Error).message);
    }
  }

  private async expandSummary(currentSummary: string, originalTranscript: string): Promise<string> {
    const expandPrompt = `
      Please expand this summary to approximately 500 words while maintaining accuracy and natural flow.
      
      Guidelines:
      - Target length: ~500 words (slight variation is acceptable)
      - Add relevant details and examples from the original content
      - Maintain clear organization and logical progression
      - Keep the tone engaging and professional
      - Ensure all additional content is based on the original transcript
      
      Current summary:
      ${currentSummary}
      
      Original content:
      ${originalTranscript}
    `;

    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: expandPrompt }]}],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });

    return result.response.text();
  }
}
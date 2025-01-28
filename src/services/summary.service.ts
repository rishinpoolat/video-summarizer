// src/services/summary.service.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { GEMINI_API_KEY } from '../config/environment';

export class SummaryService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
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
      Please provide a concise summary of this video transcript segment.
      Focus on key points, main ideas, and important details.
      Keep the summary clear and well-organized.

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

      // If there's only one chunk, return its summary
      if (chunkSummaries.length === 1) {
        return chunkSummaries[0];
      }

      // If there are multiple chunks, generate a final summary
      const combinedSummary = chunkSummaries.join('\n\n');
      const finalPrompt = `
        Please create a cohesive final summary from these segment summaries.
        Combine the information logically and remove any redundancy.
        Focus on the main narrative and key points.

        Segment summaries:
        ${combinedSummary}
      `;

      const finalResult = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: finalPrompt }]}],
      });

      return finalResult.response.text();

    } catch (error) {
      logger.error('Error generating summary:', error);
      throw new Error('Failed to generate summary: ' + (error as Error).message);
    }
  }
}
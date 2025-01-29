// src/services/summary.service.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { GEMINI_API_KEY } from '../config/environment';

export class SummaryService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private readonly TARGET_WORDS = 500;
  private readonly DELAY_BETWEEN_OPERATIONS = 2000; // 2 seconds between operations
  private readonly MAX_CHUNK_SIZE = 4000; // Reduced chunk size for better reliability

  constructor() {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private chunkTranscript(transcript: string): string[] {
    const words = transcript.split(' ');
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const word of words) {
      if (currentLength + word.length + 1 > this.MAX_CHUNK_SIZE) {
        // Try to find a natural break point (sentence end)
        const chunkText = currentChunk.join(' ');
        const lastPeriod = chunkText.lastIndexOf('.');
        
        if (lastPeriod !== -1 && lastPeriod > chunkText.length * 0.5) {
          // Split at the last sentence if it's past the halfway point
          const firstPart = chunkText.substring(0, lastPeriod + 1);
          const remainingWords = chunkText.substring(lastPeriod + 1).trim().split(' ');
          
          chunks.push(firstPart);
          currentChunk = [...remainingWords, word];
          currentLength = currentChunk.join(' ').length;
        } else {
          chunks.push(chunkText);
          currentChunk = [word];
          currentLength = word.length;
        }
      } else {
        currentChunk.push(word);
        currentLength += word.length + 1;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks.map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
  }

  private async processChunkWithRetry(
    chunk: string,
    chunkIndex: number,
    totalChunks: number,
    retryCount = 0
  ): Promise<string> {
    try {
      const prompt = `
        Analyze this transcript segment (Part ${chunkIndex + 1} of ${totalChunks}) and provide a clear summary.
        
        Guidelines:
        - Extract key points and main ideas
        - Maintain chronological order of events/topics
        - Include important details and context
        - Focus on the most relevant information
        
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

      return result.response.text();

    } catch (error: any) {
      if (retryCount < 3 && error?.message?.includes('429')) {
        logger.warn(`Rate limit hit for chunk ${chunkIndex + 1}, retrying after delay...`);
        await this.delay(Math.pow(2, retryCount) * this.DELAY_BETWEEN_OPERATIONS);
        return this.processChunkWithRetry(chunk, chunkIndex, totalChunks, retryCount + 1);
      }
      throw error;
    }
  }

  private async generateFinalSummary(intermediateSummaries: string[]): Promise<string> {
    try {
      const combinedSummary = intermediateSummaries.join('\n\n');
      
      const finalPrompt = `
        Create a coherent summary of approximately 500 words from these segment summaries.
        
        Requirements:
        - Target length: 500 words (slight variation is acceptable)
        - Create a flowing narrative that connects all major points
        - Maintain chronological order of topics/events
        - Include specific details and examples where relevant
        - Ensure clear transitions between topics
        - Focus on the most important information
        
        Source summaries:
        ${combinedSummary}
      `;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: finalPrompt }]}],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      });

      return result.response.text();

    } catch (error: any) {
      logger.error('Error generating final summary:', error);
      throw error;
    }
  }

  async generateSummary(transcript: string): Promise<string> {
    try {
      logger.info('Starting sequential summary generation');

      // Split transcript into chunks
      const chunks = this.chunkTranscript(transcript);
      logger.info(`Divided transcript into ${chunks.length} chunks`);

      // Process chunks sequentially
      const intermediateSummaries: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        logger.info(`Processing chunk ${i + 1}/${chunks.length}`);
        
        // Process chunk
        const chunkSummary = await this.processChunkWithRetry(chunks[i], i, chunks.length);
        intermediateSummaries.push(chunkSummary);
        
        // Add delay between chunks
        if (i < chunks.length - 1) {
          logger.debug('Adding delay between chunks');
          await this.delay(this.DELAY_BETWEEN_OPERATIONS);
        }
      }

      // Generate final summary
      logger.info('Generating final summary');
      await this.delay(this.DELAY_BETWEEN_OPERATIONS);
      let finalSummary = await this.generateFinalSummary(intermediateSummaries);
      
      // Check word count
      const wordCount = this.countWords(finalSummary);
      logger.info(`Final summary word count: ${wordCount}`);

      return finalSummary;

    } catch (error) {
      logger.error('Error in summary generation:', error);
      throw new Error('Failed to generate summary: ' + (error as Error).message);
    }
  }
}
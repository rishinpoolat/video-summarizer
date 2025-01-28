// src/services/transcript.service.ts
import { Page } from 'puppeteer';
import { PuppeteerManager } from '../utils/puppeteer-manager';
import { logger } from '../utils/logger';
import { SELECTORS } from '../config/constants';

export class TranscriptService {
  private puppeteerManager: PuppeteerManager;

  constructor() {
    this.puppeteerManager = PuppeteerManager.getInstance();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleCookieConsent(page: Page): Promise<void> {
    try {
      const buttonSelector = 'button[aria-label="Accept all"]';
      await page.waitForSelector(buttonSelector, { timeout: 5000 });
      await page.click(buttonSelector);
      await this.delay(1000);
    } catch (error) {
      logger.debug('No cookie consent dialog found or already accepted');
    }
  }

  async getTranscript(videoUrl: string): Promise<string> {
    const page = await this.puppeteerManager.getPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0');
      
      // Navigate to video
      logger.info(`Navigating to video: ${videoUrl}`);
      await page.goto(videoUrl, { waitUntil: 'networkidle0' });
      await this.handleCookieConsent(page);
      await this.delay(2000);

      // Click more actions button
      logger.info('Opening video menu...');
      await page.waitForSelector(SELECTORS.TRANSCRIPT_BUTTON);
      await page.click(SELECTORS.TRANSCRIPT_BUTTON);
      await this.delay(1000);

      // Click show transcript option
      logger.info('Opening transcript...');
      await page.waitForSelector(SELECTORS.SHOW_TRANSCRIPT);
      await page.click(SELECTORS.SHOW_TRANSCRIPT);
      await this.delay(2000);

      // Extract transcript text
      logger.info('Extracting transcript...');
      const transcript = await page.evaluate(() => {
        const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
        return Array.from(segments)
          .map(segment => {
            const text = segment.querySelector('#text')?.textContent || '';
            return text.trim();
          })
          .filter(text => text.length > 0)
          .join(' ');
      });

      if (!transcript) {
        throw new Error('No transcript found');
      }

      logger.info('Successfully extracted transcript');
      return transcript;

    } catch (error) {
      logger.error('Error extracting transcript:', error);
      throw new Error(`Failed to extract transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await page.close();
    }
  }

  async cleanup(): Promise<void> {
    await this.puppeteerManager.close();
  }
}
import { Page } from 'puppeteer';
import { PuppeteerManager } from '../utils/puppeteer-manager';
import { logger } from '../utils/logger';

export class TranscriptService {
  private puppeteerManager: PuppeteerManager;

  constructor() {
    this.puppeteerManager = PuppeteerManager.getInstance();
  }

  private cleanTranscript(transcript: string): string {
    return transcript
      // Remove timestamp patterns (XX:XX)
      .replace(/\d+:\d+/g, '')
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      // Clean up any artifacts
      .replace(/\[.*?\]/g, '')
      // Trim whitespace
      .trim();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleCookieConsent(page: Page): Promise<void> {
    try {
      const buttonSelector = 'button[aria-label=\"Accept all\"]';
      await page.waitForSelector(buttonSelector, { timeout: 5000 });
      await page.click(buttonSelector);
      await this.delay(1000);
    } catch (error) {
      logger.debug('No cookie consent dialog found or already accepted');
    }
  }

  private async expandDescription(page: Page): Promise<void> {
    logger.info('Attempting to expand video description...');
    
    try {
      const moreButtonSelectors = [
        'tp-yt-paper-button#expand',
        '#expand',
        '#more',
        '#description-inline-expander button'
      ];

      for (const selector of moreButtonSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          const moreButton = await page.$(selector);
          if (moreButton) {
            logger.info(`Found more button with selector: ${selector}`);
            await moreButton.click();
            await this.delay(1000);
            return;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      logger.warn('Error expanding description, trying to proceed anyway:', error);
    }
  }

  async getTranscript(videoUrl: string): Promise<string> {
    const page = await this.puppeteerManager.getPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0');
      
      // Navigate to video
      logger.info(`Navigating to video: ${videoUrl}`);
      await page.goto(videoUrl, { waitUntil: 'domcontentloaded' });
      await this.handleCookieConsent(page);
      
      // Wait for the video player to load
      logger.info('Waiting for video player...');
      await page.waitForSelector('video', { timeout: 10000 });
      await this.delay(2000);

      // Expand description first
      await this.expandDescription(page);
      await this.delay(2000);

      // Try to find the transcript button
      logger.info('Looking for transcript button...');
      const transcriptButtonSelectors = [
        'button[aria-label=\"Show transcript\"]',
        '#primary-button ytd-button-renderer button',
        '#button-container ytd-button-renderer button'
      ];

      let transcriptButtonFound = false;
      // Try each selector
      for (const selector of transcriptButtonSelectors) {
        try {
          logger.info(`Trying selector: ${selector}`);
          const button = await page.waitForSelector(selector, { 
            visible: true,
            timeout: 5000 
          });
          
          if (button) {
            logger.info(`Found transcript button with selector: ${selector}`);
            await button.click();
            transcriptButtonFound = true;
            break;
          }
        } catch (e) {
          logger.debug(`Selector ${selector} not found, trying next...`);
          continue;
        }
      }

      if (!transcriptButtonFound) {
        throw new Error('Transcript button not found');
      }

      await this.delay(2000);

      // Wait for transcript panel and extract content
      logger.info('Waiting for transcript panel...');
      
      // Wait for the transcript container
      await page.waitForSelector('.ytd-transcript-segment-list-renderer', { timeout: 10000 });
      
      // Extract transcript text
      logger.info('Extracting transcript...');
      const transcriptResult = await page.evaluate(() => {
        const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
        
        if (!segments || segments.length === 0) {
          return null;
        }

        const transcriptTexts: string[] = [];
        segments.forEach(segment => {
          const textElement = segment.querySelector('.segment-text, [class*=\"text\"]:not([class*=\"timestamp\"])');
          if (textElement && textElement.textContent) {
            const text = textElement.textContent.trim();
            if (text) {
              transcriptTexts.push(text);
            }
          }
        });

        return transcriptTexts.length > 0 ? transcriptTexts.join(' ') : null;
      });

      if (!transcriptResult) {
        logger.error('No transcript segments found');
        
        // Debug: Log the page content
        const debug = await page.evaluate(() => {
          const container = document.querySelector('.ytd-transcript-segment-list-renderer');
          const bodyContent = document.body?.textContent;
          return {
            containerExists: !!container,
            containerHTML: container ? container.innerHTML : 'Not found',
            bodyTextSample: bodyContent ? bodyContent.slice(0, 1000) : 'No body content'
          };
        });
        
        logger.debug('Debug info:', debug);
        throw new Error('No transcript found');
      }

      // Clean the transcript before returning
      const cleanedTranscript = this.cleanTranscript(transcriptResult);
      
      if (!cleanedTranscript) {
        throw new Error('Failed to clean transcript');
      }
      
      logger.info('Successfully extracted and cleaned transcript');
      return cleanedTranscript;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error extracting transcript:', errorMessage);
      throw new Error(`Failed to extract transcript: ${errorMessage}`);
    } finally {
      await page.close();
    }
  }

  async cleanup(): Promise<void> {
    await this.puppeteerManager.close();
  }
}
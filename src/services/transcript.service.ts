// src/services/transcript.service.ts
import { Page } from 'puppeteer';
import { PuppeteerManager } from '../utils/puppeteer-manager';
import { logger } from '../utils/logger';

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

      // Try to find the transcript button with multiple selectors
      logger.info('Looking for transcript button...');
      const transcriptButtonSelectors = [
        'button[aria-label="Show transcript"]',
        '#primary-button ytd-button-renderer button',
        '#button-container ytd-button-renderer button',
        'ytd-video-description-transcript-section-renderer button',
        '.ytd-video-description-transcript-section-renderer button'
      ];

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
            // Click using multiple methods to ensure it works
            try {
              await button.click();
            } catch (e) {
              await page.evaluate((sel) => {
                const element = document.querySelector(sel);
                if (element) element.click();
              }, selector);
            }
            break;
          }
        } catch (e) {
          logger.debug(`Selector ${selector} not found, trying next...`);
          continue;
        }
      }

      await this.delay(2000);

      // Wait for transcript panel
      logger.info('Waiting for transcript panel...');
      await page.waitForSelector('ytd-transcript-renderer', { timeout: 10000 });
      await this.delay(1000);

      // Extract transcript text
      logger.info('Extracting transcript...');
      const transcript = await page.evaluate(() => {
        const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
        if (!segments.length) return null;

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
      
      // Debug: Log the current page content
      const pageContent = await page.content();
      logger.debug('Page content at error:', pageContent.slice(0, 1000));
      
      throw new Error(`Failed to extract transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await page.close();
    }
  }

  async cleanup(): Promise<void> {
    await this.puppeteerManager.close();
  }
}
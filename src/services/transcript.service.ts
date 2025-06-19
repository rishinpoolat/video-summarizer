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
      
      // First try direct transcript button
      const transcriptButtonSelectors = [
        'button[aria-label=\"Show transcript\"]',
        'button[aria-label=\"Transcript\"]',
        'ytd-button-renderer[is-icon-button] button[aria-label*=\"transcript\"]',
        'ytd-button-renderer[is-icon-button] button[aria-label*=\"Transcript\"]',
        'yt-button-shape button[aria-label*=\"transcript\"]',
        'yt-button-shape button[aria-label*=\"Transcript\"]'
      ];
      
      // Also try "More actions" menu approach
      const moreActionsSelectors = [
        'button[aria-label=\"More actions\"]',
        'button[aria-label=\"More\"]',
        'ytd-menu-renderer button[aria-label*=\"More\"]',
        '#top-level-buttons-computed button[aria-label*=\"More\"]'
      ];

      let transcriptButtonFound = false;
      
      // Try direct transcript button first
      for (const selector of transcriptButtonSelectors) {
        try {
          logger.info(`Trying direct transcript selector: ${selector}`);
          const button = await page.waitForSelector(selector, { 
            visible: true,
            timeout: 3000 
          });
          
          if (button) {
            logger.info(`Found transcript button with selector: ${selector}`);
            await button.click();
            transcriptButtonFound = true;
            break;
          }
        } catch (e) {
          logger.debug(`Direct selector ${selector} not found, trying next...`);
          continue;
        }
      }
      
      // If direct button not found, try "More actions" menu
      if (!transcriptButtonFound) {
        logger.info('Direct transcript button not found, trying More actions menu...');
        
        for (const selector of moreActionsSelectors) {
          try {
            logger.info(`Trying more actions selector: ${selector}`);
            const moreButton = await page.waitForSelector(selector, { 
              visible: true,
              timeout: 3000 
            });
            
            if (moreButton) {
              logger.info(`Found more actions button with selector: ${selector}`);
              await moreButton.click();
              await this.delay(1000);
              
              // Now look for transcript in the dropdown menu using text content
              const transcriptMenuItem = await page.evaluate(() => {
                const menuItems = document.querySelectorAll('tp-yt-paper-item, ytd-menu-service-item-renderer, [role=\"menuitem\"]');
                for (const item of menuItems) {
                  const text = item.textContent?.toLowerCase();
                  if (text && (text.includes('transcript') || text.includes('show transcript'))) {
                    return item;
                  }
                }
                return null;
              });
              
              if (transcriptMenuItem) {
                logger.info('Found transcript menu item by text content');
                await page.evaluate((item) => {
                  (item as HTMLElement).click();
                }, transcriptMenuItem);
                transcriptButtonFound = true;
              }
              
              if (transcriptButtonFound) break;
            }
          } catch (e) {
            logger.debug(`More actions selector ${selector} not found`);
            continue;
          }
        }
      }

      if (!transcriptButtonFound) {
        throw new Error('Transcript button not found in direct buttons or More actions menu');
      }

      await this.delay(2000);

      // Wait for transcript panel and extract content
      logger.info('Waiting for transcript panel...');
      
      // Try multiple selectors for transcript container
      const transcriptContainerSelectors = [
        '.ytd-transcript-segment-list-renderer',
        'ytd-transcript-segment-list-renderer',
        '[role=\"main\"] ytd-transcript-segment-renderer',
        '#segments.ytd-transcript-segment-list-renderer',
        'ytd-engagement-panel-section-list-renderer ytd-transcript-segment-renderer'
      ];
      
      let transcriptContainer = null;
      for (const selector of transcriptContainerSelectors) {
        try {
          logger.info(`Trying transcript container selector: ${selector}`);
          await page.waitForSelector(selector, { timeout: 5000 });
          transcriptContainer = selector;
          logger.info(`Found transcript container with: ${selector}`);
          break;
        } catch (e) {
          logger.debug(`Container selector ${selector} not found`);
          continue;
        }
      }
      
      if (!transcriptContainer) {
        throw new Error('Transcript container not found with any selector');
      }
      
      // Extract transcript text
      logger.info('Extracting transcript...');
      const transcriptResult = await page.evaluate(() => {
        // Try multiple selectors for transcript segments
        const segmentSelectors = [
          'ytd-transcript-segment-renderer',
          '.ytd-transcript-segment-renderer',
          '[role=\"button\"] .segment-text',
          'yt-formatted-string.segment-text'
        ];
        
        let segments: NodeListOf<Element> | null = null;
        for (const selector of segmentSelectors) {
          segments = document.querySelectorAll(selector);
          if (segments && segments.length > 0) {
            console.log(`Found ${segments.length} segments with selector: ${selector}`);
            break;
          }
        }
        
        if (!segments || segments.length === 0) {
          console.log('No transcript segments found with any selector');
          return null;
        }

        const transcriptTexts: string[] = [];
        segments.forEach((segment, index) => {
          // Try multiple text selectors within each segment
          const textSelectors = [
            '.segment-text',
            'yt-formatted-string',
            '.ytd-transcript-segment-renderer .text',
            '[class*=\"text\"]:not([class*=\"timestamp\"])',
            'span:not([class*=\"time\"])'
          ];
          
          let textElement = null;
          for (const textSelector of textSelectors) {
            textElement = segment.querySelector(textSelector);
            if (textElement && textElement.textContent?.trim()) {
              break;
            }
          }
          
          if (textElement && textElement.textContent) {
            const text = textElement.textContent.trim();
            if (text && !text.match(/^\\d+:\\d+$/)) { // Skip timestamp-only text
              transcriptTexts.push(text);
            }
          } else {
            // Fallback: try getting text content directly from segment
            const directText = segment.textContent?.trim();
            if (directText && !directText.match(/^\\d+:\\d+$/)) {
              transcriptTexts.push(directText);
            }
          }
        });

        console.log(`Extracted ${transcriptTexts.length} text segments`);
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
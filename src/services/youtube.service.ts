// src/services/youtube.service.ts
import { Page } from 'puppeteer';
import { PuppeteerManager } from '../utils/puppeteer-manager';
import { logger } from '../utils/logger';
import { YOUTUBE_BASE_URL, YOUTUBE_SEARCH_URL } from '../config/constants';
import { VideoDetails } from '../types/youtube.types';

export class YouTubeService {
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
      logger.info('Cookie consent handled successfully');
    } catch (error) {
      logger.debug('No cookie consent dialog found or already accepted');
    }
  }

  private async navigateWithRetry(page: Page, url: string, maxRetries = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Navigation attempt ${attempt} to ${url}`);
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 
        });
        
        // Wait for network to be idle
        await this.delay(2000);
        await page.waitForNetworkIdle({ timeout: 10000 }).catch(() => {
          logger.debug('Network idle timeout, continuing anyway');
        });
        
        return;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        logger.warn(`Navigation attempt ${attempt} failed, retrying...`);
        await this.delay(2000 * attempt); // Exponential backoff
      }
    }
  }

  async findChannel(channelName: string): Promise<string | null> {
    const page = await this.puppeteerManager.getPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0');

      const searchUrl = `${YOUTUBE_SEARCH_URL}?search_query=${encodeURIComponent(channelName + " channel")}`;
      logger.info(`Searching for channel: ${searchUrl}`);
      
      await this.navigateWithRetry(page, searchUrl);
      await this.handleCookieConsent(page);

      // Wait for results
      await Promise.race([
        page.waitForSelector('ytd-channel-renderer', { timeout: 5000 }),
        page.waitForSelector('ytd-video-renderer', { timeout: 5000 })
      ]);

      await this.delay(2000);

      const channelUrl = await page.evaluate(() => {
        const channelRenderer = document.querySelector('ytd-channel-renderer');
        if (channelRenderer) {
          const link = channelRenderer.querySelector('a#main-link');
          if (link) return link.getAttribute('href');
        }

        const videoRenderer = document.querySelector('ytd-video-renderer');
        if (videoRenderer) {
          const channelLink = videoRenderer.querySelector('a.yt-formatted-string');
          if (channelLink) return channelLink.getAttribute('href');
        }

        return null;
      });

      if (!channelUrl) {
        logger.debug('No channel found in search results');
        return null;
      }

      const fullUrl = channelUrl.startsWith('http') ? channelUrl : `https://www.youtube.com${channelUrl}`;
      logger.info(`Found channel URL: ${fullUrl}`);
      return fullUrl;

    } catch (error) {
      logger.error('Error finding channel:', error);
      return null;
    } finally {
      await page.close();
    }
  }

  async getLatestVideo(channelUrl: string): Promise<VideoDetails | null> {
    const page = await this.puppeteerManager.getPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0');

      const videosUrl = channelUrl.includes('/videos') ? channelUrl : `${channelUrl}/videos`;
      logger.info(`Navigating to videos page: ${videosUrl}`);
      
      await this.navigateWithRetry(page, videosUrl);
      await this.handleCookieConsent(page);
      
      logger.info('Waiting for video grid...');
      
      // Try multiple different selectors for video grid
      const gridSelectors = [
        'ytd-rich-grid-renderer',
        '#contents.ytd-rich-grid-renderer',
        '#primary ytd-rich-grid-renderer',
        '#contents ytd-rich-item-renderer'
      ];
      
      // Wait for any of the grid selectors
      await Promise.any(
        gridSelectors.map(selector => 
          page.waitForSelector(selector, { timeout: 10000 })
        )
      );

      logger.info('Initial grid found, waiting for content to load...');
      await this.delay(3000);

      // Scroll a bit to trigger lazy loading
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      
      await this.delay(2000);

      // Count videos before extracting
      const videoCount = await page.evaluate(() => {
        return document.querySelectorAll('ytd-rich-item-renderer').length;
      });
      
      logger.info(`Found ${videoCount} videos in the grid`);

      if (videoCount === 0) {
        logger.error('No videos found in grid');
        throw new Error('No videos found in grid');
      }

      // Get latest video details
      const videoDetails = await page.evaluate(() => {
        const videoRenderers = document.querySelectorAll('ytd-rich-item-renderer');
        if (!videoRenderers.length) return null;

        const firstVideo = videoRenderers[0];
        
        // Try different title selectors
        const titleSelectors = ['a#video-title', '#video-title', '#video-title-link'];
        let titleElement = null;
        for (const selector of titleSelectors) {
          titleElement = firstVideo.querySelector(selector);
          if (titleElement) break;
        }

        // Try different thumbnail/link selectors
        const linkSelectors = ['a#thumbnail[href]', 'a[href*="watch?v="]'];
        let linkElement = null;
        for (const selector of linkSelectors) {
          linkElement = firstVideo.querySelector(selector);
          if (linkElement) break;
        }

        if (!titleElement || !linkElement) return null;

        const title = titleElement.textContent?.trim() || '';
        const url = linkElement.getAttribute('href') || '';
        const videoId = url.includes('watch?v=') ? 
          url.split('watch?v=')[1]?.split('&')[0] : '';

        return {
          videoId,
          title,
          url: url.startsWith('http') ? url : `https://www.youtube.com${url}`
        };
      });

      if (!videoDetails) {
        logger.error('Failed to extract video details from first item');
        throw new Error('Failed to extract video details');
      }

      logger.info(`Found latest video: ${videoDetails.title}`);
      return videoDetails;

    } catch (error) {
      logger.error('Error getting latest video:', error);
      return null;
    } finally {
      await page.close();
    }
  }

  async getChannelName(channelUrl: string): Promise<string | null> {
    const page = await this.puppeteerManager.getPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0');
      await this.navigateWithRetry(page, channelUrl);
      await this.handleCookieConsent(page);

      const channelName = await page.evaluate(() => {
        const selectors = [
          '#channel-name .ytd-channel-name',
          '#channel-header ytd-channel-name',
          '#inner-header-container #text',
          'ytd-channel-name yt-formatted-string#text'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            return element.textContent.trim();
          }
        }

        return null;
      });

      return channelName;
    } catch (error) {
      logger.error('Error getting channel name:', error);
      return null;
    } finally {
      await page.close();
    }
  }

  async cleanup(): Promise<void> {
    await this.puppeteerManager.close();
  }
}
// src/services/youtube.service.ts
import { Page } from 'puppeteer';
import { PuppeteerManager } from '../utils/puppeteer-manager';
import { logger } from '../utils/logger';
import { YOUTUBE_BASE_URL, YOUTUBE_SEARCH_URL, SELECTORS } from '../config/constants';
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

  async findChannel(channelName: string): Promise<string | null> {
    const page = await this.puppeteerManager.getPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0');

      const searchUrl = `${YOUTUBE_SEARCH_URL}?search_query=${encodeURIComponent(channelName + " channel")}`;
      logger.info(`Searching for channel: ${searchUrl}`);
      
      await page.goto(searchUrl, { waitUntil: 'networkidle0' });
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
      
      await page.goto(videosUrl, { waitUntil: 'networkidle0' });
      await this.handleCookieConsent(page);

      // Wait for video grid and initial content
      logger.info('Waiting for video grid...');
      await page.waitForSelector('ytd-rich-grid-renderer', { timeout: 10000 });
      await this.delay(3000);

      // Scroll a bit to trigger lazy loading
      await page.evaluate(() => window.scrollBy(0, 500));
      await this.delay(2000);

      // Get latest video details
      const videoDetails = await page.evaluate(() => {
        const firstVideo = document.querySelector('ytd-rich-item-renderer');
        if (!firstVideo) return null;

        const link = firstVideo.querySelector('#video-title');
        const thumbnail = firstVideo.querySelector('#thumbnail');

        if (!link || !thumbnail || !(thumbnail instanceof HTMLAnchorElement)) {
          return null;
        }

        return {
          videoId: thumbnail.href.split('v=')[1],
          title: link.textContent?.trim() || '',
          url: thumbnail.href
        };
      });

      if (!videoDetails) {
        logger.error('No video details found');
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
      await page.goto(channelUrl, { waitUntil: 'networkidle0' });
      await this.handleCookieConsent(page);
      await this.delay(2000);

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
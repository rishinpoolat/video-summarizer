// src/utils/puppeteer-manager.ts
import puppeteer, { Browser, Page, ConsoleMessage } from 'puppeteer';
import { PUPPETEER_OPTIONS, SCRAPING_CONFIG } from '../config/constants';
import { logger } from './logger';

export class PuppeteerManager {
  private static instance: PuppeteerManager;
  private browser: Browser | null = null;

  private constructor() {}

  static getInstance(): PuppeteerManager {
    if (!PuppeteerManager.instance) {
      PuppeteerManager.instance = new PuppeteerManager();
    }
    return PuppeteerManager.instance;
  }

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch(PUPPETEER_OPTIONS);
    }
    return this.browser;
  }

  async getPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    // Set default timeout
    page.setDefaultTimeout(SCRAPING_CONFIG.PAGE_LOAD_TIMEOUT);
    
    // Add error handling
    page.on('error', error => {
      logger.error('Page error:', error);
    });
    
    // Add console logging
    page.on('console', (msg: ConsoleMessage) => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        logger.debug('Browser console:', msg.text());
      }
    });

    return page;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
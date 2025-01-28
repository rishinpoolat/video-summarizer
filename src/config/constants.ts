// src/config/constants.ts
export const YOUTUBE_BASE_URL = 'https://www.youtube.com';
export const YOUTUBE_SEARCH_URL = `${YOUTUBE_BASE_URL}/results`;

export const SELECTORS = {
  // Channel selectors
  CHANNEL_SEARCH: 'input#search',
  CHANNEL_RESULTS: 'ytd-channel-renderer, #channel-title',
  CHANNEL_LINK: 'a#main-link',
  CHANNEL_NAME: [
    '#channel-name .ytd-channel-name',
    '#channel-header ytd-channel-name',
    '#inner-header-container #text',
    'ytd-channel-name yt-formatted-string#text'
  ],
  
  // Video selectors
  VIDEO_GRID: 'ytd-rich-grid-row',
  VIDEO_ITEM: 'ytd-rich-item-renderer',
  VIDEO_TITLE: '#video-title',
  VIDEO_THUMBNAIL: '#thumbnail',
  
  // Transcript selectors
  TRANSCRIPT_BUTTON: 'button[aria-label="More actions"]',
  SHOW_TRANSCRIPT: 'tp-yt-paper-item:has-text("Show transcript")',
  TRANSCRIPT_TEXT: 'ytd-transcript-segment-renderer',
  TRANSCRIPT_SEGMENTS: '#segments'
};

export const SCRAPING_CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  PAGE_LOAD_TIMEOUT: 30000,
  ELEMENT_TIMEOUT: 10000,
  DEFAULT_VIEWPORT: {
    width: 1920,
    height: 1080,
  },
};

export const PUPPETEER_OPTIONS = {
  headless: false,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920x1080',
    '--start-maximized',
  ],
  defaultViewport: SCRAPING_CONFIG.DEFAULT_VIEWPORT,
};
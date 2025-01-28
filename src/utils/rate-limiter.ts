// src/utils/rate-limiter.ts
import { RateLimitConfig } from '../types/youtube.types';
import { logger } from './logger';

export class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async waitForAvailability(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.config.timeWindowMs
    );

    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + this.config.timeWindowMs - now;
      
      if (waitTime > 0) {
        logger.debug(`Rate limit reached. Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.requests = this.requests.slice(1);
    }

    this.requests.push(now);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForAvailability();
    return fn();
  }
}
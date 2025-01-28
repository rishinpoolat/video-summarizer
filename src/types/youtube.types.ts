// src/types/youtube.types.ts
export interface VideoDetails {
  videoId: string;
  title: string;
  url: string;
}

export interface ChannelDetails {
  name: string;
  url: string;
}

export interface VideoSummary {
  channelDetails: ChannelDetails;
  videoDetails: VideoDetails;
  summary: string;
  timestamp: Date;
}

export interface RateLimitConfig {
  maxRequests: number;
  timeWindowMs: number;
}

export interface ScrapingResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retryCount?: number;
}
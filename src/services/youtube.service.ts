// src/services/youtube.service.ts
import { google } from 'googleapis';
import { config } from '../config/config';

export class YouTubeService {
  private youtube;

  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: config.YOUTUBE_API_KEY
    });
  }

  async getLatestVideo(channelNameOrUrl: string): Promise<{
    videoId: string;
    title: string;
    description: string;
  } | null> {
    try {
      // First, get the channel ID if a custom URL or name is provided
      const channelId = await this.getChannelId(channelNameOrUrl);
      
      if (!channelId) {
        throw new Error('Channel not found');
      }

      // Get the latest video from the channel
      const response = await this.youtube.search.list({
        part: ['snippet'],
        channelId,
        order: 'date',
        maxResults: 1,
        type: ['video']
      });

      const latestVideo = response.data.items?.[0];
      
      if (!latestVideo) {
        return null;
      }

      return {
        videoId: latestVideo.id?.videoId || '',
        title: latestVideo.snippet?.title || '',
        description: latestVideo.snippet?.description || ''
      };
    } catch (error) {
      console.error('Error fetching latest video:', error);
      throw error;
    }
  }

  private async getChannelId(channelNameOrUrl: string): Promise<string | null> {
    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: channelNameOrUrl,
        type: ['channel'],
        maxResults: 1
      });

      return response.data.items?.[0]?.id?.channelId || null;
    } catch (error) {
      console.error('Error fetching channel ID:', error);
      throw error;
    }
  }
}
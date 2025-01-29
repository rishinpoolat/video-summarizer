import { Elysia, t } from 'elysia';
import { YouTubeService } from '../services/youtube.service';
import { TranscriptService } from '../services/transcript.service';
import { SummaryService } from '../services/summary.service';
import { logger } from '../utils/logger';

// Initialize services
const youtubeService = new YouTubeService();
const transcriptService = new TranscriptService();
const summaryService = new SummaryService();

async function summarizeVideo(channelInput: string) {
  try {
    // Find channel
    const channelUrl = await youtubeService.findChannel(channelInput);
    if (!channelUrl) {
      throw new Error(`Channel not found: ${channelInput}`);
    }

    // Get channel name
    const channelName = await youtubeService.getChannelName(channelUrl);
    logger.info(`Processing channel: ${channelName || channelInput}`);

    // Get latest video
    const videoDetails = await youtubeService.getLatestVideo(channelUrl);
    if (!videoDetails) {
      throw new Error('No videos found');
    }

    // Get transcript
    const transcript = await transcriptService.getTranscript(videoDetails.url);

    // Generate summary
    const summary = await summaryService.generateSummary(transcript);

    return {
      success: true,
      data: {
        channel: {
          name: channelName || channelInput,
          url: channelUrl
        },
        video: {
          title: videoDetails.title,
          url: videoDetails.url
        },
        summary
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    logger.error('Error processing video:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  } finally {
    // Cleanup browser instances
    await youtubeService.cleanup();
    await transcriptService.cleanup();
  }
}

const app = new Elysia()
  .get('/', () => 'Video Summarizer API is running')
  .post(
    '/summarize',
    async ({ body }) => {
      if (!body || typeof body !== 'object' || !('channel' in body) || typeof body.channel !== 'string' || !body.channel.trim()) {
        return {
          success: false,
          error: 'Channel name or URL is required'
        };
      }

      return await summarizeVideo(body.channel.trim());
    },
    {
      body: t.Object({
        channel: t.String()
      })
    }
  )
  .listen(3000);

console.log(`🦊 Video Summarizer API is running at ${app.server?.hostname}:${app.server?.port}`);

export type AppType = typeof app;
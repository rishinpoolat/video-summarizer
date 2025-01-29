// src/cli.ts
import { Command } from 'commander';
import cron from 'node-cron';
import { YouTubeService } from './services/youtube.service';
import { TranscriptService } from './services/transcript.service';
import { SummaryService } from './services/summary.service';
import { logger } from './utils/logger';

const program = new Command();

// Initialize services
const youtubeService = new YouTubeService();
const transcriptService = new TranscriptService();
const summaryService = new SummaryService();

async function summarizeLatestVideo(channelInput: string): Promise<void> {
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

    // Output results
    console.log('\nVideo Summary:');
    console.log('=============');
    console.log(`Channel: ${channelName || channelInput}`);
    console.log(`Title: ${videoDetails.title}`);
    console.log(`URL: ${videoDetails.url}`);
    console.log('\nSummary:');
    console.log(summary);

  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error processing video:', error.message);
      throw error;
    } else {
      const errorMessage = 'An unknown error occurred';
      logger.error('Error processing video:', errorMessage);
      throw new Error(errorMessage);
    }
  } finally {
    // Cleanup browser instances
    await youtubeService.cleanup();
    await transcriptService.cleanup();
  }
}

program
  .name('video-summarizer')
  .description('Get summaries of the latest YouTube videos from your favorite channels');

program
  .command('summarize')
  .description('Summarize the latest video from a YouTube channel')
  .argument('<channelName>', 'Name or URL of the YouTube channel')
  .action(async (channelName) => {
    try {
      await summarizeLatestVideo(channelName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Failed to summarize video:', errorMessage);
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Watch a channel and summarize new videos daily')
  .argument('<channelName>', 'Name or URL of the YouTube channel')
  .option('-t, --time <time>', 'Time to check for new videos (in cron format)', '0 12 * * *')
  .action(async (channelName, options) => {
    console.log(`Watching channel: ${channelName}`);
    console.log(`Scheduled to run at: ${options.time}`);

    cron.schedule(options.time, async () => {
      try {
        await summarizeLatestVideo(channelName);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        logger.error('Failed to process scheduled summary:', errorMessage);
      }
    });
  });

export const cli = program;
// src/index.ts
import { YouTubeService } from './services/youtube.service';
import { LLMService } from './services/llm.service';

class VideoSummarizer {
  private youtubeService: YouTubeService;
  private llmService: LLMService;

  constructor() {
    this.youtubeService = new YouTubeService();
    this.llmService = new LLMService();
  }

  async summarizeLatestVideo(channelNameOrUrl: string): Promise<void> {
    try {
      // 1. Get the latest video
      console.log('Fetching latest video...');
      const video = await this.youtubeService.getLatestVideo(channelNameOrUrl);
      
      if (!video) {
        throw new Error('No videos found for the specified channel');
      }

      console.log(`Latest video: ${video.title}`);

      // 2. Get video transcript (Note: We'll need to implement this)
      // For now, we'll use a placeholder
      console.log('Fetching transcript...');
      const transcript = 'Placeholder transcript'; // TODO: Implement transcript fetching

      // 3. Generate summary
      console.log('Generating summary...');
      const summary = await this.llmService.generateSummary(transcript);

      // 4. Output results
      console.log('\n=== Video Summary ===');
      console.log(`Title: ${video.title}`);
      console.log(`Video ID: ${video.videoId}`);
      console.log('\nSummary:');
      console.log(summary);
    } catch (error) {
      console.error('Error summarizing video:', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const channelNameOrUrl = process.argv[2];
  
  if (!channelNameOrUrl) {
    console.error('Please provide a YouTube channel name or URL');
    process.exit(1);
  }

  const summarizer = new VideoSummarizer();
  await summarizer.summarizeLatestVideo(channelNameOrUrl);
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}
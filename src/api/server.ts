import { Elysia, t } from "elysia";
import { YouTubeService } from "../services/youtube.service";
import { TranscriptService } from "../services/transcript.service";
import { SummaryService } from "../services/summary.service";
import { logger } from "../utils/logger";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

interface SummaryRequest {
  channel?: string;
  videoUrl?: string;
}

interface SummaryData {
  title: string;
  summary: string;
  videoUrl: string;
  channelName?: string | null;
  provider: string;
}

// Initialize services
const youtubeService = new YouTubeService();
const transcriptService = new TranscriptService();
const summaryService = new SummaryService();

function createResponse<T>(
  success: boolean,
  data?: T,
  error?: string
): ApiResponse<T> {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
  };
}

async function summarizeFromChannel(
  channelInput: string
): Promise<ApiResponse<SummaryData>> {
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
      throw new Error("No videos found");
    }

    // Get transcript
    const transcript = await transcriptService.getTranscript(videoDetails.url);

    // Generate summary
    const summary = await summaryService.generateSummary(transcript);

    return createResponse<SummaryData>(true, {
      title: videoDetails.title,
      summary,
      videoUrl: videoDetails.url,
      channelName,
      provider: "multi-llm",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    logger.error("Error processing channel video:", errorMessage);
    return createResponse<SummaryData>(false, undefined, errorMessage);
  } finally {
    // Cleanup browser instances
    await youtubeService.cleanup();
    await transcriptService.cleanup();
  }
}

async function summarizeFromVideoUrl(
  videoUrl: string
): Promise<ApiResponse<SummaryData>> {
  try {
    // Validate YouTube URL
    if (
      !videoUrl.includes("youtube.com/watch") &&
      !videoUrl.includes("youtu.be/")
    ) {
      throw new Error("Invalid YouTube URL");
    }

    logger.info(`Processing video URL: ${videoUrl}`);

    // Get video title (optional - can be enhanced)
    const title = "YouTube Video"; // Could extract from page if needed

    // Get transcript
    const transcript = await transcriptService.getTranscript(videoUrl);

    // Generate summary
    const summary = await summaryService.generateSummary(transcript);

    return createResponse<SummaryData>(true, {
      title,
      summary,
      videoUrl,
      provider: "multi-llm",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    logger.error("Error processing video URL:", errorMessage);
    return createResponse<SummaryData>(false, undefined, errorMessage);
  } finally {
    // Cleanup browser instances
    await transcriptService.cleanup();
  }
}

const app = new Elysia()
  // Health check endpoint
  .get("/", () =>
    createResponse(true, {
      message: "Video Summarizer API is running",
      version: "1.0.0",
      endpoints: {
        "POST /summarize": "Summarize latest video from YouTube channel",
        "POST /summarize/video": "Summarize specific YouTube video URL",
        "GET /health": "Health check endpoint",
      },
    })
  )

  // Health endpoint
  .get("/health", () =>
    createResponse(true, {
      status: "healthy",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    })
  )

  // Summarize from channel (latest video)
  .post(
    "/summarize",
    async ({ body, request }): Promise<ApiResponse<SummaryData>> => {
      const { channel, videoUrl } = body as SummaryRequest;
      
      // Enhanced logging for n8n debugging
      console.log('=== INCOMING REQUEST ===');
      console.log('Method:', request.method);
      console.log('URL:', request.url);
      console.log('Headers:', Object.fromEntries(request.headers.entries()));
      console.log('Body received:', body);
      console.log('Body type:', typeof body);
      console.log('Timestamp:', new Date().toISOString());
      console.log('========================');

      if (!channel && !videoUrl) {
        return createResponse<SummaryData>(
          false,
          undefined,
          "Either channel name/URL or video URL is required"
        );
      }

      if (videoUrl) {
        return await summarizeFromVideoUrl(videoUrl.trim());
      }

      if (channel) {
        return await summarizeFromChannel(channel.trim());
      }

      return createResponse<SummaryData>(
        false,
        undefined,
        "Invalid request parameters"
      );
    },
    {
      body: t.Object({
        channel: t.Optional(t.String({ minLength: 1 })),
        videoUrl: t.Optional(t.String({ minLength: 1 })),
      }),
    }
  )

  // Summarize specific video URL
  .post(
    "/summarize/video",
    async ({ body }) => {
      const { url } = body as { url: string };

      if (!url || !url.trim()) {
        return createResponse<SummaryData>(
          false,
          undefined,
          "Video URL is required"
        );
      }

      return await summarizeFromVideoUrl(url.trim());
    },
    {
      body: t.Object({
        url: t.String({ minLength: 1 }),
      }),
    }
  )

  // CORS headers for n8n compatibility
  .all('*', ({ set }) => {
    set.headers['Access-Control-Allow-Origin'] = '*';
    set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  })

  // Handle preflight requests
  .options('*', () => {
    return new Response(null, { status: 200 });
  })

  // CORS and error handling
  .onError(({ error, code }) => {
    logger.error(`API Error [${code}]:`, error);

    if (code === "VALIDATION") {
      return createResponse(false, undefined, "Invalid request format");
    }

    return createResponse(false, undefined, "Internal server error");
  })

  .listen({
    port: 3000,
    hostname: "0.0.0.0"  // Bind to all interfaces
  });

const hostname = app.server?.hostname || "0.0.0.0";
const port = app.server?.port || 3000;

console.log(`🦊 Video Summarizer API is running on:`);
console.log(`   • http://localhost:${port}`);
console.log(`   • http://127.0.0.1:${port}`);
console.log(`   • http://0.0.0.0:${port}`);
console.log(`   • http://${hostname}:${port}`);
console.log(`📚 API Documentation available at any of the above URLs`);
console.log(`🔧 For n8n, try: http://localhost:${port} or http://127.0.0.1:${port}`);

export type AppType = typeof app;

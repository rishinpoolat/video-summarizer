import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
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

const app = new Hono();

// Add CORS middleware
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Validation schemas
const summarizeSchema = z.object({
  channel: z.string().min(1).optional(),
  videoUrl: z.string().min(1).optional(),
});

const videoUrlSchema = z.object({
  url: z.string().min(1),
});

// Health check endpoint
app.get("/", (c) => {
  return c.json(createResponse(true, {
    message: "Video Summarizer API is running",
    version: "1.0.0",
    endpoints: {
      "POST /summarize": "Summarize latest video from YouTube channel",
      "POST /summarize/video": "Summarize specific YouTube video URL",
      "GET /health": "Health check endpoint",
    },
  }));
});

// Health endpoint
app.get("/health", (c) => {
  return c.json(createResponse(true, {
    status: "healthy",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  }));
});

// Summarize from channel (latest video)
app.post("/summarize", zValidator("json", summarizeSchema), async (c) => {
  const { channel, videoUrl } = c.req.valid("json");
  
  // Enhanced logging for n8n debugging
  console.log('=== INCOMING REQUEST ===');
  console.log('Method:', c.req.method);
  console.log('URL:', c.req.url);
  console.log('Headers:', Object.fromEntries(c.req.raw.headers.entries()));
  console.log('Body received:', { channel, videoUrl });
  console.log('Timestamp:', new Date().toISOString());
  console.log('========================');

  if (!channel && !videoUrl) {
    return c.json(createResponse<SummaryData>(
      false,
      undefined,
      "Either channel name/URL or video URL is required"
    ));
  }

  if (videoUrl) {
    const result = await summarizeFromVideoUrl(videoUrl.trim());
    return c.json(result);
  }

  if (channel) {
    const result = await summarizeFromChannel(channel.trim());
    return c.json(result);
  }

  return c.json(createResponse<SummaryData>(
    false,
    undefined,
    "Invalid request parameters"
  ));
});

// Summarize specific video URL
app.post("/summarize/video", zValidator("json", videoUrlSchema), async (c) => {
  const { url } = c.req.valid("json");

  if (!url || !url.trim()) {
    return c.json(createResponse<SummaryData>(
      false,
      undefined,
      "Video URL is required"
    ));
  }

  const result = await summarizeFromVideoUrl(url.trim());
  return c.json(result);
});

// Error handling
app.onError((err, c) => {
  logger.error(`API Error:`, err);
  return c.json(createResponse(false, undefined, "Internal server error"), 500);
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

export default {
  port,
  fetch: app.fetch,
};

console.log(`🔥 Video Summarizer API is running on:`);
console.log(`   • http://localhost:${port}`);
console.log(`   • http://127.0.0.1:${port}`);
console.log(`   • http://0.0.0.0:${port}`);
console.log(`📚 API Documentation available at any of the above URLs`);
console.log(`🔧 For n8n, try: http://localhost:${port} or http://127.0.0.1:${port}`);

export type AppType = typeof app;

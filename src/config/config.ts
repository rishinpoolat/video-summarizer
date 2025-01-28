// src/config/config.ts
import { config as loadEnv } from 'dotenv';

loadEnv();

export const config = {
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  
  // Add more configuration options as needed
  MAX_TRANSCRIPT_LENGTH: 10000, // Maximum length of transcript to process
  SUMMARY_MAX_LENGTH: 1000,    // Maximum length of generated summary
} as const;

// Validate required environment variables
const requiredEnvVars = ['YOUTUBE_API_KEY', 'GEMINI_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
// src/config/environment.ts
import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables
config();

// Define environment schema
const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Validate and export environment variables
const env = envSchema.parse({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
});

export const {
  GEMINI_API_KEY,
  NODE_ENV,
  LOG_LEVEL,
} = env;
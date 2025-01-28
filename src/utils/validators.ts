// src/utils/validators.ts
import { z } from 'zod';
import { logger } from './logger';

// Schema for channel name/URL
export const channelSchema = z.string()
  .min(1, 'Channel name cannot be empty')
  .max(100, 'Channel name is too long')
  .refine(
    (value) => {
      // Allow both channel names and URLs
      const urlPattern = /^(https?:\/\/)?(www\.)?youtube\.com\/@?[\w-]+$/i;
      const namePattern = /^[\w\s-]{1,100}$/;
      return urlPattern.test(value) || namePattern.test(value);
    },
    {
      message: 'Invalid channel name or URL format',
    }
  );

// Schema for cron schedule
export const cronScheduleSchema = z.string()
  .refine(
    (value) => {
      // Validate cron expression
      const cronPattern = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])) (\*|([0-6]))$/;
      return cronPattern.test(value);
    },
    {
      message: 'Invalid cron schedule format',
    }
  );

// Schema for transcript
export const transcriptSchema = z.string()
  .min(1, 'Transcript cannot be empty')
  .max(100000, 'Transcript is too long')
  .transform(text => text.trim());

// Main validation functions
export function validateChannelName(input: string): string {
  try {
    return channelSchema.parse(input);
  } catch (error) {
    logger.error('Channel validation error:', error);
    if (error instanceof z.ZodError) {
      throw new Error(error.errors[0].message);
    }
    throw error;
  }
}

export function validateCronSchedule(schedule: string): string {
  try {
    return cronScheduleSchema.parse(schedule);
  } catch (error) {
    logger.error('Cron schedule validation error:', error);
    if (error instanceof z.ZodError) {
      throw new Error(error.errors[0].message);
    }
    throw error;
  }
}

export function validateTranscript(transcript: string): string {
  try {
    return transcriptSchema.parse(transcript);
  } catch (error) {
    logger.error('Transcript validation error:', error);
    if (error instanceof z.ZodError) {
      throw new Error(error.errors[0].message);
    }
    throw error;
  }
}

// Utility function to extract channel name from URL
export function extractChannelName(input: string): string {
  if (input.includes('youtube.com')) {
    const match = input.match(/youtube\.com\/@?([\w-]+)/i);
    return match ? match[1] : input;
  }
  return input;
}

// Additional validator for video URLs
export const videoUrlSchema = z.string()
  .refine(
    (value) => {
      const urlPattern = /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+$/i;
      return urlPattern.test(value);
    },
    {
      message: 'Invalid YouTube video URL',
    }
  );

export function validateVideoUrl(url: string): string {
  try {
    return videoUrlSchema.parse(url);
  } catch (error) {
    logger.error('Video URL validation error:', error);
    if (error instanceof z.ZodError) {
      throw new Error(error.errors[0].message);
    }
    throw error;
  }
}
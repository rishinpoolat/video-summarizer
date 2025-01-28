// src/index.ts
import { cli } from './cli';
import { logger } from './utils/logger';
import { PuppeteerManager } from './utils/puppeteer-manager';

// Handle cleanup on exit
async function cleanup() {
  try {
    const puppeteerManager = PuppeteerManager.getInstance();
    await puppeteerManager.close();
  } catch (error) {
    logger.error('Error during cleanup:', error);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT. Cleaning up...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Cleaning up...');
  await cleanup();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  logger.error('Uncaught Exception:', error);
  await cleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await cleanup();
  process.exit(1);
});

// Start the application
async function main() {
  try {
    await cli.parseAsync(process.argv);
  } catch (error) {
    logger.error('Application Error:', error);
    await cleanup();
    process.exit(1);
  }
}

main();
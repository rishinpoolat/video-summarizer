// src/utils/logger.ts
import winston from 'winston';
import { LOG_LEVEL, NODE_ENV } from '../config/environment';

const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += JSON.stringify(metadata);
  }
  
  return msg;
});

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    customFormat
  ),
  transports: [
    // Always write errors to error.log
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error',
      format: winston.format.uncolorize()
    }),
    
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: 'combined.log',
      format: winston.format.uncolorize()
    }),
  ]
});

// Add console output in development
if (NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Add error handling
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

export { logger };
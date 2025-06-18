# Video Summarizer API

A powerful REST API that automatically generates summaries of YouTube videos using multiple AI providers. The service can process videos by channel name or direct video URL and leverages a priority-based AI provider system for optimal performance and reliability.

## Features

- 🎯 **Multi-LLM Support**: Automatic fallback across Groq, OpenAI, Anthropic, and Google Gemini
- 🔄 **Flexible Input**: Summarize from channel names, channel URLs, or direct video URLs
- 🚀 **High Performance**: Chunked processing for long videos with rate limiting
- 🛡️ **Error Handling**: Comprehensive error handling and validation
- 📊 **Health Monitoring**: Built-in health check endpoints
- 🔍 **Auto-Discovery**: Automatically finds latest videos from YouTube channels

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- At least one AI provider API key (see [AI Provider Setup](#ai-provider-setup))

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd video-summarizer

# Install dependencies
bun install

# Set up environment variables (see below)
cp .env.example .env

# Start the server
bun run start
```

### Environment Setup

Create a `.env` file with at least one AI provider API key:

```bash
# AI Provider Keys (Priority: Groq > OpenAI > Anthropic > Google)
GROQ_API_KEY="your_groq_api_key"                    # Recommended - Fast & Free
OPENAI_API_KEY="your_openai_api_key"                # Alternative
ANTHROPIC_API_KEY="your_anthropic_api_key"          # Alternative  
GOOGLE_GENERATIVE_AI_API_KEY="your_gemini_api_key"  # Alternative

# Optional: Legacy Google key name also supported
GEMINI_API_KEY="your_gemini_api_key"
```

## API Documentation

### Base URL
```
http://localhost:3000
```

### Endpoints

#### `GET /`
**Description**: API information and available endpoints

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Video Summarizer API is running",
    "version": "1.0.0",
    "endpoints": {
      "POST /summarize": "Summarize latest video from YouTube channel",
      "POST /summarize/video": "Summarize specific YouTube video URL",
      "GET /health": "Health check endpoint"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### `GET /health`
**Description**: Health check endpoint

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600.123,
    "memory": {
      "rss": 50331648,
      "heapTotal": 20971520,
      "heapUsed": 15728640,
      "external": 1048576
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### `POST /summarize`
**Description**: Summarize latest video from a YouTube channel OR a specific video URL

**Request Body**:
```json
{
  "channel": "channel_name_or_url",  // Optional
  "videoUrl": "youtube_video_url"    // Optional
}
```

**Note**: Provide either `channel` OR `videoUrl`, not both.

**Response**:
```json
{
  "success": true,
  "data": {
    "title": "Video Title",
    "summary": "Generated summary of the video content...",
    "videoUrl": "https://youtube.com/watch?v=...",
    "channelName": "Channel Name",
    "provider": "multi-llm"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### `POST /summarize/video`
**Description**: Summarize a specific YouTube video by URL

**Request Body**:
```json
{
  "url": "https://youtube.com/watch?v=VIDEO_ID"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "title": "YouTube Video",
    "summary": "Generated summary of the video content...",
    "videoUrl": "https://youtube.com/watch?v=VIDEO_ID",
    "provider": "multi-llm"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response Format

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Usage Examples

### Using cURL

**Summarize latest video from a channel:**
```bash
curl -X POST http://localhost:3000/summarize \
  -H "Content-Type: application/json" \
  -d '{"channel": "TechChannel"}'
```

**Summarize specific video URL:**
```bash
curl -X POST http://localhost:3000/summarize \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**Health check:**
```bash
curl http://localhost:3000/health
```

### Using JavaScript/TypeScript

```typescript
// Summarize from channel
const response = await fetch('http://localhost:3000/summarize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    channel: 'TechChannel'
  }),
});

const result = await response.json();
console.log(result.data.summary);
```

```typescript
// Summarize specific video
const response = await fetch('http://localhost:3000/summarize/video', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://youtube.com/watch?v=dQw4w9WgXcQ'
  }),
});

const result = await response.json();
console.log(result.data.summary);
```

### Using Python

```python
import requests

# Summarize from channel
response = requests.post('http://localhost:3000/summarize', 
    json={'channel': 'TechChannel'})
result = response.json()
print(result['data']['summary'])

# Summarize specific video  
response = requests.post('http://localhost:3000/summarize/video',
    json={'url': 'https://youtube.com/watch?v=dQw4w9WgXcQ'})
result = response.json()
print(result['data']['summary'])
```

## AI Provider Setup

The system uses a priority-based fallback system for AI providers:

### 1. Groq (Highest Priority - Recommended)
- **Free tier**: 30 requests/minute, 6000 requests/day
- **Model**: llama-3.3-70b-versatile
- **Setup**: Get API key from [Groq Console](https://console.groq.com/)

```bash
export GROQ_API_KEY="your_groq_api_key"
```

### 2. OpenAI (Second Priority)
- **Model**: gpt-4o-mini
- **Setup**: Get API key from [OpenAI Platform](https://platform.openai.com/)

```bash
export OPENAI_API_KEY="your_openai_api_key"
```

### 3. Anthropic (Third Priority)
- **Model**: claude-3-5-haiku-20241022
- **Setup**: Get API key from [Anthropic Console](https://console.anthropic.com/)

```bash
export ANTHROPIC_API_KEY="your_anthropic_api_key"
```

### 4. Google Gemini (Lowest Priority)
- **Model**: gemini-1.5-flash
- **Setup**: Get API key from [Google AI Studio](https://makersuite.google.com/)

```bash
export GOOGLE_GENERATIVE_AI_API_KEY="your_gemini_api_key"
# or
export GEMINI_API_KEY="your_gemini_api_key"
```

## Development

### Available Scripts

```bash
# Start development server with auto-reload
bun run dev

# Start production server
bun run start

# Install dependencies
bun install
```

### Project Structure

```
src/
├── api/
│   └── server.ts          # Main API server
├── services/
│   ├── ai.service.ts      # Multi-LLM AI service
│   ├── summary.service.ts # Video summarization logic
│   ├── youtube.service.ts # YouTube data extraction
│   └── transcript.service.ts # Video transcript extraction
├── utils/
│   ├── logger.ts          # Logging utility
│   └── puppeteer-manager.ts # Browser automation
└── config/
    └── constants.ts       # Configuration constants
```

## Troubleshooting

### Common Issues

**1. "No AI API key found" Error**
- Ensure at least one AI provider API key is set in your environment
- Check that environment variables are properly loaded
- Verify API keys are valid and have proper permissions

**2. "Channel not found" Error**
- Verify the channel name or URL is correct
- Some channels may have restrictions or be unavailable
- Try using the full channel URL instead of just the name

**3. "No videos found" Error**
- The channel may not have any public videos
- Check if the channel has recent uploads
- Some channels may have age restrictions or regional blocks

**4. Transcript Extraction Issues**
- Not all YouTube videos have transcripts available
- Auto-generated transcripts may not be available immediately for new videos
- Some videos may have transcript access disabled

### Rate Limiting

- The service implements automatic rate limiting and retry logic
- If you encounter rate limits, the system will automatically retry with exponential backoff
- Consider upgrading to paid tiers for higher API limits

### Performance Optimization

- Long videos are automatically chunked for better processing
- The system uses sequential processing to avoid overwhelming AI providers
- Browser instances are properly cleaned up after each request

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Create an issue on GitHub
3. Check the logs for detailed error information

---

**Note**: This service is designed for educational and research purposes. Always respect YouTube's Terms of Service and content creators' rights when using this tool.
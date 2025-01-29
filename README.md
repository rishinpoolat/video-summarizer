# YouTube Video Summarizer

An AI-powered tool built with Bun that automatically fetches and summarizes the latest videos from your favorite YouTube channels.

## Features

- 🎥 Automatically fetches the latest video from specified YouTube channels
- 📝 Extracts video transcripts using web scraping
- 🤖 Generates concise summaries using AI
- ⚡ Fast execution with Bun runtime
- 🔄 Automated daily summary generation
- 📱 Clean output format (terminal/web interface)

## Prerequisites

- [Bun](https://bun.sh) (latest version)
- Node.js 16.x or higher (for some dependencies)
- A Google Cloud Project for Gemini API (free tier available)
- A stable internet connection

## Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd video-summarizer
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your API keys and configuration.

## Configuration

Create a `.env` file with the following variables:

```env
GEMINI_API_KEY=your_gemini_api_key
```

## Usage

### CLI Mode

```bash
bun run summarize <youtube-channel-url>
```

### Web Interface (Optional)

1. Start the web server:
   ```bash
   bun run server
   ```

2. Open `http://localhost:3000` in your browser

## Project Structure

```
video-summarizer/
├── src/
│   ├── index.ts              # Main entry point
│   ├── scraper/             # YouTube scraping logic
│   ├── summarizer/          # AI summarization logic
│   └── utils/               # Helper functions
├── config/                  # Configuration files
├── scripts/                # Automation scripts
└── docs/                   # Additional documentation
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

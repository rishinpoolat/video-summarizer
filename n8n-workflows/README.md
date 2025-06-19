# Video Summarizer Telegram Bot with n8n

This guide will help you set up a Telegram bot using n8n that integrates with your Video Summarizer API to provide both text and audio summaries of YouTube videos.

## 🤖 Bot Features

- **🎬 Video Summarization**: Get summaries of latest videos from YouTube channels
- **📝 Text Response**: Formatted text summary with video details
- **🔊 Audio Response**: Text-to-speech audio file of the summary
- **⚡ Multiple TTS Options**: Choose between OpenAI TTS or ElevenLabs
- **🛡️ Error Handling**: Proper error messages for failed requests

## 📋 Prerequisites

Before setting up the n8n workflow, ensure you have:

1. **n8n installed and running** ([Installation Guide](https://docs.n8n.io/hosting/))
2. **Video Summarizer API running** on `http://localhost:3000`
3. **Telegram Bot Token** (see setup below)
4. **Text-to-Speech API Key** (OpenAI or ElevenLabs)

## 🔧 Setup Instructions

### 1. Create Telegram Bot

1. **Start BotFather on Telegram:**
   - Open Telegram and search for `@BotFather`
   - Send `/start` to begin

2. **Create New Bot:**
   ```
   /newbot
   ```
   - Choose a name: `Video Summarizer Bot`
   - Choose a username: `your_video_summarizer_bot`

3. **Save Bot Token:**
   - Copy the bot token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
   - Keep this token secure - you'll need it for n8n

4. **Optional - Set Bot Commands:**
   ```
   /setcommands
   ```
   Then send:
   ```
   start - Start the bot and see instructions
   ```

### 2. Configure n8n Credentials

#### Telegram Bot API Credential

1. **In n8n, go to:** Settings → Credentials → Add Credential
2. **Select:** Telegram API
3. **Fill in:**
   - **Name:** `Telegram Bot API`
   - **Access Token:** Your bot token from BotFather
4. **Save** the credential

#### Text-to-Speech API Credentials

**Option A: OpenAI TTS (Recommended)**
1. **Create Variable:** Settings → Variables → Add Variable
2. **Add:**
   - **Key:** `OPENAI_API_KEY`
   - **Value:** Your OpenAI API key
   - **Type:** String (encrypted)

**Option B: ElevenLabs TTS (Higher Quality)**
1. **Create Variable:** Settings → Variables → Add Variable  
2. **Add:**
   - **Key:** `ELEVENLABS_API_KEY`
   - **Value:** Your ElevenLabs API key
   - **Type:** String (encrypted)

### 3. Import n8n Workflow

1. **Download the workflow file:**
   ```bash
   # The workflow file is located at:
   # n8n-workflows/video-summarizer-telegram-bot.json
   ```

2. **Import in n8n:**
   - Go to n8n dashboard
   - Click **"Import from file"**
   - Select `video-summarizer-telegram-bot.json`
   - Click **"Import"**

3. **Configure Credentials:**
   - Click on each Telegram node
   - Select your `Telegram Bot API` credential
   - Save the workflow

### 4. Configure API Endpoint

1. **Update API URL (if needed):**
   - Find the `Call Video Summarizer API` node
   - Update the URL if your API is not running on `http://localhost:3000`
   - For production, use your actual API URL

2. **Activate Webhook:**
   - Click on `Telegram Trigger` node
   - Copy the webhook URL
   - The webhook will be automatically set when you activate the workflow

### 5. Choose Text-to-Speech Provider

The workflow includes both OpenAI TTS and ElevenLabs options. **Choose one:**

#### Option A: Use OpenAI TTS (Default)
- **Pros:** Cheaper, good quality, multiple voices
- **Cost:** ~$0.015 per 1K characters
- **Setup:** Just add `OPENAI_API_KEY` variable
- **Keep:** `Generate Audio with OpenAI TTS` node
- **Remove:** `Generate Audio with ElevenLabs` node

#### Option B: Use ElevenLabs TTS (Premium)
- **Pros:** Superior voice quality, more natural
- **Cost:** ~$0.18 per 1K characters  
- **Setup:** Add `ELEVENLABS_API_KEY` variable
- **Keep:** `Generate Audio with ElevenLabs` node
- **Remove:** `Generate Audio with OpenAI TTS` node

### 6. Activate Workflow

1. **Save** the workflow
2. **Click "Activate"** toggle in top-right
3. **Test** by sending a message to your bot

## 🚀 Usage

### Starting the Bot

1. **Find your bot** on Telegram (search for your bot's username)
2. **Send:** `/start`
3. **You'll receive:** Welcome message with instructions

### Getting Video Summaries

**Send any of these formats:**

```
Fireship
TechWorld with Nana
@channel_name
https://www.youtube.com/@channelname
```

### Expected Response

1. **Processing Message:** "🔄 Processing your request..."
2. **Text Summary:** Formatted summary with video details
3. **Audio Summary:** MP3 file with spoken summary

## 🎛️ Workflow Configuration

### Node Breakdown

| Node | Purpose | Configuration |
|------|---------|---------------|
| **Telegram Trigger** | Receives messages | Bot token credential |
| **Check Start Command** | Handles `/start` | Filters start command |
| **Send Welcome Message** | Bot introduction | Welcome text |
| **Check Channel Request** | Validates input | Filters non-commands |
| **Send Processing Message** | User feedback | "Processing..." message |
| **Call Video Summarizer API** | Gets summary | Your API endpoint |
| **Check API Success** | Error handling | Validates API response |
| **Format Summary Response** | Text processing | Formats for display/TTS |
| **Send Text Summary** | Text response | Formatted summary |
| **Generate Audio** | TTS conversion | OpenAI/ElevenLabs API |
| **Send Audio Summary** | Audio response | MP3 file |
| **Send Error Message** | Error handling | Error notifications |

### Customization Options

#### 1. Change TTS Voice (OpenAI)

Edit the `Generate Audio with OpenAI TTS` node:
```json
{
  "model": "tts-1-hd",  // Higher quality model
  "voice": "nova",      // Available: alloy, echo, fable, onyx, nova, shimmer
  "speed": 1.0         // 0.25 to 4.0
}
```

#### 2. Change TTS Voice (ElevenLabs)

Edit the `Generate Audio with ElevenLabs` node:
```json
{
  "voice_settings": {
    "stability": 0.5,        // 0.0 to 1.0
    "similarity_boost": 0.75, // 0.0 to 1.0
    "style": 0.5,            // 0.0 to 1.0
    "use_speaker_boost": true
  }
}
```

#### 3. Modify Response Format

Edit the `Format Summary Response` code node to customize:
- Message formatting
- Text cleaning for TTS
- Summary length limits

## 🔍 Troubleshooting

### Common Issues

**1. Bot not responding:**
- Check if workflow is activated
- Verify bot token is correct
- Ensure webhook is set properly

**2. API errors:**
- Confirm Video Summarizer API is running
- Check API endpoint URL in workflow
- Verify API has proper AI provider keys

**3. Audio generation fails:**
- Check TTS API credentials
- Verify API key variables are set
- Ensure text length is within limits

**4. "Channel not found" errors:**
- User should try full channel URL
- Check if channel exists and is public
- Some channels may have restrictions

### Debug Mode

1. **Enable in n8n:** Settings → Log Level → Debug
2. **Check logs:** Executions tab → Select failed execution
3. **View node data:** Click on individual nodes to see input/output

### API Limits

| Provider | Free Tier | Rate Limits |
|----------|-----------|-------------|
| **OpenAI TTS** | $18 credit | 50 RPM |
| **ElevenLabs** | 10,000 chars/month | 2 requests/second |
| **Groq (Video API)** | 6,000 requests/day | 30 RPM |

## 🔒 Security Considerations

1. **Keep credentials secure:**
   - Never share bot tokens
   - Use n8n's encrypted variables
   - Regularly rotate API keys

2. **Rate limiting:**
   - Consider adding user limits
   - Implement cooldown periods
   - Monitor API usage

3. **Input validation:**
   - The workflow validates basic input
   - Consider adding more strict filters
   - Monitor for abuse patterns

## 📈 Monitoring & Analytics

### Track Usage

Add a **HTTP Request** node to log usage:
```json
{
  "url": "your-analytics-endpoint",
  "method": "POST",
  "body": {
    "user_id": "{{ $json.message.from.id }}",
    "username": "{{ $json.message.from.username }}",
    "channel_requested": "{{ $json.message.text }}",
    "timestamp": "{{ $now }}"
  }
}
```

### Monitor Costs

Track API usage for cost management:
- OpenAI: Check usage dashboard
- ElevenLabs: Monitor character usage
- Set up billing alerts

## 🚀 Advanced Features

### Add More Commands

Extend the workflow with additional commands:

```javascript
// In Check Start Command node, add more conditions:
if (text === '/help') {
  // Show help message
} else if (text === '/stats') {
  // Show bot statistics  
} else if (text.startsWith('/video ')) {
  // Direct video URL processing
}
```

### Multi-language Support

Add language detection and TTS:

```javascript
// Detect language and choose appropriate TTS voice
const language = detectLanguage(summary);
const voice = language === 'es' ? 'spanish_voice' : 'english_voice';
```

## 📞 Support

If you encounter issues:

1. **Check the workflow logs** in n8n executions
2. **Verify all credentials** are properly configured
3. **Test the Video Summarizer API** independently
4. **Check API provider status** pages
5. **Review Telegram Bot API docs** for bot-specific issues

---

**🎉 Enjoy your Video Summarizer Telegram Bot!**

Your users can now get instant video summaries in both text and audio format directly through Telegram.
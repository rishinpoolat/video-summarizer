# 🤖 Complete Telegram Bot Setup Guide

This guide walks you through creating a Telegram bot from scratch and getting all the necessary credentials for the Video Summarizer n8n workflow.

## 📱 Step 1: Create Telegram Bot

### 1.1 Find BotFather

1. **Open Telegram** (mobile app or web)
2. **Search for:** `@BotFather`
3. **Start conversation:** Click "Start" or send `/start`

### 1.2 Create Your Bot

1. **Send command:** `/newbot`
2. **Choose bot name:** 
   ```
   Video Summarizer Bot
   ```
   *(This is the display name users will see)*

3. **Choose username:** 
   ```
   your_video_summarizer_bot
   ```
   *(Must end with 'bot' and be unique)*

4. **Save the token:** 
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
   ⚠️ **Keep this secret! This is your bot's access token.**

### 1.3 Configure Bot (Optional)

**Set bot description:**
```
/setdescription
```
Then send:
```
Get instant summaries of YouTube videos in text and audio format! Just send me a channel name.
```

**Set bot commands:**
```
/setcommands
```
Then send:
```
start - Start the bot and see instructions
help - Get help with using the bot
```

**Set bot picture:**
```
/setuserpic
```
Upload a relevant image for your bot.

## 🔑 Step 2: Get Text-to-Speech API Keys

You need **at least one** TTS provider. Choose based on your needs:

### Option A: OpenAI TTS (Recommended for beginners)

**Pros:**
- ✅ Good quality voice
- ✅ Affordable pricing ($0.015/1K chars)
- ✅ Multiple voice options
- ✅ Easy setup

**Setup:**

1. **Go to:** [OpenAI Platform](https://platform.openai.com/)
2. **Sign up/Login** to your account
3. **Navigate to:** API Keys section
4. **Create new key:** 
   - Click "Create new secret key"
   - Name: "Video Summarizer Bot"
   - Copy the key: `sk-proj-...` (starts with sk-proj)
5. **Add billing:** Set up payment method for API usage

**Cost Example:**
- 500-word summary ≈ 2,500 characters
- Cost: ~$0.037 per summary
- $10 = ~270 summaries

### Option B: ElevenLabs TTS (Premium quality)

**Pros:**
- ✅ Superior voice quality
- ✅ Very natural sounding
- ✅ Multiple voice cloning options
- ❌ More expensive ($0.18/1K chars)

**Setup:**

1. **Go to:** [ElevenLabs](https://elevenlabs.io/)
2. **Sign up** for an account
3. **Navigate to:** Profile → API Keys
4. **Create API key:** Copy the key
5. **Choose plan:** 
   - Free: 10,000 characters/month
   - Starter: $5/month for 30,000 characters
   - Creator: $22/month for 100,000 characters

**Cost Example:**
- 500-word summary ≈ 2,500 characters  
- Cost: ~$0.45 per summary
- Free tier: ~4 summaries/month

## 🔧 Step 3: Set Up n8n Environment

### 3.1 Install n8n

**Option A: Using npm (Recommended)**
```bash
npm install n8n -g
n8n start
```

**Option B: Using Docker**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**Option C: Using npx (No installation)**
```bash
npx n8n
```

**Access n8n:** Open `http://localhost:5678`

### 3.2 Create n8n Account

1. **Open n8n** in your browser
2. **Create account** with email/password
3. **Complete setup** wizard

## 🛠️ Step 4: Configure n8n Credentials

### 4.1 Add Telegram Bot Credential

1. **In n8n dashboard:**
   - Click **Settings** (gear icon)
   - Select **Credentials**
   - Click **"Add Credential"**

2. **Search and select:** `Telegram API`

3. **Fill in details:**
   - **Name:** `Telegram Bot API`
   - **Access Token:** Paste your bot token from Step 1.2
   - **Test connection** (optional)
   - **Save**

### 4.2 Add TTS API Credentials

**For OpenAI:**

1. **Create Environment Variable:**
   - Go to **Settings** → **Environment Variables**
   - Click **"Add Variable"**
   - **Key:** `OPENAI_API_KEY`
   - **Value:** Your OpenAI API key (sk-proj-...)
   - **Type:** String
   - **Encrypted:** ✅ Yes
   - **Save**

**For ElevenLabs:**

1. **Create Environment Variable:**
   - Go to **Settings** → **Environment Variables**  
   - Click **"Add Variable"**
   - **Key:** `ELEVENLABS_API_KEY`
   - **Value:** Your ElevenLabs API key
   - **Type:** String
   - **Encrypted:** ✅ Yes
   - **Save**

## 📥 Step 5: Import and Configure Workflow

### 5.1 Download Workflow

The workflow file is located at:
```
n8n-workflows/video-summarizer-telegram-bot.json
```

### 5.2 Import Workflow

1. **In n8n dashboard:**
   - Click **"New"** → **"Import from File"**
   - Select `video-summarizer-telegram-bot.json`
   - Click **"Import"**

### 5.3 Configure Workflow Nodes

**Configure Telegram nodes:**

1. **Click on each Telegram node** (there are 4 of them):
   - `Telegram Trigger`
   - `Send Welcome Message`  
   - `Send Text Summary`
   - `Send Audio Summary`
   - `Send Error Message`

2. **For each node:**
   - Click **"Credential for Telegram API"**
   - Select **"Telegram Bot API"** (the one you created)
   - **Save**

**Configure API endpoint:**

1. **Click on** `Call Video Summarizer API` **node**
2. **Update URL if needed:**
   - Local development: `http://localhost:3000/summarize`
   - Production: `https://your-domain.com/summarize`
3. **Save**

**Choose TTS provider:**

The workflow has both OpenAI and ElevenLabs nodes. **Remove the one you don't want:**

- **If using OpenAI:** Delete `Generate Audio with ElevenLabs` node
- **If using ElevenLabs:** Delete `Generate Audio with OpenAI TTS` node

## ⚡ Step 6: Activate and Test

### 6.1 Activate Workflow

1. **Save** the workflow (Ctrl+S)
2. **Click the "Active" toggle** in the top-right corner
3. **Confirm** the webhook is activated

### 6.2 Test Your Bot

1. **Find your bot on Telegram:**
   - Search for your bot's username
   - Start a conversation

2. **Send test messages:**
   ```
   /start
   ```
   *Should receive welcome message*

   ```
   Fireship
   ```
   *Should process and return summary*

3. **Expected flow:**
   - "🔄 Processing your request..."
   - Text summary with video details
   - Audio file with spoken summary

## 🔍 Step 7: Troubleshooting

### Common Issues & Solutions

**❌ Bot doesn't respond to messages:**

- ✅ Check workflow is **Active** (toggle on)
- ✅ Verify bot token is correct in credentials
- ✅ Ensure webhook URL is set (happens automatically when active)

**❌ "Error occurred while processing":**

- ✅ Check Video Summarizer API is running on correct port
- ✅ Verify API endpoint URL in workflow
- ✅ Ensure API has AI provider keys configured

**❌ Audio generation fails:**

- ✅ Check TTS API key is correct
- ✅ Verify environment variable name matches workflow
- ✅ Check API provider has sufficient credits/quota

**❌ "Channel not found":**

- ✅ User should try different channel name formats
- ✅ Some channels may be private or restricted
- ✅ Try with full channel URL

### Debug Mode

1. **Enable debug logging:**
   - Settings → General → Log Level → Debug

2. **Check execution logs:**
   - Go to **Executions** tab
   - Click on failed execution
   - Check each node's input/output data

3. **Test individual nodes:**
   - Click **"Execute Node"** to test specific steps

## 📊 Step 8: Monitor Usage

### Track Costs

**OpenAI:**
- Dashboard: [Usage Page](https://platform.openai.com/usage)
- Set up billing alerts

**ElevenLabs:**
- Dashboard: Check character usage
- Monitor monthly limits

### Usage Analytics

Add a simple logging node to track:
- Number of requests per user
- Popular channels
- Error rates
- Response times

## 🚀 Step 9: Go Live!

### Share Your Bot

1. **Get bot link:**
   ```
   https://t.me/your_video_summarizer_bot
   ```

2. **Share with users:**
   - Social media
   - Documentation
   - QR codes

### Production Considerations

1. **Use HTTPS for API** (not localhost)
2. **Set up monitoring** and alerting
3. **Implement rate limiting** to prevent abuse
4. **Regular backup** of n8n workflows
5. **Monitor API costs** and set spending limits

---

## 🎉 Congratulations!

Your Video Summarizer Telegram bot is now ready! Users can:

- ✅ Send channel names to get video summaries
- ✅ Receive formatted text responses  
- ✅ Get audio versions of summaries
- ✅ Use simple commands like `/start`

**Example usage:**
```
User: Fireship
Bot: 🔄 Processing your request for: Fireship
Bot: 🎬 **I tried 8 different languages**
     📺 Channel: Fireship
     📝 Summary: In this video, the creator explores...
Bot: 🔊 [Audio file with spoken summary]
```

Enjoy your new AI-powered Telegram bot! 🤖✨
# 🔧 Environment Variables Setup Guide

This guide explains all the environment variables needed for the Video Summarizer API and n8n Telegram bot integration.

## 📋 **Required vs Optional Variables**

### **🚨 Required (Choose at least one AI provider):**
- One AI Provider API Key (Groq, OpenAI, Anthropic, or Google)
- Telegram Bot Token (for n8n workflow)

### **🔧 Optional (for enhanced features):**
- Text-to-Speech API keys (for audio summaries)
- Custom server configuration

---

## 🤖 **AI Provider Setup (Required)**

The system uses a **priority-based fallback system**. Set up providers in order of preference:

### **1. Groq API (Highest Priority - Recommended)**

**Why choose Groq:**
- ✅ **Free tier**: 30 requests/minute, 6000 requests/day
- ✅ **Fast**: Very quick response times
- ✅ **Good quality**: llama-3.3-70b-versatile model

**Setup:**
1. Go to [Groq Console](https://console.groq.com/)
2. Sign up/login
3. Create API key
4. Add to your `.env`:
```bash
GROQ_API_KEY=gsk_your_actual_groq_key_here
```

### **2. OpenAI API (Second Priority)**

**Why choose OpenAI:**
- ✅ **Reliable**: Industry standard
- ✅ **Dual purpose**: Can use for both summarization AND text-to-speech
- ✅ **Good quality**: gpt-4o-mini model

**Setup:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create API key
3. Add billing method
4. Add to your `.env`:
```bash
OPENAI_API_KEY=sk-proj-your_actual_openai_key_here
```

### **3. Anthropic API (Third Priority)**

**Why choose Anthropic:**
- ✅ **High quality**: Claude models
- ✅ **Good reasoning**: Excellent for summarization

**Setup:**
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create API key
3. Add to your `.env`:
```bash
ANTHROPIC_API_KEY=sk-ant-your_actual_anthropic_key_here
```

### **4. Google Gemini (Lowest Priority)**

**Why choose Google:**
- ✅ **Free tier**: Available
- ✅ **Fallback option**: Good as backup

**Setup:**
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create API key
3. Add to your `.env`:
```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_actual_gemini_key_here
```

---

## 🔊 **Text-to-Speech Setup (Optional)**

For audio summaries in your Telegram bot:

### **Option 1: OpenAI TTS (Recommended)**

**If you already have OpenAI API key:**
- ✅ **No additional setup needed**
- ✅ **Cost**: ~$0.015 per 1K characters
- ✅ **Quality**: Good, multiple voices

**n8n Environment Variable:**
```bash
OPENAI_API_KEY=sk-proj-your_openai_key_here
```

### **Option 2: ElevenLabs TTS (Premium)**

**For highest quality audio:**
- 🎵 **Superior quality**: Very natural voices
- 💰 **Cost**: ~$0.18 per 1K characters
- 🆓 **Free tier**: 10,000 characters/month

**Setup:**
1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Sign up and get API key
3. Add to n8n Environment Variables:
```bash
ELEVENLABS_API_KEY=your_elevenlabs_key_here
```

---

## 📱 **Telegram Bot Setup (Required for n8n)**

### **Create Telegram Bot:**

1. **Open Telegram** and search for `@BotFather`
2. **Send**: `/newbot`
3. **Choose name**: `Your Video Summarizer Bot`
4. **Choose username**: `your_unique_bot_name_bot`
5. **Save the token**: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### **Add to n8n (not .env file):**

In n8n Cloud:
1. **Settings** → **Credentials** → **Add Credential**
2. **Select**: `Telegram API`
3. **Name**: `Telegram Bot API`
4. **Access Token**: Your bot token
5. **Save**

---

## 🌐 **Tunnel Setup (Required for n8n Cloud)**

Since n8n Cloud can't access your localhost, you need a tunnel:

### **Using ngrok (Recommended):**

```bash
# Install ngrok
brew install ngrok

# Start your API
bun run start

# In another terminal, expose port 3000
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this URL in your n8n workflow
```

### **Update n8n Workflow:**

In your n8n "Call Video Summarizer API" node:
```
URL: https://your-ngrok-url.ngrok.io/summarize
```

**⚠️ Note**: ngrok URL changes when restarted (unless paid plan)

---

## 📁 **Complete .env File Example**

Create `.env` file in your project root:

```bash
# Copy from .env.example and fill in your actual keys
cp .env.example .env
```

**Minimal setup (just one AI provider):**
```bash
# Choose ONE of these AI providers
GROQ_API_KEY=gsk_your_actual_groq_key_here

# Application settings
NODE_ENV=development
LOG_LEVEL=info
```

**Full setup (all options):**
```bash
# AI Providers (use all for maximum reliability)
GROQ_API_KEY=gsk_your_actual_groq_key_here
OPENAI_API_KEY=sk-proj-your_actual_openai_key_here
ANTHROPIC_API_KEY=sk-ant-your_actual_anthropic_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_actual_gemini_key_here

# TTS (if using ElevenLabs instead of OpenAI TTS)
ELEVENLABS_API_KEY=your_actual_elevenlabs_key_here

# Application settings
NODE_ENV=development
LOG_LEVEL=info
PORT=3000
HOSTNAME=0.0.0.0
```

---

## 📋 **n8n Environment Variables**

In n8n Cloud, add these Environment Variables:

### **For OpenAI TTS:**
```
Key: OPENAI_API_KEY
Value: sk-proj-your_actual_openai_key_here
Type: String (encrypted)
```

### **For ElevenLabs TTS:**
```
Key: ELEVENLABS_API_KEY  
Value: your_actual_elevenlabs_key_here
Type: String (encrypted)
```

---

## ✅ **Setup Verification**

### **1. Test API:**
```bash
# Start your API
bun run start

# Test health endpoint
curl http://localhost:3000/health

# Test summarization (should work with your AI provider)
curl -X POST http://localhost:3000/summarize \
  -H "Content-Type: application/json" \
  -d '{"channel": "Fireship"}'
```

### **2. Test Tunnel:**
```bash
# Test via ngrok URL
curl https://your-ngrok-url.ngrok.io/health
```

### **3. Test Telegram Bot:**
- Send `/start` to your bot
- Send a channel name like `Fireship`
- Should receive text summary and audio file

---

## 🔍 **Troubleshooting**

### **"No AI API key found" Error:**
- Check that at least one AI provider key is set in `.env`
- Restart your API server after adding keys
- Verify key format and validity

### **"Service refused connection" in n8n:**
- Ensure ngrok is running and URL is correct in n8n
- Try `127.0.0.1` instead of `localhost` in tunnel
- Check if API is accessible via curl

### **Telegram bot not responding:**
- Verify bot token is correct in n8n credentials
- Check if n8n workflow is activated
- Ensure webhook is properly set up

### **Audio generation fails:**
- Check TTS API key is set in n8n Environment Variables
- Verify API key has sufficient credits
- Check text length isn't exceeding limits

---

## 💡 **Cost Optimization Tips**

1. **Use Groq first** - free tier covers most usage
2. **OpenAI for TTS** - cheaper than ElevenLabs
3. **Monitor usage** - set up billing alerts
4. **Test with short videos** - to avoid high costs during development

---

## 🚀 **Quick Start Checklist**

- [ ] ✅ Get at least one AI provider API key
- [ ] ✅ Create `.env` file with your keys
- [ ] ✅ Test API locally with `curl`
- [ ] ✅ Create Telegram bot with @BotFather
- [ ] ✅ Install and start ngrok tunnel
- [ ] ✅ Import n8n workflow and configure credentials
- [ ] ✅ Update n8n workflow with ngrok URL
- [ ] ✅ Add TTS API key to n8n Environment Variables
- [ ] ✅ Test end-to-end with Telegram bot

You're ready to go! 🎉
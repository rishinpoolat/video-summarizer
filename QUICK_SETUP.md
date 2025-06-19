# ⚡ Quick Setup Reference

## 🚨 **Minimal Required Setup**

### **1. API (.env file)**
```bash
# Choose ONE AI provider (Groq recommended for free tier)
GROQ_API_KEY=gsk_your_actual_groq_key_here

# Basic config
NODE_ENV=development
LOG_LEVEL=info
```

### **2. Telegram Bot**
1. Message `@BotFather` on Telegram
2. Send: `/newbot`
3. Save token: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### **3. n8n Cloud Setup**
1. **Credentials**: Add Telegram API with bot token
2. **Environment Variables**: Add `OPENAI_API_KEY` (for TTS)
3. **Workflow**: Update API URL to your ngrok URL

### **4. Tunnel (for n8n Cloud)**
```bash
# Terminal 1: Start API
bun run start

# Terminal 2: Start tunnel
ngrok http 3000
# Use the https URL in n8n workflow
```

---

## 🔑 **API Keys Quick Reference**

| Provider | Priority | Free Tier | Get Key From |
|----------|----------|-----------|--------------|
| **Groq** | 1st | ✅ 6000/day | [console.groq.com](https://console.groq.com/) |
| **OpenAI** | 2nd | ❌ Pay-as-go | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Anthropic** | 3rd | ❌ Pay-as-go | [console.anthropic.com](https://console.anthropic.com/) |
| **Google** | 4th | ✅ Limited | [makersuite.google.com](https://makersuite.google.com/) |

---

## 📱 **n8n Variables**

Add these in n8n Cloud → Settings → Environment Variables:

```bash
# For OpenAI TTS (recommended)
OPENAI_API_KEY=sk-proj-your_key_here

# OR for ElevenLabs TTS (premium)
ELEVENLABS_API_KEY=your_elevenlabs_key_here
```

---

## 🧪 **Test Commands**

```bash
# Test API health
curl http://localhost:3000/health

# Test API with channel
curl -X POST http://localhost:3000/summarize \
  -H "Content-Type: application/json" \
  -d '{"channel": "Fireship"}'

# Test via ngrok
curl https://your-ngrok-url.ngrok.io/health
```

---

## 🔧 **Common Issues & Fixes**

| Issue | Solution |
|-------|----------|
| **"No AI API key found"** | Add at least one AI key to `.env` |
| **"Service refused connection"** | Check ngrok URL in n8n workflow |
| **Bot not responding** | Verify bot token in n8n credentials |
| **No audio summaries** | Add TTS key to n8n Environment Variables |

---

**💡 Pro Tip**: Start with Groq (free) + OpenAI TTS, then add more providers as needed!
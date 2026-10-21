# Voice Agent — Setup Guide

## 1. Prerequisites (things to create before running)

### A. Twilio
1. Sign up at twilio.com
2. Buy a phone number with **Voice** capabilities (any country)
3. Enable **WhatsApp** on your account:
   - Go to Messaging → Try it out → Send a WhatsApp message → follow the sandbox instructions
   - Later: apply for a production WhatsApp sender under Messaging → Senders → WhatsApp
4. Note your **Account SID**, **Auth Token**, **phone number**, **WhatsApp sender** (sandbox = `whatsapp:+14155238886`)

### B. Google Sheets
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project → Enable the **Google Sheets API**
3. Create a **Service Account**: IAM → Service Accounts → Create
4. Generate a JSON key for the service account → download it
5. Create a Google Sheet with two tabs:

**Catalog tab** (row 1 = header, data starts row 2):
| A: id | B: name_en | C: name_ar | D: category | E: price | F: available |
|---|---|---|---|---|---|
| 1 | Pizza Margherita | بيتزا مارغريتا | Pizza | 89 | true |
| 2 | Burger Classic | برجر كلاسيك | Burgers | 65 | true |

**Orders tab** (row 1 = header):
| A: timestamp | B: call_sid | C: customer_name | D: phone | E: items_json | F: total | G: address | H: notes | I: status |

6. Share the Sheet with your service account email (Editor access)
7. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

### C. Your VPS (Hostinger)
1. Point a subdomain DNS A-record to your VPS IP: `agent.yourdomain.com → VPS_IP`
2. SSH into the VPS and install:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   npm install -g pm2
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update && sudo apt install caddy
   ```

---

## 2. Configure environment

```bash
cp .env.example .env
nano .env   # fill in all values
```

Key values to fill:
- `PUBLIC_URL` — `https://agent.yourdomain.com`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_FROM`
- `OPENAI_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (the entire key including newlines, escaped as `\n`)
- `GOOGLE_SHEET_ID`
- `OPERATOR_WHATSAPP` — your WhatsApp number to receive new order alerts, e.g. `whatsapp:+201234567890`

---

## 3. Customize your business

Edit `config/business.json`:
```json
{
  "name": "My Restaurant",
  "nameAr": "مطعمي",
  "greeting": "Hello, welcome to My Restaurant!",
  "greetingAr": "أهلاً، مرحباً في مطعمنا!",
  "hours": "Daily 10 AM – 12 AM",
  "hoursAr": "يومياً من ١٠ صباحاً حتى ١٢ منتصف الليل",
  "currency": "EGP",
  "requiresAddress": true,
  "requiresPhone": true
}
```

---

## 4. Deploy to VPS

```bash
# On your local machine — copy files to VPS
rsync -avz --exclude node_modules --exclude dist --exclude .env \
  "c:/abdo/PROJECTS/VOICE AGENT/" user@VPS_IP:/opt/voice-agent/

# SSH into VPS
ssh user@VPS_IP

cd /opt/voice-agent
cp .env.example .env   # then fill in values with nano .env
npm install
npm run build

# Start with PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # run the command it outputs to auto-start on boot
```

---

## 5. Configure Caddy

```bash
# Edit Caddyfile to use your real domain
sudo nano /etc/caddy/Caddyfile
# Paste the contents of the Caddyfile in this project, replacing yourdomain.com

sudo systemctl reload caddy
```

---

## 6. Wire Twilio webhook

In the Twilio Console → Phone Numbers → your number → Voice:
- **A call comes in**: Webhook → `https://agent.yourdomain.com/voice` (HTTP POST)

---

## 7. Test

```bash
# Local test with ngrok (before VPS deploy)
npx tsx src/server.ts &
ngrok http 3000
# Use the ngrok URL as PUBLIC_URL in .env and as the Twilio webhook
```

Call your Twilio number. The agent should:
1. Answer in Arabic and English
2. Take your order
3. Send a WhatsApp confirmation to your number
4. Notify the operator WhatsApp

---

## Troubleshooting

| Problem | Fix |
|---|---|
| No audio / silence on call | Check Twilio Media Stream WS connects to `/media` — look at VPS logs |
| OpenAI WS error | Verify `OPENAI_API_KEY` has Realtime API access |
| Google Sheets 403 | Make sure you shared the Sheet with the service account email |
| WhatsApp not delivered | Use Twilio sandbox first; check `TWILIO_WHATSAPP_FROM` format |
| Caddy 502 | Make sure the Node process is running: `pm2 status` |

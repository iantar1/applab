/**
 * WhatsApp bridge: long-lived process using whatsapp-web.js.
 * Run from repo root: pnpm run whatsapp (or node whatsapp/index.js)
 * Requires DATABASE_URL in .env (loaded from parent directory).
 *
 * Chrome/Chromium: Puppeteer needs a browser. Either:
 * 1. Install Chromium: sudo apt install chromium-browser (Ubuntu/Debian)
 * 2. Or set PUPPETEER_EXECUTABLE_PATH to your Chrome/Chromium path
 * 3. Or install via Puppeteer: npx puppeteer browsers install chrome
 */
const path = require('path');
const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');

// Load .env from project root (parent of whatsapp/)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const prisma = new PrismaClient();
const PORT = process.env.WHATSAPP_BRIDGE_PORT || 3001;

let client = null;
let clientReady = false;
let currentQr = null; // latest QR string for GET /qr

/** Resolve Chrome/Chromium executable so Puppeteer can find it (avoids "Could not find Chrome" on Linux). */
function getChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    const p = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (fs.existsSync(p)) return p;
  }
  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/snap/bin/chromium',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const out = execSync('which chromium chromium-browser google-chrome-stable google-chrome 2>/dev/null || true', { encoding: 'utf8' });
    const lines = out.trim().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const p = line.trim().split(/\s/)[0];
      if (p && fs.existsSync(p)) return p;
    }
  } catch (_) {}
  return null;
}

function getClient() {
  if (!client) {
    const chromePath = getChromePath();
    const puppeteerOpts = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    };
    if (chromePath) {
      puppeteerOpts.executablePath = chromePath;
      console.log('Using browser:', chromePath);
    } else {
      console.warn('Chrome/Chromium not found. Install with: sudo apt install chromium-browser');
      console.warn('Or set PUPPETEER_EXECUTABLE_PATH to your Chrome path.');
    }

    client = new Client({
      authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '..', '.wwebjs_auth') }),
      puppeteer: puppeteerOpts,
    });

    client.on('ready', () => {
      clientReady = true;
      currentQr = null;
      console.log('WhatsApp client is ready');
    });

    client.on('qr', async (qr) => {
      currentQr = qr;
      clientReady = false;
      console.log('QR received, scan with WhatsApp');
    });

    client.on('message', async (msg) => {
      try {
        const from = msg.from; // e.g. 212xxxxxxxx@s.whatsapp.net
        const fromPhone = from.replace('@s.whatsapp.net', '').replace('@c.us', '');
        let toPhone = '';
        if (client.info && client.info.wid) {
          toPhone = String(client.info.wid.user || '');
        }
        const body = msg.body || '';
        const contact = await msg.getContact();
        const senderName = contact.pushname || contact.name || null;

        await prisma.message.create({
          data: {
            fromPhone,
            toPhone,
            body,
            sender: senderName,
            direction: 'inbound',
          },
        });

        // Ask app AI to answer the client and send reply back
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
        const replySecret = process.env.AI_WHATSAPP_REPLY_SECRET || '';
        try {
          const headers = { 'Content-Type': 'application/json' };
          if (replySecret) headers['Authorization'] = `Bearer ${replySecret}`;
          const res = await fetch(`${appUrl}/api/ai/whatsapp-reply`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ fromPhone, body }),
          });
          const data = await res.json().catch(() => ({}));
          const reply = data?.reply;
          if (reply && typeof reply === 'string' && reply.trim()) {
            await client.sendMessage(msg.from, reply.trim());
            await prisma.message.create({
              data: {
                fromPhone: toPhone,
                toPhone: fromPhone,
                body: reply.trim(),
                sender: 'AppointLab',
                direction: 'outbound',
              },
            });
          }
        } catch (replyErr) {
          console.error('Error getting/sending AI reply:', replyErr);
        }
      } catch (err) {
        console.error('Error saving inbound message:', err);
      }
    });

    client.on('disconnected', () => {
      clientReady = false;
    });

    client.initialize();
  }
  return client;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '', `http://localhost:${PORT}`);
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (url.pathname === '/status' && method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ ready: clientReady }));
      return;
    }

    if (url.pathname === '/qr' && method === 'GET') {
      if (!currentQr) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ qr: null, ready: clientReady }));
        return;
      }
      try {
        const dataUrl = await QRCode.toDataURL(currentQr, { type: 'image/png', margin: 2 });
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ qr: dataUrl, ready: false }));
      } catch (err) {
        console.error('QR to image error:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to generate QR image' }));
      }
      return;
    }

    if (url.pathname === '/send' && method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const data = JSON.parse(body || '{}');
      const to = data.to ? String(data.to).trim() : '';
      const text = data.body != null ? String(data.body) : '';
      const sender = data.sender != null ? String(data.sender) : null;

      if (!to || !text) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'to and body are required' }));
        return;
      }

      if (!clientReady || !client) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(503);
        res.end(JSON.stringify({ error: 'WhatsApp client not ready' }));
        return;
      }

      const chatId = to.includes('@') ? to : to.replace(/\D/g, '') + '@s.whatsapp.net';
      await client.sendMessage(chatId, text);

      let fromPhone = '';
      if (client.info && client.info.wid) {
        fromPhone = String(client.info.wid.user || '');
      }
      await prisma.message.create({
        data: {
          fromPhone,
          toPhone: to.replace(/\D/g, ''),
          body: text,
          sender,
          direction: 'outbound',
        },
      });

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (err) {
    console.error('Bridge request error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(err.message) }));
  }
});

server.listen(PORT, () => {
  console.log(`WhatsApp bridge listening on http://localhost:${PORT}`);
  getClient();
});

import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

// server.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY in .env');
  process.exit(1);
}

app.use(express.static(path.join(__dirname, 'public')));

// Create an ephemeral Realtime session token for the browser.
// The token is short‑lived and scoped for WebRTC with the specified model & voice.
app.get('/session', async (req, res) => {
  try {
    const requestedModel = req.query.model && String(req.query.model);
    const model = requestedModel || process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-10-01';
    const body = {
      model,
      // Set default system behavior for the session.
      // Tweak this to make Eva sound like your receptionist.
      voice: 'verse', // other candidates often include: alloy, aria, breeze, etc. (varies by availability)
      instructions:
        'You are Eva, a warm, concise receptionist. Greet callers, ask how you can help, and speak clearly with a pleasant, natural tone. If interrupted, gracefully stop and listen.'
    };

    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        // Required beta header for Realtime API over WebRTC offer/answer
        'OpenAI-Beta': 'realtime=v1'
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).send(text);
    }

    const data = await r.json();
    // The browser will use data.client_secret.value as its Bearer token for the WebRTC handshake
    res.json({ client_secret: data.client_secret, model: body.model });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to create session');
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));



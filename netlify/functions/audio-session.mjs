import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

import { getStore } from "@netlify/blobs";

function getBlobStore(name) {
  try {
    return getStore(name);
  } catch {
    return null;
  }
}

function contentHash(str) {
  // FNV-1a 32-bit hash — fast, low collision
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function makeCacheKey(card, mode) {
  // Global cache key based on full card content + mode
  const raw = `${mode}:${card.front}:${card.back}`;
  return `audio-${contentHash(raw)}`;
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { card, mode } = await req.json();
    const store = await getBlobStore("global-cache");
    const key = makeCacheKey(card, mode);

    // Check cache first (skip if blob store unavailable)
    if (store) {
      try {
        const cached = await store.get(key, { type: "arrayBuffer" });
        if (cached && cached.byteLength > 0) {
          // Get script from separate key
          let script = "";
          try {
            script = await store.get(key + "-script") || "";
          } catch {}
          console.log("Cache HIT:", key, "size:", cached.byteLength);
          return new Response(cached, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "X-Script-Text": encodeURIComponent(script),
              "X-Cache": "hit",
            },
          });
        }
      } catch (e) {
        console.error("Cache read error:", e);
      }
    }

    // Generate text
    let text = "";
    if (mode === "podcast") {
      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: `You are a study tutor recording a short audio explanation. Write ONLY plain spoken text — no markdown, no headers, no bullet points, no hashtags, no formatting of any kind.

Rules:
- Aim for 250-350 words (about 60-90 seconds spoken)
- Conversational tone, like explaining to a friend
- Start directly with the topic — no "Let's talk about" every time, vary your openings
- One clear analogy to make it memorable
- End with the key takeaway in one sentence
- NEVER use # or ## or * or - or any formatting characters
- NEVER cut off mid-sentence — always complete your thought
- This text will be read aloud by text-to-speech, so write exactly how it should sound`,
        messages: [
          {
            role: "user",
            content: `Create a mini podcast explanation for:\n\nTopic: ${card.front}\nAnswer: ${card.back}\nCategory: ${card.category}`,
          },
        ],
      });
      text = message.content[0].text;
    } else {
      text = `Question: ${card.front}. ... Answer: ${card.back}`;
    }

    // Generate audio
    // Nova voice
    const voiceId = "qSeXEcewz7tA0Q0qk9fH";
    const audioRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.slice(0, 5000),
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!audioRes.ok) {
      const errText = await audioRes.text();
      throw new Error(`ElevenLabs error: ${audioRes.status} - ${errText}`);
    }

    const audioBuffer = await audioRes.arrayBuffer();

    // Cache the audio + script — save audio as blob, script as separate JSON key
    // Do both saves in parallel to minimize time before response
    if (store) {
      const audioKey = key;
      const scriptKey = key + "-script";
      try {
        await Promise.all([
          store.set(audioKey, new Uint8Array(audioBuffer)).catch(e => console.error("Audio cache fail:", e)),
          store.set(scriptKey, text.slice(0, 4000)).catch(e => console.error("Script cache fail:", e)),
        ]);
        console.log("Cached audio:", audioKey, "size:", audioBuffer.byteLength);
      } catch (cacheErr) {
        console.error("Failed to cache audio:", cacheErr);
      }
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "X-Script-Text": encodeURIComponent(text.slice(0, 4000)),
        "X-Cache": "miss",
      },
    });
  } catch (error) {
    console.error("Audio session error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate audio" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/audio-session",
};

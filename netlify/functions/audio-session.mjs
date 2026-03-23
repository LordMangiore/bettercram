import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getBlobStore(name) {
  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore(name);
  } catch {
    return null;
  }
}

function makeCacheKey(card, mode) {
  // Create a stable key from card content + mode
  const raw = `${mode}:${card.front.slice(0, 80)}`;
  // Simple hash to keep key clean
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return `audio-${Math.abs(hash).toString(36)}`;
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { card, mode } = await req.json();
    const store = await getBlobStore("audio-cache");
    const key = makeCacheKey(card, mode);

    // Check cache first (skip if blob store unavailable)
    if (store) {
      const cached = await store.getWithMetadata(key, { type: "arrayBuffer" });
      if (cached && cached.data) {
        const script = cached.metadata?.script || "";
        return new Response(cached.data, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "X-Script-Text": encodeURIComponent(script),
            "X-Cache": "hit",
          },
        });
      }
    }

    // Generate text
    let text = "";
    if (mode === "podcast") {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: `You are a friendly, engaging study tutor recording a podcast-style explanation.
Write a 60-90 second spoken explanation of this topic. Aim for 200-350 words.
- Use a conversational, warm tone (like explaining to a friend)
- Start with "Let's talk about..." or "So here's the thing about..."
- Include one or two memorable analogies to make it stick
- Build up from simple to complex — don't assume the listener already knows this
- End with the key takeaway and one quick study tip
- Do NOT use any markdown, bullet points, or formatting — this will be read aloud
- Do NOT cut yourself off mid-thought — always finish your explanation completely
- Keep it natural and flowing, like speech`,
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
    const voiceId = "21m00Tcm4TlvDq8ikWAM";
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

    // Cache the audio + script in Netlify Blobs (skip if store unavailable)
    if (store) {
      try {
        await store.set(key, new Uint8Array(audioBuffer), {
          metadata: { script: text.slice(0, 4000) },
        });
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

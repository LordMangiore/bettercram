function contentHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

async function getBlobStore(name) {
  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore(name);
  } catch {
    return null;
  }
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { text } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check global cache first
    const cacheKey = `tts-${contentHash(text)}`;
    const store = await getBlobStore("global-cache");

    if (store) {
      try {
        const cached = await store.get(cacheKey, { type: "arrayBuffer" });
        if (cached) {
          return new Response(cached, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Length": cached.byteLength.toString(),
              "X-Cache": "hit",
            },
          });
        }
      } catch {}
    }

    // Polished narrator voice
    const voiceId = "qSeXEcewz7tA0Q0qk9fH";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.slice(0, 1000),
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errText}`);
    }

    const audioBuffer = await response.arrayBuffer();

    // Cache globally
    if (store) {
      try {
        await store.set(cacheKey, new Uint8Array(audioBuffer));
      } catch (cacheErr) {
        console.error("Failed to cache TTS:", cacheErr);
      }
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "X-Cache": "miss",
      },
    });
  } catch (error) {
    console.error("Error generating speech:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate speech" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/text-to-speech",
};

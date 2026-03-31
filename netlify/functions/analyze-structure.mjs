import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Analyze document structure — detect chapters, sections, and parts.
 * Returns an ordered list of sections with titles and content chunks.
 *
 * POST { content: string }
 * Returns { sections: [{ title, content }], type: "book" | "article" | "flat" }
 */
export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { content } = await req.json();
    if (!content || content.length < 500) {
      return Response.json({ sections: [{ title: "General", content }], type: "flat" });
    }

    // For short content, skip analysis
    if (content.length < 10000) {
      return Response.json({ sections: [{ title: "General", content }], type: "flat" });
    }

    // Send first ~60KB to Claude for structure detection (enough to find the pattern)
    // For very long docs, we don't need to send everything — just enough to find headings
    const sampleSize = Math.min(content.length, 60000);
    const sample = content.slice(0, sampleSize);
    const isTruncated = content.length > sampleSize;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Analyze this document and identify its chapter/section structure. Return a JSON array of section titles in order.

RULES:
- Look for chapters, parts, sections, or major headings
- Use the exact heading text from the document (e.g., "Part One", "Chapter 1: The Dream", "III. The Trial")
- If the document has a clear book structure (parts, chapters), use those
- If it's an article/paper, use section headings (Introduction, Methods, Results, etc.)
- If there's no clear structure, return ["General"]
- Return ONLY the JSON array, nothing else
- Aim for 5-30 sections depending on document length

${isTruncated ? "NOTE: This is a sample of a longer document. Identify the structural pattern and list ALL sections you can find. The pattern likely continues." : ""}

DOCUMENT:
${sample}`,
        },
      ],
    });

    const text = response.content[0].text.trim();

    // Parse the section titles
    let titles;
    try {
      // Try direct JSON parse
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      titles = jsonMatch ? JSON.parse(jsonMatch[0]) : ["General"];
    } catch {
      titles = ["General"];
    }

    if (!Array.isArray(titles) || titles.length === 0) {
      titles = ["General"];
    }

    // Now split the content by these section titles
    const sections = [];

    if (titles.length === 1 && titles[0] === "General") {
      return Response.json({ sections: [{ title: "General", content }], type: "flat" });
    }

    // Build regex patterns to find each section heading in the content
    // We need to be flexible — headings might have different formatting
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      // Escape regex special chars, allow flexible whitespace
      const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
      const pattern = new RegExp(`(?:^|\\n)\\s*(?:#{1,4}\\s*)?${escapedTitle}`, "im");

      const match = content.match(pattern);
      const startIdx = match ? match.index : -1;

      // Find the start of the next section
      let endIdx = content.length;
      if (i < titles.length - 1) {
        const nextTitle = titles[i + 1];
        const escapedNext = nextTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
        const nextPattern = new RegExp(`(?:^|\\n)\\s*(?:#{1,4}\\s*)?${escapedNext}`, "im");
        const nextMatch = content.match(nextPattern);
        if (nextMatch) {
          endIdx = nextMatch.index;
        }
      }

      if (startIdx >= 0) {
        const sectionContent = content.slice(startIdx, endIdx).trim();
        if (sectionContent.length > 100) {
          sections.push({ title: cleanTitle(title), content: sectionContent });
        }
      }
    }

    // If section splitting failed or missed most content, check for uncaptured content
    if (sections.length === 0) {
      // Fallback: use titles as categories but split content evenly
      const chunkSize = Math.ceil(content.length / titles.length);
      for (let i = 0; i < titles.length; i++) {
        const chunk = content.slice(i * chunkSize, (i + 1) * chunkSize);
        if (chunk.trim().length > 100) {
          sections.push({ title: cleanTitle(titles[i]), content: chunk });
        }
      }
    }

    // If we still have nothing, fall back to flat
    if (sections.length === 0) {
      return Response.json({ sections: [{ title: "General", content }], type: "flat" });
    }

    // Check for any content before the first section (intro/preface)
    if (sections.length > 0) {
      const firstSectionTitle = titles[0];
      const escapedFirst = firstSectionTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
      const firstPattern = new RegExp(`(?:^|\\n)\\s*(?:#{1,4}\\s*)?${escapedFirst}`, "im");
      const firstMatch = content.match(firstPattern);
      if (firstMatch && firstMatch.index > 500) {
        const preface = content.slice(0, firstMatch.index).trim();
        if (preface.length > 200) {
          sections.unshift({ title: "Introduction", content: preface });
        }
      }
    }

    return Response.json({
      sections,
      type: sections.length >= 3 ? "book" : "article",
    });
  } catch (err) {
    console.error("Structure analysis error:", err);
    // On any failure, return flat structure so generation still works
    try {
      const { content } = await req.json();
      return Response.json({ sections: [{ title: "General", content }], type: "flat" });
    } catch {
      return Response.json({ sections: [], type: "flat" }, { status: 500 });
    }
  }
}

/**
 * Clean up a chapter title for use as a card category.
 * "CHAPTER ONE: The Dream" → "Chapter One: The Dream"
 * "Part I — The Beginning" → "Part I — The Beginning"
 */
function cleanTitle(title) {
  return title
    .replace(/^#+\s*/, "") // strip markdown headings
    .replace(/^\s+|\s+$/g, "") // trim
    .replace(/\n/g, " ") // single line
    .slice(0, 80); // cap length
}

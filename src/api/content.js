// Content ingestion — scraping, parsing, crawling
import { API_BASE, authHeaders, safeError } from "./client.js";

export async function readGoogleDoc(docId, accessToken) {
  const res = await fetch(`${API_BASE}/read-google-doc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docId, accessToken }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to read Google Doc"));
  return res.json();
}

export async function parseUploadedFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const headers = {};
  const auth = authHeaders();
  if (auth["Authorization"]) headers["Authorization"] = auth["Authorization"];
  if (auth["X-User-Id"]) headers["X-User-Id"] = auth["X-User-Id"];

  const res = await fetch(`${API_BASE}/parse-upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }

  return res.json();
}

export async function scrapeDocument(url, onStatus) {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (onStatus && attempt > 1) {
      onStatus(`Large document — retry ${attempt}/${MAX_ATTEMPTS} (extended timeout)...`);
    }

    try {
      const res = await fetch(`${API_BASE}/scrape-doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, attempt }),
      });

      if (res.ok) {
        const data = await res.json();

        if (data.content && data.content.length > 50) return data;

        if (data.status === "retry") {
          if (onStatus) onStatus(data.message || "Retrying large document...");
          continue;
        }
      }

      const errData = await res.json().catch(() => ({}));
      if (attempt < MAX_ATTEMPTS && (res.status === 504 || res.status === 502)) {
        if (onStatus) onStatus(`Server timeout — retry ${attempt + 1}/${MAX_ATTEMPTS}...`);
        continue;
      }

      throw new Error(errData.error || "Failed to scrape document. Make sure it's shared publicly.");
    } catch (e) {
      if (attempt < MAX_ATTEMPTS && (e.message.includes("timeout") || e.message.includes("Failed to fetch"))) {
        if (onStatus) onStatus(`Connection issue — retry ${attempt + 1}/${MAX_ATTEMPTS}...`);
        continue;
      }
      throw e;
    }
  }

  throw new Error("Document is too large to process. Try splitting it into smaller documents.");
}

export async function searchAndScrape(topic) {
  const res = await fetch(`${API_BASE}/search-and-scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to search topic"));
  return res.json();
}

export async function crawlStart(url, limit = 25) {
  const res = await fetch(`${API_BASE}/crawl-start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, limit }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to start crawl"));
  return res.json();
}

export async function crawlPoll(jobId) {
  const res = await fetch(`${API_BASE}/crawl-poll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to check crawl status"));
  return res.json();
}

export async function analyzeStructure(content) {
  const res = await fetch(`${API_BASE}/analyze-structure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) return { sections: [{ title: "General", content }], type: "flat" };
  return res.json();
}

export async function extractCards(url) {
  const res = await fetch(`${API_BASE}/extract-cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Failed to extract cards"));
  return res.json();
}

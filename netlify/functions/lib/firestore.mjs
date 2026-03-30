/**
 * Firestore REST API client for Netlify functions.
 * No service account needed — uses the project ID directly.
 * All operations are server-side, bypassing security rules.
 */

const PROJECT_ID = "bettercram";
const DATABASE_ID = "bettercram";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

// Convert JS object to Firestore field format
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (typeof val === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Convert Firestore field format back to JS object
function fromFirestoreValue(val) {
  if (!val) return null;
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return parseInt(val.integerValue);
  if ("doubleValue" in val) return val.doubleValue;
  if ("stringValue" in val) return val.stringValue;
  if ("timestampValue" in val) return val.timestampValue;
  if ("arrayValue" in val) return (val.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in val) return fromFirestoreDoc({ fields: val.mapValue.fields });
  return null;
}

// Convert Firestore document to JS object
function fromFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const result = {};
  for (const [key, val] of Object.entries(doc.fields)) {
    result[key] = fromFirestoreValue(val);
  }
  return result;
}

// Convert JS object to Firestore fields
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) fields[key] = toFirestoreValue(val);
  }
  return fields;
}

/**
 * Get a document from Firestore
 * @param {string} path - e.g. "users/abc123" or "users/abc123/decks/deck1"
 * @returns {object|null} The document data or null if not found
 */
export async function getDoc(path) {
  try {
    const res = await fetch(`${BASE_URL}/${path}`, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const doc = await res.json();
    return fromFirestoreDoc(doc);
  } catch {
    return null;
  }
}

/**
 * Set/overwrite a document in Firestore
 * @param {string} path - e.g. "users/abc123"
 * @param {object} data - JS object to store
 */
export async function setDoc(path, data) {
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore setDoc failed: ${res.status} ${err}`);
  }
  return true;
}

/**
 * Delete a document from Firestore
 * @param {string} path - e.g. "users/abc123/decks/deck1"
 */
export async function deleteDoc(path) {
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: "DELETE",
  });
  return res.ok || res.status === 404;
}

/**
 * List all documents in a collection
 * @param {string} collectionPath - e.g. "users/abc123/decks"
 * @returns {Array<{id: string, data: object}>}
 */
export async function listDocs(collectionPath) {
  const results = [];
  let pageToken = null;

  do {
    const url = new URL(`${BASE_URL}/${collectionPath}`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) break;
    const body = await res.json();

    if (body.documents) {
      for (const doc of body.documents) {
        const id = doc.name.split("/").pop();
        results.push({ id, data: fromFirestoreDoc(doc) });
      }
    }

    pageToken = body.nextPageToken || null;
  } while (pageToken);

  return results;
}

/**
 * Delete all documents in a collection (batch)
 * @param {string} collectionPath - e.g. "users/abc123/decks"
 */
export async function deleteCollection(collectionPath) {
  const docs = await listDocs(collectionPath);
  await Promise.all(docs.map(doc => deleteDoc(`${collectionPath}/${doc.id}`)));
  return docs.length;
}

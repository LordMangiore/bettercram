import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { newUserId, oldUserId, email } = await req.json();

    if (!newUserId || !oldUserId) {
      return Response.json({ error: "Missing newUserId or oldUserId" }, { status: 400 });
    }

    // Don't migrate if IDs are the same
    if (newUserId === oldUserId) {
      return Response.json({ migrated: false, reason: "same-id" });
    }

    const migrated = [];

    // 1. Migrate decks
    const oldDeckStore = getStore(`decks-${oldUserId}`);
    const newDeckStore = getStore(`decks-${newUserId}`);

    try {
      const { blobs: oldBlobs } = await oldDeckStore.list();
      if (oldBlobs && oldBlobs.length > 0) {
        // Check if new user already has decks
        const { blobs: newBlobs } = await newDeckStore.list();
        if (!newBlobs || newBlobs.length === 0) {
          // Copy all decks from old to new
          for (const blob of oldBlobs) {
            const data = await oldDeckStore.get(blob.key, { type: "json" });
            if (data) {
              await newDeckStore.setJSON(blob.key, data);
              migrated.push(`deck:${blob.key}`);
            }
          }
        } else {
          migrated.push("decks:skipped-existing");
        }
      }
    } catch (e) {
      console.error("Deck migration error:", e);
    }

    // 2. Migrate cards and progress
    const cardStore = getStore("user-data");
    const keysToMigrate = ["-cards", "-progress", "-study-plan"];

    for (const suffix of keysToMigrate) {
      try {
        const oldData = await cardStore.get(`${oldUserId}${suffix}`, { type: "json" });
        if (oldData) {
          const newData = await cardStore.get(`${newUserId}${suffix}`, { type: "json" });
          if (!newData) {
            await cardStore.setJSON(`${newUserId}${suffix}`, oldData);
            migrated.push(`data:${suffix}`);
          } else {
            migrated.push(`data:${suffix}:skipped-existing`);
          }
        }
      } catch (e) {
        // Key doesn't exist, skip
      }
    }

    // 3. Save the migration mapping for future reference
    const mappingStore = getStore("user-migrations");
    await mappingStore.setJSON(`${newUserId}`, {
      oldUserId,
      email,
      migratedAt: new Date().toISOString(),
      migrated,
    });

    return Response.json({
      migrated: migrated.length > 0,
      items: migrated,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/migrate-user",
};

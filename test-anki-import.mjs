/**
 * Anki Import Stress Test
 *
 * Tests all .apkg files in a directory against our parser.
 * Run: node test-anki-import.mjs [directory]
 * Default directory: ~/Downloads
 *
 * Checks:
 * - Can the zip be opened?
 * - Is there a valid SQLite database? (anki21 preferred)
 * - Can notes be extracted?
 * - Are cloze deletions parsed correctly?
 * - Are media files referenced and found?
 * - Are tags/categories cleaned up?
 * - Any weird field structures?
 */

import fs from "fs";
import path from "path";
import JSZip from "jszip";
import initSqlJs from "sql.js";

const dir = process.argv[2] || path.join(process.env.HOME, "Downloads");

function stripHtml(html) {
  return html
    .replace(/\[sound:[^\]]+\]/g, "")
    .replace(/<img[^>]*>/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<div[^>]*>/gi, "\n")
    .replace(/<\/div>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function testFile(filePath) {
  const fileName = path.basename(filePath);
  const fileSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(1);
  console.log(`\n${"=".repeat(70)}`);
  console.log(`FILE: ${fileName} (${fileSize} MB)`);
  console.log("=".repeat(70));

  const issues = [];

  try {
    const buf = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buf);
    const files = Object.keys(zip.files);
    console.log(`  ZIP files: ${files.length}`);

    // Check for databases
    const hasAnki2 = !!zip.file("collection.anki2");
    const hasAnki21 = !!zip.file("collection.anki21");
    console.log(`  anki2: ${hasAnki2} | anki21: ${hasAnki21}`);

    if (!hasAnki2 && !hasAnki21) {
      issues.push("CRITICAL: No Anki database found");
      const ankiFiles = files.filter(f => f.includes("anki"));
      console.log(`  Anki-like files: ${ankiFiles}`);
      return { fileName, issues, cards: 0, media: 0 };
    }

    // Prefer anki21
    const dbFile = zip.file("collection.anki21") || zip.file("collection.anki2");
    const dbName = hasAnki21 ? "anki21" : "anki2";
    const dbBuffer = await dbFile.async("uint8array");
    console.log(`  Using: ${dbName} (${(dbBuffer.length / 1024).toFixed(0)} KB)`);

    const SQL = await initSqlJs();
    const db = new SQL.Database(dbBuffer);

    // Check tables
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables[0]?.values?.map(v => v[0]) || [];
    console.log(`  Tables: ${tableNames.join(", ")}`);

    if (!tableNames.includes("notes")) {
      issues.push("CRITICAL: No 'notes' table");
      db.close();
      return { fileName, issues, cards: 0, media: 0 };
    }

    // Count notes
    const countResult = db.exec("SELECT count(*) FROM notes");
    const noteCount = countResult[0]?.values?.[0]?.[0] || 0;
    console.log(`  Notes: ${noteCount}`);

    // Check note models
    let models = {};
    try {
      const modelResult = db.exec("SELECT models FROM col LIMIT 1");
      if (modelResult[0]?.values) {
        models = JSON.parse(modelResult[0].values[0][0]);
        Object.values(models).forEach(m => {
          console.log(`  Model: "${m.name}" type=${m.type} fields=[${m.flds?.map(f => f.name).join(", ")}]`);
        });
      }
    } catch (e) {
      console.log(`  Models: couldn't parse (${e.message})`);
    }

    // Check deck names
    try {
      const colResult = db.exec("SELECT decks FROM col LIMIT 1");
      if (colResult[0]?.values) {
        const deckJson = JSON.parse(colResult[0].values[0][0]);
        const deckNames = Object.values(deckJson).map(d => d.name).filter(n => n !== "Default");
        console.log(`  Decks: ${deckNames.slice(0, 5).join(", ")}${deckNames.length > 5 ? ` (+${deckNames.length - 5} more)` : ""}`);

        // Check for emoji in names
        const emojiDecks = deckNames.filter(n => /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(n));
        if (emojiDecks.length > 0) {
          console.log(`  ⚠️  Emoji in deck names: ${emojiDecks[0]}`);
        }
      }
    } catch {}

    // Sample notes
    const sample = db.exec("SELECT flds, tags FROM notes LIMIT 100");
    let clozeCount = 0, basicCount = 0, emptyBack = 0, singleField = 0;
    let maxFields = 0, minFields = Infinity;
    let hasImages = 0, hasAudio = 0;
    let weirdChars = 0;

    if (sample[0]?.values) {
      for (const row of sample[0].values) {
        const fields = String(row[0]).split("\x1f");
        maxFields = Math.max(maxFields, fields.length);
        minFields = Math.min(minFields, fields.length);

        if (fields.length < 2) { singleField++; continue; }

        const front = fields[0];
        const back = fields[1];
        const hasCloze = /\{\{c\d+::/.test(front);

        if (hasCloze) clozeCount++;
        else basicCount++;

        if (!stripHtml(back || "")) emptyBack++;
        if (/<img/.test(front) || /<img/.test(back)) hasImages++;
        if (/\[sound:/.test(front) || /\[sound:/.test(back)) hasAudio++;

        // Check for weird cloze patterns
        if (hasCloze) {
          // Nested cloze
          if (/\{\{c\d+::.*\{\{c\d+::/.test(front)) {
            issues.push(`Nested cloze found in card: ${front.slice(0, 50)}`);
          }
          // Cloze with HTML inside
          if (/\{\{c\d+::</.test(front)) {
            // This is common, not an issue unless it breaks our regex
          }
        }

        // Check for unusual characters
        if (/[\x00-\x08\x0B\x0C\x0E-\x1E]/.test(front)) weirdChars++;
      }
    }

    console.log(`  Field count range: ${minFields}-${maxFields}`);
    console.log(`  Cloze: ${clozeCount} | Basic: ${basicCount} | Empty back: ${emptyBack} | Single field: ${singleField}`);
    console.log(`  Has images: ${hasImages} | Has audio: ${hasAudio}`);
    if (weirdChars) console.log(`  ⚠️  Weird control characters in ${weirdChars} cards`);

    if (singleField > 0) issues.push(`${singleField} cards have only 1 field`);
    if (emptyBack > basicCount * 0.5 && !clozeCount) issues.push(`${emptyBack}/${basicCount} non-cloze cards have empty backs`);

    // Check media
    let mediaCount = 0;
    try {
      const mediaFile = zip.file("media");
      if (mediaFile) {
        const mediaJson = await mediaFile.async("text");
        const mediaMap = JSON.parse(mediaJson);
        mediaCount = Object.keys(mediaMap).length;
        console.log(`  Media files: ${mediaCount}`);

        // Check for unusual extensions
        const exts = {};
        Object.values(mediaMap).forEach(f => {
          const ext = f.split(".").pop()?.toLowerCase() || "none";
          exts[ext] = (exts[ext] || 0) + 1;
        });
        console.log(`  Media types: ${Object.entries(exts).map(([e, c]) => `${e}(${c})`).join(", ")}`);

        // Check for problematic extensions
        const problematic = Object.keys(exts).filter(e => !["jpg", "jpeg", "png", "gif", "svg", "webp", "mp3", "ogg", "wav", "m4a"].includes(e));
        if (problematic.length) {
          issues.push(`Unusual media types: ${problematic.join(", ")}`);
        }
      } else {
        console.log(`  Media files: none`);
      }
    } catch (e) {
      issues.push(`Media map parse error: ${e.message}`);
    }

    db.close();

    // Run our actual cloze regex on all cards to check for failures
    const allNotes = db.exec ? null : null; // db already closed
    // Re-open for full test
    const db2 = new SQL.Database(dbBuffer);
    const allCards = db2.exec("SELECT flds, tags FROM notes");
    let parsedOk = 0, parseFail = 0;

    if (allCards[0]?.values) {
      for (const row of allCards[0].values) {
        const fields = String(row[0]).split("\x1f");
        if (fields.length < 2) { parseFail++; continue; }

        let front = stripHtml(fields[0]);
        const back = stripHtml(fields[1] || "");
        const isCloze = /\{\{c\d+::/.test(front);

        if (isCloze) {
          const clozed = front.replace(/\{\{c\d+::(.*?)(?:::[^}]*)?\s*\}\}/g, "_____");
          if (clozed === front) {
            // Regex didn't match — our cloze pattern failed
            parseFail++;
            if (parseFail <= 3) {
              issues.push(`Cloze regex failed on: ${front.slice(0, 80)}`);
            }
          } else {
            parsedOk++;
          }
        } else if (front) {
          parsedOk++;
        } else {
          parseFail++;
        }
      }
    }
    db2.close();

    console.log(`  Parse results: ${parsedOk} OK, ${parseFail} failed`);

    if (issues.length === 0) {
      console.log(`  ✅ ALL GOOD`);
    } else {
      console.log(`  ⚠️  ISSUES (${issues.length}):`);
      issues.forEach(i => console.log(`    - ${i}`));
    }

    return { fileName, issues, cards: noteCount, media: mediaCount, parsedOk, parseFail };

  } catch (e) {
    issues.push(`FATAL: ${e.message}`);
    console.log(`  ❌ FATAL: ${e.message}`);
    return { fileName, issues, cards: 0, media: 0 };
  }
}

async function main() {
  const apkgFiles = fs.readdirSync(dir).filter(f => f.endsWith(".apkg")).map(f => path.join(dir, f));

  console.log(`ANKI IMPORT STRESS TEST`);
  console.log(`Directory: ${dir}`);
  console.log(`Files found: ${apkgFiles.length}`);

  if (apkgFiles.length === 0) {
    console.log("\nNo .apkg files found. Drop some in ~/Downloads and run again.");
    return;
  }

  const results = [];
  for (const file of apkgFiles) {
    results.push(await testFile(file));
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("SUMMARY");
  console.log("=".repeat(70));
  results.forEach(r => {
    const status = r.issues.length === 0 ? "✅" : r.issues.some(i => i.startsWith("CRITICAL") || i.startsWith("FATAL")) ? "❌" : "⚠️";
    console.log(`${status} ${r.fileName}: ${r.cards} cards, ${r.media} media, ${r.issues.length} issues`);
  });
}

main();

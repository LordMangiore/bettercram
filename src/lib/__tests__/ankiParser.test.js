import { describe, it, expect } from "vitest";
import { stripHtml, parseCloze, extractCategory, extractMediaRefs } from "../ankiParser";

describe("stripHtml", () => {
  it("removes basic HTML tags", () => {
    expect(stripHtml("<b>bold</b> and <i>italic</i>")).toBe("bold and italic");
  });

  it("converts <br> to newlines", () => {
    expect(stripHtml("line 1<br>line 2<br/>line 3")).toBe("line 1\nline 2\nline 3");
  });

  it("converts <div> to newlines", () => {
    expect(stripHtml("<div>first</div><div>second</div>")).toBe("first\nsecond");
  });

  it("decodes HTML entities", () => {
    expect(stripHtml("&amp; &lt; &gt; &quot; &nbsp;")).toBe("& < > \"");
  });

  it("removes [sound:] tags", () => {
    expect(stripHtml("text [sound:audio.mp3] more")).toBe("text  more");
  });

  it("removes <img> tags", () => {
    expect(stripHtml('text <img src="photo.jpg"> more')).toBe("text  more");
  });

  it("collapses excess newlines", () => {
    expect(stripHtml("a<br><br><br><br>b")).toBe("a\n\nb");
  });

  it("trims whitespace", () => {
    expect(stripHtml("  <p>hello</p>  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });
});

describe("parseCloze", () => {
  it("replaces single cloze with blank on front", () => {
    const result = parseCloze("The {{c1::mitochondria}} is the powerhouse", "");
    expect(result.front).toBe("The _____ is the powerhouse");
    expect(result.back).toBe("The mitochondria is the powerhouse");
  });

  it("handles multiple cloze deletions", () => {
    const result = parseCloze("{{c1::DNA}} is transcribed to {{c2::RNA}}", "");
    expect(result.front).toBe("_____ is transcribed to _____");
    expect(result.back).toBe("DNA is transcribed to RNA");
  });

  it("handles cloze with hints (::hint syntax)", () => {
    const result = parseCloze("{{c1::mitochondria::organelle}}", "");
    expect(result.front).toBe("_____");
    expect(result.back).toBe("mitochondria");
  });

  it("appends back field content if different from front", () => {
    const result = parseCloze("{{c1::ATP}}", "Extra explanation here");
    expect(result.front).toBe("_____");
    expect(result.back).toBe("ATP\n\nExtra explanation here");
  });

  it("handles multiline cloze answers", () => {
    const result = parseCloze("{{c1::line1\nline2}}", "");
    expect(result.front).toBe("_____");
    expect(result.back).toBe("line1\nline2");
  });
});

describe("extractCategory", () => {
  it("extracts Subject hierarchy", () => {
    expect(extractCategory("qBank::UW::Subject::Anatomy")).toBe("Anatomy");
  });

  it("extracts System hierarchy", () => {
    expect(extractCategory("qBank::UW::System::Cardiovascular")).toBe("Cardiovascular");
  });

  it("prefers Subject over System", () => {
    expect(extractCategory("qBank::Subject::Biology qBank::System::Cardio")).toBe("Biology");
  });

  it("falls back to last part of first tag", () => {
    expect(extractCategory("deck::chapter::Pharmacology")).toBe("Pharmacology");
  });

  it("returns Imported for empty tags", () => {
    expect(extractCategory("")).toBe("Imported");
  });

  it("ignores leech and marked tags", () => {
    expect(extractCategory("leech marked")).toBe("Imported");
  });

  it("replaces underscores with spaces", () => {
    expect(extractCategory("qBank::Subject::Organic_Chemistry")).toBe("Organic Chemistry");
  });

  it("strips leading # from tags", () => {
    expect(extractCategory("#deck::Subject::Anatomy")).toBe("Anatomy");
  });
});

describe("extractMediaRefs", () => {
  it("extracts image src from img tags", () => {
    const result = extractMediaRefs('<img src="photo.jpg"> text <img src="diagram.png">');
    expect(result.images).toEqual(["photo.jpg", "diagram.png"]);
    expect(result.audio).toEqual([]);
  });

  it("extracts audio from [sound:] tags", () => {
    const result = extractMediaRefs("text [sound:pronunciation.mp3] more [sound:example.ogg]");
    expect(result.audio).toEqual(["pronunciation.mp3", "example.ogg"]);
    expect(result.images).toEqual([]);
  });

  it("extracts both images and audio", () => {
    const result = extractMediaRefs('<img src="img.jpg"> [sound:audio.mp3]');
    expect(result.images).toEqual(["img.jpg"]);
    expect(result.audio).toEqual(["audio.mp3"]);
  });

  it("returns empty arrays for plain text", () => {
    const result = extractMediaRefs("just plain text");
    expect(result.images).toEqual([]);
    expect(result.audio).toEqual([]);
  });

  it("handles single-quoted src attributes", () => {
    const result = extractMediaRefs("<img src='photo.jpg'>");
    expect(result.images).toEqual(["photo.jpg"]);
  });
});

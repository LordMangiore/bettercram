// Re-exports from organized api/ modules — all existing imports continue to work.
// For new code, import directly from the domain module:
//   import { tutorChat } from "./api/ai"
//   import { loadDecks, saveDeck } from "./api/decks"
//   import { scrapeDocument } from "./api/content"
//   import { checkSubscription } from "./api/user"
//   import { generateCards } from "./api/cards"

export * from "./api/index.js";

// Barrel file — re-exports all API functions for backward compatibility
// Import from specific modules for better code-splitting:
//   import { tutorChat } from "./api/ai"
//   import { loadDecks } from "./api/decks"

export { setAuthToken, setUserId } from "./client.js";
export { readGoogleDoc, parseUploadedFile, scrapeDocument, searchAndScrape, crawlStart, crawlPoll, extractCards } from "./content.js";
export { generateCards, generateMore, generateHelperCards, regenCard, scoreCards, saveCards, loadCards } from "./cards.js";
export { loadDecks, loadDeck, saveDeck, saveDeckV2, deleteDeck, seedSampleDecks, loadDeckCards, loadAllDeckCards, loadDeckProgress, saveDeckProgress, saveDeckGroups, assignDeckGroup, publishDeck, browsePublicDecks, subscribeToDeck, cloneDeck, copyPublicDeck, upvotePublicDeck, submitSuggestion, listSuggestions, reviewSuggestion } from "./decks.js";
export { tutorChat, deepDive, generateQuiz, audioSession, textToSpeech, precacheFirstPodcast } from "./ai.js";
export { saveProfile, loadProfile, resetAccount, checkSubscription, createCheckout, manageSubscription, saveStudyPlan, loadStudyPlan, trackActivity, loadActivity, saveReviewEvents, loadReviewLog, optimizeFSRS, loadFSRSParams } from "./user.js";

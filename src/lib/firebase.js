import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBxVgNXJt2cqZoTmJzImfnDJ_-poqoz01A",
  authDomain: "bettercram.firebaseapp.com",
  projectId: "bettercram",
  storageBucket: "bettercram.firebasestorage.app",
  messagingSenderId: "1088410134729",
  appId: "1:1088410134729:web:d47441388c3fe00b104518",
  measurementId: "G-3BJ5PV0DT3",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with offline persistence (IndexedDB cache)
// Recently-viewed decks and progress work offline automatically
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
}, "bettercram");

export default app;

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let db;

function initFirestore() {
  if (db) return db;

  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}");
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  db = getFirestore();
  return db;
}

export { initFirestore };
export default initFirestore;

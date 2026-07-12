import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocFromServer } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Initialize Firebase using values from firebase-applet-config.json
const firebaseConfig = {
  projectId: "gen-lang-client-0062789091",
  appId: "1:527501603787:web:c0c55c72806788301cbc4e",
  apiKey: "AIzaSyCPF2DSNxN1bznBLrVSyw4mV53spl2H69M",
  authDomain: "gen-lang-client-0062789091.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-ee6bda93-7ef1-4adc-bc95-a07045f8406d",
  storageBucket: "gen-lang-client-0062789091.firebasestorage.app",
  messagingSenderId: "527501603787"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Validate Connection to Firestore on startup as requested by the firebase-integration skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration. The client is offline.");
    } else {
      console.log("Firebase initialized successfully, connected to custom DB id:", firebaseConfig.firestoreDatabaseId);
    }
  }
}

testConnection();

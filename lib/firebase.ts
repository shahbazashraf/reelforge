// lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD3J7HC8rlT4nuA2nPekQGhdnxKBElNr74",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "reelistic-9058b.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "reelistic-9058b",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "reelistic-9058b.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1022905856169",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1022905856169:web:2fd9ef9ddf8e1bea8039b8",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-EF07QB9FGF"
}

// Initialize Firebase App (singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

// Analytics (only runs on browser)
export const initAnalytics = async () => {
  if (typeof window !== 'undefined' && (await isSupported())) {
    return getAnalytics(app)
  }
  return null
}

export { app, firebaseConfig }

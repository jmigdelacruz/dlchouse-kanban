import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
let app
let db
let storage

try {
  console.log('Initializing Firebase...')
  app = initializeApp(firebaseConfig)
  console.log('Firebase app initialized successfully')

  // Initialize Firestore
  db = getFirestore(app)
  console.log('Firestore initialized successfully')

  // Initialize Storage
  storage = getStorage(app)
  console.log('Firebase Storage initialized successfully')
} catch (error) {
  console.error('Error initializing Firebase:', error)
}

export { db, storage } 
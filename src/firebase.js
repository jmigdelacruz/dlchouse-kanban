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

// Validate environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID'
]

const missingEnvVars = requiredEnvVars.filter(varName => !import.meta.env[varName])
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars)
  throw new Error('Missing required environment variables. Please check your .env file.')
}

// Initialize Firebase
let app
let db
let storage

try {
  console.log('Initializing Firebase with config:', {
    ...firebaseConfig,
    apiKey: '***' // Hide API key in logs
  })
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
  throw error
}

export { db, storage } 
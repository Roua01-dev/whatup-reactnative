// Config/index1.js

import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage for persistence 
//persiqtent ya3ni tab9a mawjouda heta kn sakarna application

// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBLdwwKqdWJL3VLYpBzHn7AbzoES8eifk0",
  authDomain: "whatup-b03df.firebaseapp.com",
  databaseURL: "https://whatup-b03df-default-rtdb.firebaseio.com",
  projectId: "whatup-b03df",
  storageBucket: "whatup-b03df.appspot.com",
  messagingSenderId: "989413029385",
  appId: "1:989413029385:web:56a20d13bc37c13aa66ad8",
  measurementId: "G-T2HLBE7D4J",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence using AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});


// Export Firebase services
export { app, auth, getDatabase, getStorage };
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lkokvxgqynpmgjrdgbmb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrb2t2eGdxeW5wbWdqcmRnYm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NzIzNzAsImV4cCI6MjA0ODU0ODM3MH0.HkxBsLveUAbQKv1zc7MDTCSXFz5hf2sAOdfGdwb_OhY';
const supabase = createClient(supabaseUrl, supabaseKey)
export { supabase }
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCOL7Km6_zpDloNErLjuFWXEd5CkUgMH9Y",
  authDomain: "nook-9c7bc.firebaseapp.com",
  projectId: "nook-9c7bc",
  storageBucket: "nook-9c7bc.firebasestorage.app",
  messagingSenderId: "840655848063",
  appId: "1:840655848063:web:33c4c7502e0ae51ff9354a",
  measurementId: "G-CPZD0BPER8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const db = getFirestore(app); // Ensure Firestore is exported
export const storage = getStorage(app);

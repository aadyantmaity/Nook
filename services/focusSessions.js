import { db, auth } from "../firebaseConfig";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  doc,
  deleteDoc,
} from "firebase/firestore";

// Save a focus session to Firebase
export const saveFocusSession = async (duration, mode, wasCompleted = true) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return null;
    }

    const sessionData = {
      userId: user.uid,
      duration: duration, // in seconds
      mode: mode, // 'work' or 'break'
      wasCompleted: wasCompleted, // true if timer ended naturally, false if skipped
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    };

    const userDocRef = doc(db, "users", user.uid);
    const focusSessionsRef = collection(userDocRef, "focusSessions");

    const docRef = await addDoc(focusSessionsRef, sessionData);
    console.log("Focus session saved with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving focus session: ", error);
    throw error;
  }
};

// Get all focus sessions for the current user
export const getFocusSessions = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return [];
    }

    const userDocRef = doc(db, "users", user.uid);
    const focusSessionsRef = collection(userDocRef, "focusSessions");

    const q = query(focusSessionsRef, orderBy("timestamp", "desc"));

    const querySnapshot = await getDocs(q);
    const sessions = [];

    querySnapshot.forEach((doc) => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return sessions;
  } catch (error) {
    console.error("Error getting focus sessions: ", error);
    throw error;
  }
};

// Get focus sessions by mode (work or break)
export const getFocusSessionsByMode = async (mode) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      return [];
    }

    const userDocRef = doc(db, "users", user.uid);
    const focusSessionsRef = collection(userDocRef, "focusSessions");

    const q = query(
      focusSessionsRef,
      where("mode", "==", mode),
      orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    const sessions = [];

    querySnapshot.forEach((doc) => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return sessions;
  } catch (error) {
    console.error("Error getting focus sessions by mode: ", error);
    throw error;
  }
};

// Get total focus time for the current user
export const getTotalFocusTime = async () => {
  try {
    const sessions = await getFocusSessionsByMode("work");
    return sessions.reduce((total, session) => total + session.duration, 0);
  } catch (error) {
    console.error("Error getting total focus time: ", error);
    return 0;
  }
};

// Format duration from seconds to human readable string
export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Format timestamp to readable date
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return "Unknown";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return (
    date.toLocaleDateString() +
    " " +
    date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
};

// Delete a focus session
export const deleteFocusSession = async (sessionId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found");
      throw new Error("No authenticated user found");
    }

    const userDocRef = doc(db, "users", user.uid);
    const sessionDocRef = doc(userDocRef, "focusSessions", sessionId);

    await deleteDoc(sessionDocRef);
    console.log("Focus session deleted with ID: ", sessionId);
  } catch (error) {
    console.error("Error deleting focus session: ", error);
    throw error;
  }
};

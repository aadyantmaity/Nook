import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

export default function useFriendsCheckIns() {
  const [friendsCheckIns, setFriendsCheckIns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const unsubRefs = useRef([]);

  const fetchFriendsCheckIns = async () => {
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      // First, get the current user's friends list
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        setFriendsCheckIns([]);
        setIsLoading(false);
        return;
      }

      const userData = userDoc.data();
      const friends = userData.friends || [];
      const following = userData.following || [];

      // Combine friends and following lists
      const allFriends = [...new Set([...friends, ...following])];

      if (allFriends.length === 0) {
        setFriendsCheckIns([]);
        setIsLoading(false);
        return;
      }

      // Clear previous listeners
      unsubRefs.current.forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
      unsubRefs.current = [];

      // Set up listeners for each friend's check in status
      const checkInPromises = allFriends.map(async (friendId) => {
        return new Promise((resolve) => {
          const unsub = onSnapshot(
            doc(db, "users", friendId),
            async (friendDoc) => {
              if (!friendDoc.exists()) {
                resolve(null);
                return;
              }

              const friendData = friendDoc.data();
              const checkedIn = friendData.checkedIn;

              // If friend is not checked in anywhere, return null
              if (!checkedIn || !checkedIn.spotId || !checkedIn.checkedInAt) {
                resolve(null);
                return;
              }

              // Check if check in has expired (60 minutes)
              const now = Date.now();
              const elapsed = now - checkedIn.checkedInAt;
              if (elapsed >= 60 * 60 * 1000) {
                resolve(null);
                return;
              }

              // Get the spot details
              try {
                const spotDoc = await getDoc(
                  doc(db, "studySpots", checkedIn.spotId)
                );
                if (!spotDoc.exists()) {
                  resolve(null);
                  return;
                }

                const spotData = spotDoc.data();

                // Only show public spots or private spots shared with the current user
                if (
                  spotData.privateNook &&
                  spotData.addedBy !== user.uid &&
                  (!Array.isArray(spotData.sharedWith) ||
                    !spotData.sharedWith.includes(user.uid))
                ) {
                  resolve(null);
                  return;
                }

                resolve({
                  friendId,
                  friendName:
                    `${friendData.firstName || ""} ${
                      friendData.lastName || ""
                    }`.trim() || "Anonymous",
                  profilePic: friendData.profilePic || null,
                  spotId: checkedIn.spotId,
                  spotName:
                    spotData.buildingName ||
                    spotData.name ||
                    "Unknown Location",
                  coordinates: spotData.coordinates,
                  checkedInAt: checkedIn.checkedInAt,
                  timeRemaining: Math.max(0, 60 * 60 * 1000 - elapsed), // Time remaining in milliseconds
                });
              } catch (error) {
                console.error("Error fetching spot data:", error);
                resolve(null);
              }
            }
          );
          unsubRefs.current.push(unsub);
        });
      });

      // Wait for all friend check ins to resolve
      const checkIns = (await Promise.all(checkInPromises)).filter(Boolean);
      setFriendsCheckIns(checkIns);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching friends check ins:", error);
      setFriendsCheckIns([]);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendsCheckIns();
    return () => {
      unsubRefs.current.forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
    };
  }, []);

  return {
    friendsCheckIns,
    isLoading,
    refetch: fetchFriendsCheckIns,
  };
}

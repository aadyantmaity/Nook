import { useState, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

export default function useFriendsCheckIns() {
  const [friendsCheckIns, setFriendsCheckIns] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Start as not loading since we don't auto-fetch
  const friendsDataRef = useRef({}); // Store friends data as object keyed by friendId

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

      // Reset friends data
      friendsDataRef.current = {};

      // Fetch each friend's check in status manually
      const fetchPromises = allFriends.map(async (friendId) => {
        try {
          const friendDoc = await getDoc(doc(db, "users", friendId));
          if (!friendDoc.exists()) {
            return null;
          }

          const friendData = friendDoc.data();
          const checkedIn = friendData.checkedIn;

          // If friend is not checked in anywhere, skip
          if (!checkedIn || !checkedIn.spotId || !checkedIn.checkedInAt) {
            return null;
          }

          // Check if check in has expired (60 minutes)
          const now = Date.now();
          const elapsed = now - checkedIn.checkedInAt;
          if (elapsed >= 60 * 60 * 1000) {
            return null;
          }

          // Get the spot details
          const spotDoc = await getDoc(doc(db, "studySpots", checkedIn.spotId));
          if (!spotDoc.exists()) {
            return null;
          }

          const spotData = spotDoc.data();

          // Only show public spots or private spots shared with the current user
          if (
            spotData.privateNook &&
            spotData.addedBy !== user.uid &&
            (!Array.isArray(spotData.sharedWith) ||
              !spotData.sharedWith.includes(user.uid))
          ) {
            return null;
          }

          // Return friend data
          return {
            friendId,
            friendName:
              `${friendData.firstName || ""} ${
                friendData.lastName || ""
              }`.trim() || "Anonymous",
            profilePic: friendData.profilePic || null,
            spotId: checkedIn.spotId,
            spotName:
              spotData.buildingName || spotData.name || "Unknown Location",
            coordinates: spotData.coordinates,
            checkedInAt: checkedIn.checkedInAt,
            timeRemaining: Math.max(0, 60 * 60 * 1000 - elapsed), // Time remaining in milliseconds
          };
        } catch (error) {
          console.error("Error fetching friend data:", error);
          return null;
        }
      });

      // Wait for all promises and filter out null results
      const results = await Promise.all(fetchPromises);
      const validFriends = results.filter(Boolean);

      // Update friends data
      validFriends.forEach((friendData) => {
        friendsDataRef.current[friendData.friendId] = friendData;
      });

      updateFriendsState();

      setIsLoading(false);
    } catch (error) {
      console.error("Error setting up friends check-ins listeners:", error);
      setFriendsCheckIns([]);
      setIsLoading(false);
    }
  };

  // Helper function to update state from friends data object
  const updateFriendsState = () => {
    const checkIns = Object.values(friendsDataRef.current).filter(Boolean);
    setFriendsCheckIns(checkIns);
  };

  return {
    friendsCheckIns,
    isLoading,
    refetch: fetchFriendsCheckIns,
  };
}

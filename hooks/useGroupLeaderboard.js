import { useState, useEffect, useCallback, useMemo } from "react";
import { getWeeklyFocusStats } from "../services/focusSessions";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

export default function useGroupLeaderboard(groupId, memberUids = []) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize memberUids to prevent infinite re-renders
  const stableMemberUids = useMemo(() => {
    if (!memberUids || !Array.isArray(memberUids)) return [];
    return [...memberUids].sort(); // Sort to ensure consistent order
  }, [memberUids]);

  // Memoize the serialized memberUids for comparison
  const memberUidsString = useMemo(() => {
    return JSON.stringify(stableMemberUids);
  }, [stableMemberUids]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!groupId || !stableMemberUids || stableMemberUids.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // Fetch user data for member names/pics
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = {};
      usersSnapshot.forEach((doc) => {
        usersData[doc.id] = doc.data();
      });

      // Get weekly focus stats for each member
      const memberStats = await Promise.all(
        stableMemberUids.map(async (uid) => {
          try {
            const stats = await getWeeklyFocusStats(uid);
            const userData = usersData[uid] || {};

            return {
              uid,
              firstName: userData.firstName || "Unknown",
              lastName: userData.lastName || "",
              profilePic: userData.profilePic || null,
              weeklyFocusTime: stats.weeklyFocusTime,
              weeklySessions: stats.weeklySessions,
            };
          } catch (err) {
            console.error(`Error fetching stats for user ${uid}:`, err);
            return {
              uid,
              firstName: "Unknown",
              lastName: "",
              profilePic: null,
              weeklyFocusTime: 0,
              weeklySessions: 0,
            };
          }
        })
      );

      // Sort by weekly focus time (descending) and add rank
      const allMembers = memberStats
        .sort((a, b) => b.weeklyFocusTime - a.weeklyFocusTime)
        .map((member, index) => ({
          ...member,
          rank: index + 1,
        }));

      // Get current user ID
      const currentUserUid = auth.currentUser?.uid;

      // Get top 5 members
      const top5 = allMembers.slice(0, 5);

      // Find current user in the full list
      const currentUserIndex = allMembers.findIndex(
        (member) => member.uid === currentUserUid
      );
      const currentUser =
        currentUserIndex !== -1 ? allMembers[currentUserIndex] : null;

      // Create final leaderboard: top 5 + current user (if not in top 5)
      let finalLeaderboard = [...top5];

      if (currentUser && currentUserIndex >= 5) {
        // Add separator object to indicate gap
        if (currentUserIndex > 5) {
          finalLeaderboard.push({
            uid: "separator",
            isSeparator: true,
            rank: "...",
          });
        }
        finalLeaderboard.push(currentUser);
      }

      // Only show members with focus time (except current user who can have 0)
      const filteredLeaderboard = finalLeaderboard.filter(
        (member) =>
          member.isSeparator ||
          member.weeklyFocusTime > 0 ||
          member.uid === currentUserUid
      );

      setLeaderboard(filteredLeaderboard);
    } catch (err) {
      console.error("Error fetching group leaderboard:", err);
      setError(err);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, [groupId, stableMemberUids]);

  useEffect(() => {
    fetchLeaderboard();
  }, [groupId, memberUidsString]); // Use string comparison instead of array

  return {
    leaderboard,
    loading,
    error,
    refetch: fetchLeaderboard,
  };
}

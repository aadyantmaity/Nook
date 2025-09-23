import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getWeeklyFocusStats,
  getFocusSessions,
} from "../services/focusSessions";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

// Helper to calculate current streak from sessions
async function getCurrentStreak(uid) {
  try {
    const sessions = await getFocusSessions(uid);
    if (!sessions || !sessions.length) return 0;
    const workSessions = sessions.filter((s) => s.mode === "work");
    if (!workSessions.length) return 0;
    let streak = 0;
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      const daySessions = workSessions.filter((s) => {
        const sessionDate = s.timestamp?.toDate
          ? s.timestamp.toDate()
          : new Date(s.createdAt);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });
      if (daySessions.length > 0) {
        streak++;
      } else {
        // If today has no sessions, streak is 0 unless yesterday had sessions (streak=0)
        if (i === 0) {
          continue;
        }
        break;
      }
    }
    return streak;
  } catch {
    return 0;
  }
}

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

      // Get weekly focus stats and streak for each member
      const memberStats = await Promise.all(
        stableMemberUids.map(async (uid) => {
          try {
            const stats = await getWeeklyFocusStats(uid);
            const userData = usersData[uid] || {};
            const streak = await getCurrentStreak(uid);

            return {
              uid,
              firstName: userData.firstName || "Unknown",
              lastName: userData.lastName || "",
              profilePic: userData.profilePic || null,
              weeklyFocusTime: stats.weeklyFocusTime,
              weeklySessions: stats.weeklySessions,
              streak: streak,
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
              streak: 0,
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

      // Get top 3 members (always show these even if they have 0)
      const top3 = allMembers.slice(0, 3);

      // Find current user in the full list
      const currentUserIndex = allMembers.findIndex(
        (member) => member.uid === currentUserUid
      );
      const currentUser =
        currentUserIndex !== -1 ? allMembers[currentUserIndex] : null;

      // Create final leaderboard: top 3 + current user (if not in top 3)
      let finalLeaderboard = [...top3];

      if (currentUser && currentUserIndex >= 3) {
        // Add separator object to indicate gap (even if user is 4th)
        finalLeaderboard.push({
          uid: "separator",
          isSeparator: true,
          rank: "...",
        });
        finalLeaderboard.push(currentUser);
      }

      // Always keep top 3; for others, only show members with focus time > 0, except current user who can have 0
      const top3Uids = new Set(top3.map((m) => m.uid));
      const filteredLeaderboard = finalLeaderboard.filter(
        (member) =>
          member.isSeparator ||
          top3Uids.has(member.uid) ||
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

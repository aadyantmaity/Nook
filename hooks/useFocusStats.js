import { useState, useEffect } from "react";
import { getUserFocusStats } from "../services/focusSessions";

export default function useFocusStats(userId = null) {
  const [focusStats, setFocusStats] = useState({
    totalFocusTime: 0,
    totalSessions: 0,
    completedSessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFocusStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await getUserFocusStats(userId);
      setFocusStats(stats);
    } catch (err) {
      console.error("Error fetching focus stats:", err);
      setError(err);
      setFocusStats({
        totalFocusTime: 0,
        totalSessions: 0,
        completedSessions: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFocusStats();
  }, [userId]);

  return {
    focusStats,
    loading,
    error,
    refetch: fetchFocusStats,
  };
}

import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { db, auth } from "../../firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function PrivateNookStats({ spotId, themeColors }) {
  const [stats, setStats] = useState({ totalSessions: 0, totalTime: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      if (!auth.currentUser) return;
      const q = query(
        collection(db, "focusSessions"),
        where("userId", "==", auth.currentUser.uid),
        where("spotId", "==", spotId)
      );
      const snapshot = await getDocs(q);
      let totalSessions = 0;
      let totalTime = 0;
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (!d.isBreak && d.start && d.end) {
          totalSessions++;
          const start = d.start.seconds
            ? d.start.seconds * 1000
            : d.start.toMillis();
          const end = d.end.seconds ? d.end.seconds * 1000 : d.end.toMillis();
          if (
            typeof start === "number" &&
            typeof end === "number" &&
            end > start
          ) {
            totalTime += end - start;
          }
        }
      });
      setStats({ totalSessions, totalTime });
    };
    fetchStats();
  }, [spotId]);

  // Format ms to h m s
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    let out = [];
    if (hours > 0) out.push(`${hours}h`);
    if (minutes > 0 || hours > 0) out.push(`${minutes}m`);
    out.push(`${seconds}s`);
    return out.join(" ");
  };

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: themeColors.gray + "22",
        borderRadius: 12,
        padding: 14,
        marginTop: 18,
        marginBottom: 8,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontWeight: "bold",
          fontSize: 16,
          color: themeColors.purple,
          marginBottom: 6,
        }}
      >
        Your Focus Stats for this Nook
      </Text>
      <Text
        style={{
          color: themeColors.black,
          fontSize: 15,
          marginBottom: 2,
        }}
      >
        Sessions logged:{" "}
        <Text style={{ fontWeight: "bold", color: themeColors.purple }}>
          {stats.totalSessions}
        </Text>
      </Text>
      <Text
        style={{
          color: themeColors.black,
          fontSize: 15,
          marginBottom: 2,
        }}
      >
        Time focused:{" "}
        <Text style={{ fontWeight: "bold", color: themeColors.purple }}>
          {formatTime(stats.totalTime)}
        </Text>
      </Text>
    </View>
  );
}

import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { CaretRight } from "phosphor-react-native";
import { db, auth } from "../../firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function UserFocusStatsDropdown({
  spotId,
  themeColors,
  isPrivateNook,
}) {
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalTime: 0,
    sessions: [],
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!auth.currentUser) return;
      const q = query(
        collection(db, "users", auth.currentUser.uid, "focusSessions"),
        where("spotId", "==", spotId)
      );
      const snapshot = await getDocs(q);
      let totalSessions = 0;
      let totalTime = 0;
      let sessions = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (!d.isBreak && d.start && d.end) {
          totalSessions++;
          // Use duration if present, else fallback to end - start
          let sessionDuration = 0;
          const start = d.start.seconds
            ? d.start.seconds * 1000
            : d.start.toMillis();
          const end = d.end.seconds ? d.end.seconds * 1000 : d.end.toMillis();
          if (typeof d.duration === "number") {
            sessionDuration = d.duration;
          } else if (
            typeof start === "number" &&
            typeof end === "number" &&
            end > start
          ) {
            sessionDuration = end - start;
          }
          if (
            typeof start === "number" &&
            typeof end === "number" &&
            end > start
          ) {
            totalTime += sessionDuration;
            sessions.push({
              ...d,
              start,
              end,
              duration: d.duration || end - start,
            });
          }
        }
      });
      // Sort sessions by most recent
      sessions.sort((a, b) => b.start - a.start);
      setStats({ totalSessions, totalTime, sessions });
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
        borderRadius: 12,
        paddingTop: 8,
      }}
    >
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
        }}
        accessibilityLabel="Toggle Focus Stats"
      >
        <Text
          style={{
            fontWeight: "bold",
            fontSize: 16,
            color: themeColors.purple,
            flex: 1,
            fontFamily: "CarosSoft",
            marginBottom: !isPrivateNook ? 8 : 0,
          }}
        >
          Focus Stats for this Nook
        </Text>
        <CaretRight
          size={22}
          color={themeColors.purple}
          weight="bold"
          style={{
            transform: [{ rotate: expanded ? "90deg" : "0deg" }],
          }}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={{ marginTop: 10 }}>
          <Text
            style={{
              color: themeColors.black,
              fontSize: 15,
              marginBottom: 2,
              fontFamily: "CarosSoft",
            }}
          >
            Sessions logged:{" "}
            <Text
              style={{
                fontWeight: "bold",
                color: themeColors.purple,
                fontFamily: "CarosSoft",
              }}
            >
              {stats.totalSessions}
            </Text>
          </Text>
          <Text
            style={{
              color: themeColors.black,
              fontSize: 15,
              fontFamily: "CarosSoft",
              marginBottom: !isPrivateNook ? 8 : 0,
            }}
          >
            Time focused:{" "}
            <Text
              style={{
                fontWeight: "bold",
                color: themeColors.purple,
                fontFamily: "CarosSoft",
              }}
            >
              {formatTime(stats.totalTime)}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}

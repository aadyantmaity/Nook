import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext } from "../App";
import { colors } from "../constants/colors";
import { ArrowLeft } from "phosphor-react-native";

export default function FocusArchiveScreen({ navigation }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const [archiveData, setArchiveData] = useState({});

  useEffect(() => {
    const loadArchive = async () => {
      try {
        const raw = await AsyncStorage.getItem("focusArchive");
        if (raw) setArchiveData(JSON.parse(raw));
      } catch {}
    };
    loadArchive();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            padding: 8,
            marginRight: 8,
            borderRadius: 8,
            backgroundColor: themeColors.white,
            borderWidth: 1,
            borderColor: themeColors.purple,
          }}
        >
          <ArrowLeft size={22} color={themeColors.purple} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "bold",
            color: themeColors.purple,
          }}
        >
          Goals & Focus Archive
        </Text>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
        {Object.keys(archiveData).length === 0 && (
          <Text style={{ color: themeColors.darkGray, marginTop: 24 }}>
            No archive data found.
          </Text>
        )}
        {Object.keys(archiveData)
          .sort((a, b) => (a < b ? 1 : -1))
          .map((weekKey) => {
            const week = archiveData[weekKey];
            const [year, w] = weekKey.split("-W");
            return (
              <View
                key={weekKey}
                style={{
                  marginBottom: 18,
                  borderBottomWidth: 1,
                  borderBottomColor: themeColors.gray,
                  paddingBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontWeight: "bold",
                    color: themeColors.purple,
                    fontSize: 16,
                    marginBottom: 4,
                  }}
                >
                  Week {w}, {year}
                </Text>
                {/* Goals */}
                <Text
                  style={{
                    color: themeColors.green,
                    fontWeight: "bold",
                    marginBottom: 2,
                  }}
                >
                  Goals Achieved:
                </Text>
                {week.goals && week.goals.length > 0 ? (
                  week.goals
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((goal, idx) => (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: themeColors.green + "18",
                          borderRadius: 8,
                          padding: 8,
                          marginBottom: 4,
                          borderWidth: 1,
                          borderColor: themeColors.green,
                        }}
                      >
                        <Text
                          style={{
                            color: themeColors.green,
                            fontWeight: "bold",
                          }}
                        >
                          {goal.title || "Untitled"} ({goal.minutes} min)
                        </Text>
                        <Text
                          style={{
                            color: themeColors.darkGray,
                            fontSize: 13,
                          }}
                        >
                          {new Date(goal.timestamp).toLocaleDateString()}{" "}
                          {new Date(goal.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                    ))
                ) : (
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    No goals achieved.
                  </Text>
                )}
                {/* Focus Stats */}
                <Text
                  style={{
                    color: themeColors.purple,
                    fontWeight: "bold",
                    marginTop: 6,
                    marginBottom: 2,
                  }}
                >
                  Focus Stats:
                </Text>
                {week.stats && Object.keys(week.stats).length > 0 ? (
                  Object.entries(week.stats).map(([spotId, sessions]) => {
                    const ms = sessions
                      .filter((b) => !b.isBreak)
                      .reduce((a, b) => a + (b.duration || 0), 0);
                    const totalSeconds = Math.floor(ms / 1000);
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    const seconds = totalSeconds % 60;
                    return (
                      <View key={spotId} style={{ marginBottom: 2 }}>
                        <Text
                          style={{
                            color: themeColors.purple,
                            fontWeight: "bold",
                            fontSize: 14,
                          }}
                        >
                          {spotId}
                        </Text>
                        <Text
                          style={{
                            color: themeColors.black,
                            fontSize: 13,
                            marginLeft: 6,
                          }}
                        >
                          {hours}h {minutes}m {seconds}s
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontSize: 13,
                    }}
                  >
                    No focus sessions.
                  </Text>
                )}
              </View>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

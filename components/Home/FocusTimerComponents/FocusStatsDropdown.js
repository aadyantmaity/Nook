import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { CaretRight, Trash } from "phosphor-react-native";

export function FocusStatsDropdown({
  focusStats,
  studySpots,
  openWeekLocations,
  toggleWeekLocation,
  handleDeleteSession,
  themeColors,
  selectedStatSpot,
  setSelectedStatSpot,
  deletingStat,
}) {
  // Only consider non-break sessions for stats
  const nonBreakStats = Object.entries(focusStats)
    .map(([spotId, sessions]) => [
      spotId,
      Array.isArray(sessions) ? sessions.filter((b) => !b.isBreak) : [],
    ])
    .filter(([, sessions]) => sessions.length > 0);

  const totalMs = nonBreakStats
    .flatMap(([, sessions]) => sessions)
    .reduce((a, b) => a + (b.duration || 0), 0);
  const totalSeconds = Math.floor(totalMs / 1000);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
  const totalSecs = totalSeconds % 60;

  return (
    <>
      <View
        style={{
          width: "91.5%",
          alignSelf: "center",
          marginTop: 36,
          marginBottom: 8,
        }}
      >
        {/* Header with total time */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              color: themeColors.purple,
              fontSize: 17,
              flex: 1,
              fontFamily: "CarosSoft",
            }}
          >
            This Week's Focus Stats
          </Text>
          <View
            style={{
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 2,
              marginLeft: 4,
              borderWidth: 1,
              borderColor: themeColors.purple,
            }}
          >
            <Text
              style={{
                color: themeColors.purple,
                fontSize: 13,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
              }}
            >
              {`${totalHours}h ${totalMinutes}m ${totalSecs}s`}
            </Text>
          </View>
        </View>
        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: themeColors.gray,
            marginHorizontal: 8,
            marginBottom: 8,
            opacity: 0.5,
          }}
        />
        <View style={{ padding: 16, paddingTop: 8 }}>
          {/* Per-location dropdowns */}
          {nonBreakStats.length > 0 ? (
            nonBreakStats.map(([spotId, nonBreakSessions]) => {
              const isOpen = openWeekLocations[spotId] || false;
              const ms = nonBreakSessions.reduce(
                (a, b) => a + (b.duration || 0),
                0
              );
              const totalSeconds = Math.floor(ms / 1000);
              const hours = Math.floor(totalSeconds / 3600);
              const minutes = Math.floor((totalSeconds % 3600) / 60);
              const seconds = totalSeconds % 60;
              const spot = studySpots.find((s) => s.id === spotId);
              return (
                <View key={spotId} style={{ marginBottom: 8 }}>
                  <TouchableOpacity
                    onPress={() => toggleWeekLocation(spotId)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: themeColors.white,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      marginBottom: isOpen ? 4 : 0,
                    }}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={{
                        color: themeColors.purple,
                        fontWeight: "bold",
                        fontSize: 14,
                        flex: 1,
                        fontFamily: "CarosSoft",
                      }}
                    >
                      {spot
                        ? `${spot.buildingName}${
                            spot.roomNumber ? ` - Floor ${spot.roomNumber}` : ""
                          }`
                        : "Spot Deleted"}
                    </Text>
                    <Text
                      style={{
                        color: themeColors.black,
                        fontSize: 13,
                        marginRight: 8,
                        fontWeight: "bold",
                        fontFamily: "CarosSoft",
                      }}
                    >
                      {hours}h {minutes}m {seconds}s
                    </Text>
                    <CaretRight
                      size={20}
                      color={themeColors.purple}
                      style={{
                        transform: [{ rotate: isOpen ? "90deg" : "0deg" }],
                      }}
                    />
                  </TouchableOpacity>
                  {isOpen && (
                    <View style={{ marginTop: 2 }}>
                      {nonBreakSessions.length > 0 ? (
                        <ScrollView
                          style={{ maxHeight: 180 }}
                          contentContainerStyle={{ paddingBottom: 4 }}
                          showsVerticalScrollIndicator={false}
                        >
                          {nonBreakSessions
                            .sort((a, b) => b.start - a.start)
                            .map((s, idx) => (
                              <View
                                key={s.sessionId || idx}
                                style={{
                                  marginLeft: 8,
                                  marginBottom: 4,
                                  borderRadius: 8,
                                  padding: 8,
                                  flexDirection: "row",
                                  alignItems: "center",
                                }}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text
                                    style={{
                                      color: themeColors.black,
                                      fontSize: 13,
                                      fontWeight: "bold",
                                      fontFamily: "CarosSoft",
                                    }}
                                  >
                                    {s.start
                                      ? new Date(s.start).toLocaleString([], {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : ""}
                                    {" - "}
                                    <Text
                                      style={{
                                        color: themeColors.black,
                                        fontFamily: "CarosSoft",
                                      }}
                                    >
                                      {(() => {
                                        const sec = Math.floor(
                                          (s.duration || 0) / 1000
                                        );
                                        const h = Math.floor(sec / 3600);
                                        const m = Math.floor((sec % 3600) / 60);
                                        const sec2 = sec % 60;
                                        let out = [];
                                        if (h > 0) out.push(`${h}h`);
                                        if (m > 0 || h > 0) out.push(`${m}m`);
                                        out.push(`${sec2}s`);
                                        return out.join(" ");
                                      })()}
                                    </Text>
                                  </Text>
                                  {s.note ? (
                                    <Text
                                      style={{
                                        color: themeColors.purple,
                                        fontSize: 13,
                                        marginTop: 2,
                                        fontStyle: "italic",
                                        fontFamily: "CarosSoft",
                                      }}
                                    >
                                      "{s.note}"
                                    </Text>
                                  ) : null}
                                </View>
                                <TouchableOpacity
                                  onPress={() => handleDeleteSession(s, spotId)}
                                  style={{
                                    marginLeft: 8,
                                    padding: 4,
                                    borderRadius: 6,
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                  accessibilityLabel="Delete session"
                                >
                                  <Trash size={18} color={themeColors.red} />
                                </TouchableOpacity>
                              </View>
                            ))}
                        </ScrollView>
                      ) : (
                        <Text
                          style={{
                            color: themeColors.darkGray,
                            fontSize: 13,
                            marginLeft: 8,
                            fontFamily: "CarosSoft",
                          }}
                        >
                          No sessions.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <Text
              style={{
                color: themeColors.darkGray,
                fontSize: 13,
                marginLeft: 4,
                fontFamily: "CarosSoft",
              }}
            >
              No focus sessions.
            </Text>
          )}
        </View>
      </View>
    </>
  );
}

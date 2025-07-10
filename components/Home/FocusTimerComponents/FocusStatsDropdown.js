import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal } from "react-native";
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
  showStatModal,
  setShowStatModal,
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
                              <TouchableOpacity
                                key={s.sessionId || idx}
                                onPress={() => {
                                  setSelectedStatSpot({
                                    spotId,
                                    spot,
                                    ms,
                                    hours,
                                    minutes,
                                    seconds,
                                    sessions: nonBreakSessions,
                                  });
                                  setShowStatModal(true);
                                }}
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
                                      “{s.note}”
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
                              </TouchableOpacity>
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
      {/* --- Stat Card Modal with session list and notes --- */}
      <Modal
        visible={!!showStatModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPressOut={() => setShowStatModal(false)}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 12,
              padding: 20,
              width: "85%",
              alignItems: "center",
              maxHeight: "85%",
            }}
            onStartShouldSetResponder={() => true}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: themeColors.black,
                marginBottom: 8,
                fontFamily: "CarosSoft",
              }}
            >
              {selectedStatSpot?.spot
                ? `${selectedStatSpot.spot.buildingName}${
                    selectedStatSpot.spot.roomNumber
                      ? ` - Floor ${selectedStatSpot.spot.roomNumber}`
                      : ""
                  }`
                : "Spot Deleted"}
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: themeColors.purple,
                marginBottom: 8,
                fontFamily: "CarosSoft",
              }}
            >
              Focused for:{" "}
              {selectedStatSpot
                ? `${selectedStatSpot.hours}h ${selectedStatSpot.minutes}m ${selectedStatSpot.seconds}s`
                : ""}
            </Text>
            {/* Session List with Notes (delete button removed) */}
            <ScrollView
              style={{ width: "100%", maxHeight: 220, marginBottom: 12 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {selectedStatSpot?.sessions?.length > 0 ? (
                selectedStatSpot.sessions
                  .filter((session) => !session.isBreak)
                  .sort((a, b) => b.start - a.start)
                  .map((session, idx, arr) => {
                    const date = new Date(session.start);
                    const durationSec = Math.floor(
                      (session.duration || 0) / 1000
                    );
                    const hours = Math.floor(durationSec / 3600);
                    const minutes = Math.floor((durationSec % 3600) / 60);
                    const seconds = durationSec % 60;
                    return (
                      <View
                        key={session.sessionId}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "flex-start",
                          borderBottomWidth: idx === arr.length - 1 ? 0 : 1,
                          borderBottomColor: themeColors.gray,
                          paddingVertical: 10,
                          backgroundColor: "#fff",
                          minHeight: 48,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: themeColors.black,
                              fontWeight: "bold",
                              fontSize: 15,
                              fontFamily: "CarosSoft",
                            }}
                          >
                            {date.toLocaleDateString()}{" "}
                            {date.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                          <Text
                            style={{
                              color: themeColors.darkGray,
                              fontSize: 13,
                              fontFamily: "CarosSoft",
                            }}
                          >
                            Duration: {hours}h {minutes}m {seconds}s
                          </Text>
                          {session.note ? (
                            <Text
                              style={{
                                color: themeColors.purple,
                                fontSize: 14,
                                marginTop: 2,
                                fontStyle: "italic",
                                fontFamily: "CarosSoft",
                              }}
                            >
                              “{session.note}”
                            </Text>
                          ) : (
                            <Text
                              style={{
                                color: themeColors.gray,
                                fontSize: 13,
                                marginTop: 2,
                                fontStyle: "italic",
                              }}
                            >
                              No reflection
                            </Text>
                          )}
                        </View>
                        {/* Delete button removed */}
                      </View>
                    );
                  })
              ) : (
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontSize: 14,
                    fontFamily: "CarosSoft",
                  }}
                >
                  No sessions for this spot this week.
                </Text>
              )}
            </ScrollView>
            <Text
              style={{
                fontSize: 14,
                color: themeColors.darkGray,
                marginBottom: 18,
                textAlign: "center",
                fontFamily: "CarosSoft",
              }}
            >
              You can view your sessions for this spot.
            </Text>
            <View style={{ flexDirection: "row", width: "100%" }}>
              <TouchableOpacity
                onPress={() => setShowStatModal(false)}
                disabled={deletingStat}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.white,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                  borderColor: themeColors.black,
                  borderWidth: 0.5,
                  marginRight: 8,
                }}
              >
                <Text
                  style={{
                    color: themeColors.purple,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                  }}
                >
                  Close
                </Text>
              </TouchableOpacity>
              {/* Delete All button removed */}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

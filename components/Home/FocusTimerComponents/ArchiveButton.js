import React, { useState } from "react";
import { TouchableOpacity, Text, View, Modal, ScrollView } from "react-native";
import { Archive, CaretRight, Trash } from "phosphor-react-native";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";

export function ArchiveButton({
  themeColors,
  studySpots,
  auth,
  db,
  handleDeleteSession,
}) {
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveData, setArchiveData] = useState({});
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [openArchiveMonths, setOpenArchiveMonths] = useState({});
  const [openArchiveLocations, setOpenArchiveLocations] = useState({});

  // --- Fetch all-time sessions for archive ---
  const fetchArchiveData = async () => {
    if (!auth.currentUser) return;
    setArchiveLoading(true);
    try {
      const q = query(
        collection(db, "focusSessions"),
        where("userId", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      // Group by year -> month -> spotId, EXCLUDE breaks
      const data = {};
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (!d.spotId || !d.start || !d.end || d.isBreak) return;
        const spotId = d.spotId;
        const startMillis = d.start.seconds
          ? d.start.seconds * 1000
          : d.start.toMillis();
        const date = new Date(startMillis);
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // 1-based
        if (!data[year]) data[year] = {};
        if (!data[year][month]) data[year][month] = {};
        if (!data[year][month][spotId]) data[year][month][spotId] = [];
        data[year][month][spotId].push({
          ...d,
          start: startMillis,
          end: d.end.seconds ? d.end.seconds * 1000 : d.end.toMillis(),
          duration: d.duration,
        });
      });
      setArchiveData(data);
    } catch (e) {
      // Optionally handle error
    }
    setArchiveLoading(false);
  };

  // --- Open/close month dropdown in archive ---
  const toggleArchiveMonth = (year, month) => {
    const key = `${year}_${month}`;
    setOpenArchiveMonths((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // --- Open/close location dropdown in archive ---
  const toggleArchiveLocation = (year, month, spotId) => {
    const key = `${year}_${month}_${spotId}`;
    setOpenArchiveLocations((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // --- Open Archive Modal Handler ---
  const handleOpenArchive = async () => {
    await fetchArchiveData();
    setShowArchiveModal(true);
  };

  // --- Local delete handler for archive modal only ---
  const handleDeleteSessionArchive = async (
    session,
    spotId,
    archiveContext
  ) => {
    if (handleDeleteSession) {
      handleDeleteSession(session, spotId, archiveContext);
      // UI update for archiveData is handled in parent via setArchiveData if needed
    }
  };

  return (
    <>
      <View
        style={{
          marginBottom: 36,
          zIndex: 20,
          paddingHorizontal: 16,
          alignSelf: "flex-end",
          position: "absolute",
          top: 8,
          right: 0,
        }}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={handleOpenArchive}
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 20,
            paddingVertical: 6,
            paddingHorizontal: 10,
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: 2,
            alignItems: "center",
            flexDirection: "row",
            minWidth: 48,
          }}
          accessibilityLabel="Open Focus Archive"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Archive size={24} color={themeColors.purple} weight="bold" />
          <Text
            style={{
              color: themeColors.purple,
              fontSize: 13,
              fontWeight: "bold",
              marginLeft: 6,
              letterSpacing: 0.5,
              textAlign: "center",
              fontFamily: "CarosSoft",
            }}
          >
            Archive
          </Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={showArchiveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowArchiveModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 14,
              padding: 18,
              width: "92%",
              maxHeight: "90%",
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: themeColors.purple,
                marginBottom: 10,
                textAlign: "center",
                fontFamily: "CarosSoft",
              }}
            >
              Focus Archive
            </Text>
            {archiveLoading ? (
              <Text
                style={{
                  color: themeColors.darkGray,
                  textAlign: "center",
                  fontFamily: "CarosSoft",
                }}
              >
                Loading...
              </Text>
            ) : Object.keys(archiveData).length === 0 ? (
              <Text
                style={{
                  color: themeColors.darkGray,
                  textAlign: "center",
                  fontFamily: "CarosSoft",
                }}
              >
                No focus sessions found.
              </Text>
            ) : (
              <ScrollView
                style={{ maxHeight: 420 }}
                showsVerticalScrollIndicator={false}
              >
                {Object.entries(archiveData)
                  .sort((a, b) => b[0] - a[0])
                  .map(([year, months]) => (
                    <View key={year} style={{ marginBottom: 12 }}>
                      <Text
                        style={{
                          color: themeColors.black,
                          fontWeight: "bold",
                          fontSize: 16,
                          marginBottom: 2,
                          fontFamily: "CarosSoft",
                        }}
                      >
                        {year}
                      </Text>
                      {Object.entries(months)
                        .sort((a, b) => b[0] - a[0])
                        .map(([month, spots]) => {
                          const monthKey = `${year}_${month}`;
                          const isMonthOpen =
                            openArchiveMonths[monthKey] || false;
                          return (
                            <View key={month} style={{ marginLeft: 8 }}>
                              <TouchableOpacity
                                onPress={() => toggleArchiveMonth(year, month)}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  paddingVertical: 6,
                                }}
                              >
                                <Text
                                  style={{
                                    color: themeColors.purple,
                                    fontSize: 15,
                                    fontWeight: "bold",
                                    flex: 1,
                                    fontFamily: "CarosSoft",
                                  }}
                                >
                                  {new Date(
                                    2000,
                                    parseInt(month) - 1
                                  ).toLocaleString("default", {
                                    month: "long",
                                  })}
                                </Text>
                                <CaretRight
                                  size={18}
                                  color={themeColors.purple}
                                  weight="bold"
                                  style={{
                                    transform: [
                                      {
                                        rotate: isMonthOpen ? "90deg" : "0deg",
                                      },
                                    ],
                                  }}
                                />
                              </TouchableOpacity>
                              {isMonthOpen && (
                                <View>
                                  {Object.entries(spots).map(
                                    ([spotId, sessions]) => {
                                      const locKey = `${year}_${month}_${spotId}`;
                                      const isLocOpen =
                                        openArchiveLocations[locKey] || false;
                                      const spot = studySpots.find(
                                        (s) => s.id === spotId
                                      );
                                      return (
                                        <View
                                          key={spotId}
                                          style={{ marginLeft: 8 }}
                                        >
                                          <TouchableOpacity
                                            onPress={() =>
                                              toggleArchiveLocation(
                                                year,
                                                month,
                                                spotId
                                              )
                                            }
                                            style={{
                                              flexDirection: "row",
                                              alignItems: "center",
                                              paddingVertical: 4,
                                            }}
                                          >
                                            <Text
                                              style={{
                                                color: themeColors.purple,
                                                fontSize: 14,
                                                fontWeight: "bold",
                                                flex: 1,
                                                fontFamily: "CarosSoft",
                                              }}
                                            >
                                              {spot
                                                ? `${spot.buildingName}${
                                                    spot.roomNumber
                                                      ? ` - Floor ${spot.roomNumber}`
                                                      : ""
                                                  }`
                                                : "Spot Deleted"}
                                            </Text>
                                            <CaretRight
                                              size={16}
                                              color={themeColors.purple}
                                              weight="bold"
                                              style={{
                                                transform: [
                                                  {
                                                    rotate: isLocOpen
                                                      ? "90deg"
                                                      : "0deg",
                                                  },
                                                ],
                                              }}
                                            />
                                          </TouchableOpacity>
                                          {isLocOpen && (
                                            <View>
                                              {sessions
                                                .sort(
                                                  (a, b) => b.start - a.start
                                                )
                                                .map((s, idx) => {
                                                  const date = new Date(
                                                    s.start
                                                  );
                                                  const durationSec =
                                                    Math.floor(
                                                      (s.duration || 0) / 1000
                                                    );
                                                  const hours = Math.floor(
                                                    durationSec / 3600
                                                  );
                                                  const minutes = Math.floor(
                                                    (durationSec % 3600) / 60
                                                  );
                                                  const seconds =
                                                    durationSec % 60;
                                                  return (
                                                    <View
                                                      key={s.sessionId || idx}
                                                      style={{
                                                        backgroundColor:
                                                          themeColors.gray +
                                                          "10",
                                                        borderRadius: 8,
                                                        padding: 8,
                                                        marginVertical: 2,
                                                        marginLeft: 8,
                                                        borderWidth: 1,
                                                        borderColor:
                                                          themeColors.gray +
                                                          "44",
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                      }}
                                                    >
                                                      <View style={{ flex: 1 }}>
                                                        <Text
                                                          style={{
                                                            color:
                                                              themeColors.black,
                                                            fontWeight: "bold",
                                                            fontSize: 13,
                                                            fontFamily:
                                                              "CarosSoft",
                                                          }}
                                                        >
                                                          {date.toLocaleDateString()}{" "}
                                                          {date.toLocaleTimeString(
                                                            [],
                                                            {
                                                              hour: "2-digit",
                                                              minute: "2-digit",
                                                            }
                                                          )}
                                                        </Text>
                                                        <Text
                                                          style={{
                                                            color:
                                                              themeColors.darkGray,
                                                            fontSize: 13,
                                                            fontFamily:
                                                              "CarosSoft",
                                                          }}
                                                        >
                                                          Duration: {hours}h{" "}
                                                          {minutes}m {seconds}s
                                                        </Text>
                                                      </View>
                                                      <TouchableOpacity
                                                        onPress={() =>
                                                          handleDeleteSessionArchive(
                                                            s,
                                                            spotId,
                                                            {
                                                              year,
                                                              month,
                                                              spotId,
                                                            }
                                                          )
                                                        }
                                                        style={{
                                                          marginLeft: 8,
                                                          padding: 4,
                                                          borderRadius: 6,
                                                          backgroundColor:
                                                            themeColors.red,
                                                          alignItems: "center",
                                                          justifyContent:
                                                            "center",
                                                        }}
                                                        accessibilityLabel="Delete session"
                                                      >
                                                        <Trash
                                                          size={18}
                                                          color={
                                                            themeColors.white
                                                          }
                                                          weight="bold"
                                                        />
                                                      </TouchableOpacity>
                                                    </View>
                                                  );
                                                })}
                                            </View>
                                          )}
                                        </View>
                                      );
                                    }
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        })}
                    </View>
                  ))}
              </ScrollView>
            )}
            <TouchableOpacity
              onPress={() => setShowArchiveModal(false)}
              style={{
                marginTop: 12,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

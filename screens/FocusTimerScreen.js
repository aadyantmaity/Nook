import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import {
  ArrowLeft,
  Timer,
  MapPin,
  Play,
  Pause,
  Stop,
} from "phosphor-react-native";
import { db, auth } from "../firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  query,
  where,
} from "firebase/firestore";
import { ThemeContext } from "../App";
import { colors } from "../constants/colors";

const POMODORO_MINUTES = 25;
const BREAK_MINUTES = 5;

export default function FocusTimerScreen({ navigation }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;

  const [studySpots, setStudySpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [timer, setTimer] = useState(POMODORO_MINUTES * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [focusStats, setFocusStats] = useState({});
  const [showSpotModal, setShowSpotModal] = useState(false);

  // Fetch study spots for location selection
  useEffect(() => {
    const fetchSpots = async () => {
      const snapshot = await getDocs(collection(db, "studySpots"));
      setStudySpots(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    };
    fetchSpots();
  }, []);

  // Fetch focus stats for the current user
  useEffect(() => {
    const fetchStats = async () => {
      if (!auth.currentUser) return;
      const stats = {};
      const weekAgo = Timestamp.now().toMillis() - 7 * 24 * 60 * 60 * 1000;
      const q = query(
        collection(db, "focusSessions"),
        where("userId", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.spotId && data.start && data.end) {
          const start = data.start.seconds
            ? data.start.seconds * 1000
            : data.start.toMillis();
          const end = data.end.seconds
            ? data.end.seconds * 1000
            : data.end.toMillis();
          if (end > weekAgo) {
            stats[data.spotId] = (stats[data.spotId] || 0) + (end - start);
          }
        }
      });
      setFocusStats(stats);
    };
    fetchStats();
    // Only update stats after a session ends, not on every isRunning change
    // eslint-disable-next-line
  }, [isBreak]); // Change dependency from [isRunning] to [isBreak]

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      const id = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(id);
            handleSessionEnd();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      setIntervalId(id);
      return () => clearInterval(id);
    } else if (intervalId) {
      clearInterval(intervalId);
    }
    // eslint-disable-next-line
  }, [isRunning]);

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Start a session
  const [sessionStart, setSessionStart] = useState(null);

  // Helper to add a session to Firestore and update stats immediately
  const addSessionAndUpdateStats = async (start, end, isBreakSession) => {
    if (start && auth.currentUser && selectedSpot) {
      const duration = end.toMillis() - start.toMillis();
      await addDoc(collection(db, "focusSessions"), {
        userId: auth.currentUser.uid,
        spotId: selectedSpot.id,
        start,
        end,
        duration,
        isBreak: isBreakSession,
      });
      // Update stats locally for immediate feedback
      const weekAgo = Timestamp.now().toMillis() - 7 * 24 * 60 * 60 * 1000;
      if (end.toMillis() > weekAgo) {
        setFocusStats((prev) => {
          const prevVal = prev[selectedSpot.id] || 0;
          return { ...prev, [selectedSpot.id]: prevVal + duration };
        });
      }
    }
  };

  const handleStart = () => {
    if (!selectedSpot) {
      Alert.alert("Select a location to start focus mode.");
      return;
    }
    setIsRunning(true);
    setSessionStart(Timestamp.now());
  };

  // Pause
  const handlePause = () => setIsRunning(false);

  // Stop and save session (add to Firestore and update stats)
  const handleStop = async () => {
    setIsRunning(false);
    setTimer(POMODORO_MINUTES * 60);
    if (sessionStart) {
      const end = Timestamp.now();
      await addSessionAndUpdateStats(sessionStart, end, isBreak);
    }
    setSessionStart(null);
    setIsBreak(false);
  };

  // When timer ends (Pomodoro or break complete)
  const handleSessionEnd = async () => {
    setIsRunning(false);
    if (sessionStart) {
      const end = Timestamp.now();
      await addSessionAndUpdateStats(sessionStart, end, isBreak);
    }
    setSessionStart(null);
    if (!isBreak) {
      setIsBreak(true);
      setTimer(BREAK_MINUTES * 60);
      Alert.alert("Pomodoro complete!", "Time for a break.");
    } else {
      setIsBreak(false);
      setTimer(POMODORO_MINUTES * 60);
      Alert.alert("Break over!", "Ready for another Pomodoro?");
    }
  };

  // Show stats for the week
  const renderStats = () => {
    if (!Object.keys(focusStats).length) {
      return (
        <Text style={{ color: themeColors.darkGray, marginTop: 8 }}>
          No focus sessions this week.
        </Text>
      );
    }

    // Calculate total focus time
    const totalMs = Object.values(focusStats).reduce((a, b) => a + b, 0);
    const totalSeconds = Math.floor(totalMs / 1000);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const totalSecs = totalSeconds % 60;

    return (
      <View style={{ marginTop: 12 }}>
        <View
          style={{
            backgroundColor: themeColors.purple,
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            alignItems: "center",
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text
            style={{
              color: themeColors.white,
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            Total Focus Time This Week
          </Text>
          <Text
            style={{ color: themeColors.white, fontSize: 18, marginTop: 2 }}
          >
            {totalHours}h {totalMinutes}m {totalSecs}s
          </Text>
        </View>
        {Object.entries(focusStats).map(([spotId, ms]) => {
          const spot = studySpots.find((s) => s.id === spotId);
          const totalSeconds = Math.floor(ms / 1000);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          return (
            <View
              key={spotId}
              style={{
                backgroundColor: themeColors.white,
                borderRadius: 8,
                padding: 10,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: themeColors.purple,
                shadowColor: themeColors.black,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontSize: 15,
                }}
              >
                {spot?.buildingName || "Unknown"}
                {spot?.roomNumber ? ` - Floor ${spot.roomNumber}` : ""}
              </Text>
              <Text
                style={{ color: themeColors.black, fontSize: 14, marginTop: 2 }}
              >
                {hours}h {minutes}m {seconds}s
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            backgroundColor: themeColors.purple,
            borderRadius: 8,
            padding: 8,
            marginRight: 12,
          }}
        >
          <ArrowLeft size={22} color={themeColors.white} />
        </TouchableOpacity>
      </View>
      <View style={{ alignItems: "center", marginTop: 2 }}>
        <Text
          style={{
            fontSize: 40,
            fontWeight: "bold",
            color: themeColors.black,
            paddingBottom: 24,
          }}
        >
          Focus Mode
        </Text>
        <TouchableOpacity
          onPress={() => setShowSpotModal(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: themeColors.purple,
            borderRadius: 20,
            paddingHorizontal: 18,
            paddingVertical: 10,
            marginBottom: 18,
          }}
        >
          <MapPin size={20} color={themeColors.white} />
          <Text
            style={{
              color: themeColors.white,
              fontWeight: "bold",
              marginLeft: 8,
            }}
          >
            {selectedSpot ? selectedSpot.buildingName : "Select Location"}
          </Text>
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 48,
            fontWeight: "bold",
            color: themeColors.purple,
          }}
        >
          {formatTime(timer)}
        </Text>
        <Text style={{ color: themeColors.darkGray, marginBottom: 18 }}>
          {isBreak ? "Break" : "Pomodoro"}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 12 }}>
          {!isRunning && (
            <TouchableOpacity
              onPress={handleStart}
              style={{
                backgroundColor: themeColors.green,
                borderRadius: 30,
                padding: 18,
                marginHorizontal: 12,
              }}
            >
              <Play size={28} color={themeColors.white} />
            </TouchableOpacity>
          )}
          {isRunning && (
            <TouchableOpacity
              onPress={handlePause}
              style={{
                backgroundColor: themeColors.purple,
                borderRadius: 30,
                padding: 18,
                marginHorizontal: 12,
              }}
            >
              <Pause size={28} color={themeColors.white} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleStop}
            style={{
              backgroundColor: themeColors.red,
              borderRadius: 30,
              padding: 18,
              marginHorizontal: 12,
            }}
          >
            <Stop size={28} color={themeColors.white} />
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 32, width: "80%" }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.black,
            }}
          >
            This Week's Focus Stats
          </Text>
          {renderStats()}
        </View>
      </View>
      {/* Location Picker Modal */}
      <Modal visible={showSpotModal} transparent animationType="slide">
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
              borderRadius: 12,
              padding: 16,
              width: "85%",
              maxHeight: "70%",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: themeColors.black,
                marginBottom: 12,
              }}
            >
              Select Location
            </Text>
            <FlatList
              data={studySpots}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedSpot(item);
                    setShowSpotModal(false);
                  }}
                  style={{
                    padding: 12,
                    borderBottomWidth: 0.5,
                    borderBottomColor: themeColors.gray,
                  }}
                >
                  <Text
                    style={{ color: themeColors.purple, fontWeight: "bold" }}
                  >
                    {item.buildingName}
                  </Text>
                  {item.roomNumber && (
                    <Text style={{ color: themeColors.darkGray, fontSize: 13 }}>
                      Floor {item.roomNumber}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setShowSpotModal(false)}
              style={{
                marginTop: 12,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Firestore "focusSessions" is a COLLECTION at the root of your Firestore database.
// Each document in this collection represents a single focus session.
// Example Firestore structure:
//
// /focusSessions (COLLECTION)
//   /abc123 (DOCUMENT)
//     userId: "uid1"
//     spotId: "spot1"
//     start: <Timestamp>
//     end: <Timestamp>
//     duration: <number>
//     isBreak: <boolean>
//
// The code uses:
//   collection(db, "focusSessions")
// to refer to this collection.
//
// Note: Firestore collections are created automatically when you add the first document to them.
// You do NOT need to manually create the "focusSessions" collection in the Firebase Console.
// When you call addDoc(collection(db, "focusSessions"), {...}), Firestore will create the collection if it doesn't exist.

// If you do not see the "focusSessions" collection in your Firebase Console, make sure at least one session has been completed and saved successfully.
// Check for any errors in your addDoc calls or Firestore security rules that might prevent writing to the collection.

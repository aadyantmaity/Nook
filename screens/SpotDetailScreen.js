import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { House, DotsThreeVertical, Warning, X } from "phosphor-react-native";
import { colors } from "../constants/colors";
import { ThemeContext } from "../App";
import SpotQRModal from "../components/SpotDetail/SpotQRModal";

// Firebase imports
import {
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

// Extracted components
import TagList from "../components/SpotDetail/TagList";
import SpotImage from "../components/SpotDetail/SpotImage";
import RatingsDisplay from "../components/SpotDetail/RatingsDisplay";
import OverallRating from "../components/SpotDetail/OverallRating";
import ActionButtons from "../components/SpotDetail/ActionButtons";
import AddAlertModal from "../components/SpotDetail/AddAlertModal";
import ReportModal from "../components/SpotDetail/ReportModal";
import LiveUpdateSliders from "../components/SpotDetail/LiveUpdateSliders";
import SpotFeedback from "../components/SpotDetail/SpotFeedback";
import PrivateNookNotesModal from "../components/SpotDetail/PrivateNookNotesModal";
import PrivateNookStats from "../components/SpotDetail/PrivateNookStats";

// Hooks
import useSpotDetails from "../hooks/useSpotDetails";
import useSpotImageCache from "../hooks/useSpotImageCache";
import useOverallRatings from "../hooks/useOverallRatings";
import QRCode from "react-native-qrcode-svg";

export default function SpotDetailScreen({ route, navigation }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;

  const { spotId } = route.params || {};
  const [showAddAlertModal, setShowAddAlertModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPrivateNotesModal, setShowPrivateNotesModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Hooks
  const { spot, addedByName, isLoading, setSpot } = useSpotDetails(spotId);
  const cachedPhotoUri = useSpotImageCache(spotId, spot?.photoUrl);
  const {
    userOverallRating,
    averageOverallRating,
    overallRatingsCount,
    pendingOverallRating,
    setPendingOverallRating,
    isSubmittingOverall,
    submitOverallRating,
  } = useOverallRatings(spotId);

  // Add state for live update sliders
  const [liveNoise, setLiveNoise] = useState(
    spot?.ratings?.noise === "N/A" || spot?.ratings?.noise === "No rating yet"
      ? 0
      : Number(spot?.ratings?.noise) || 0
  );
  const [liveCrowd, setLiveCrowd] = useState(
    spot?.ratings?.crowd === "N/A" || spot?.ratings?.crowd === "No rating yet"
      ? 0
      : Number(spot?.ratings?.crowd) || 0
  );
  const [isSubmittingLive, setIsSubmittingLive] = useState(false);

  // --- Private Nook Notes State ---
  const [noteInput, setNoteInput] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showNotesArchive, setShowNotesArchive] = useState(false);
  const [notes, setNotes] = useState([]);

  // Fetch notes for private nook
  React.useEffect(() => {
    if (spot?.privateNook && spotId) {
      const fetchNotes = async () => {
        const spotRef = doc(db, "studySpots", spotId);
        const spotSnap = await getDoc(spotRef);
        if (spotSnap.exists()) {
          setNotes(spotSnap.data().privateNotes || []);
        }
      };
      fetchNotes();
    }
  }, [spot?.privateNook, spotId, showNotesArchive]);

  // Submit handler for live update
  const handleLiveUpdate = async () => {
    setIsSubmittingLive(true);
    try {
      await addDoc(collection(db, "ratings"), {
        spotId,
        noise: liveNoise,
        crowd: liveCrowd,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      Alert.alert("Error", "Failed to submit live update.");
    }
    setIsSubmittingLive(false);
  };

  // Helper for "last updated" display
  function getLastUpdatedLabel(ratings) {
    if (!ratings || !ratings.lastUpdated) return "";
    const now = Date.now();
    const last =
      typeof ratings.lastUpdated === "number"
        ? ratings.lastUpdated
        : ratings.lastUpdated?.toMillis?.() ?? null;
    if (!last) return "";

    const diffMs = now - last;
    const diffMin = Math.floor(diffMs / 60000);

    if (ratings.lastUpdatedType === "window" && ratings.lastWindowHours) {
      if (diffMin < 60) {
        if (diffMin === 0) return "Last updated: just now";
        return `Last updated: ${diffMin} min ago`;
      }
      if (ratings.lastWindowHours === 1) {
        return "Last updated: 1 hour ago (1h avg)";
      }
      return `Last updated: ${ratings.lastWindowHours} hours ago (${ratings.lastWindowHours}h avg)`;
    }
    if (ratings.lastUpdatedType === "today") {
      return "Last updated: Today (daily avg)";
    }
    if (diffMin < 30 && diffMin >= 0) {
      if (diffMin === 0) return "Last updated: just now";
      return `Last updated: ${diffMin} min ago`;
    }
    return "";
  }

  // Function to handle adding alerts
  const handleAddAlert = async (alertText, onClose) => {
    if (!alertText.trim()) {
      Alert.alert("Error", "Alert text cannot be empty.");
      return;
    }
    try {
      const spotRef = doc(db, "studySpots", spotId);
      const alertObj = {
        text: alertText.trim(),
        createdAt: Date.now(),
      };
      await updateDoc(spotRef, {
        locationAlerts: arrayUnion(alertObj),
      });
      setSpot((prev) => ({
        ...prev,
        locationAlerts: [...(prev.locationAlerts || []), alertObj],
      }));
      if (typeof onClose === "function") onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to add alert.");
    }
  };

  const handleDeleteNook = async () => {
    if (!spotId) return;
    Alert.alert(
      "Delete Nook",
      "Are you sure you want to delete this nook? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "studySpots", spotId));
              const user = auth.currentUser;
              if (user) {
                const userRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                  const favs = userDoc.data().favorites || [];
                  if (favs.includes(spotId)) {
                    await updateDoc(userRef, {
                      favorites: favs.filter((f) => f !== spotId),
                    });
                  }
                }
              }
              navigation.navigate("Home", { refresh: true });
            } catch (e) {
              Alert.alert("Error", "Failed to delete nook.");
            }
          },
        },
      ]
    );
  };

  if (isLoading || !spot) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.white,
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 32,
          paddingBottom: 24,
        }}
      >
        <Text style={{ color: themeColors.darkGray, fontSize: 16 }}>
          Loading...
        </Text>
      </View>
    );
  }

  const tags = Array.isArray(spot.tags) ? spot.tags : [];
  const isPrivateNook = !!spot.privateNook;

  // Save note for private nook
  const handleSaveNote = async () => {
    if (!noteInput.trim()) return;
    setIsSavingNote(true);
    try {
      const spotRef = doc(db, "studySpots", spotId);
      const noteObj = {
        text: noteInput.trim(),
        createdAt: Date.now(),
      };
      const prevNotes = Array.isArray(spot.privateNotes)
        ? spot.privateNotes
        : [];
      await updateDoc(spotRef, {
        privateNotes: [...prevNotes, noteObj],
      });
      setNotes([...prevNotes, noteObj]);
      setSpot((prev) => ({
        ...prev,
        privateNotes: [...prevNotes, noteObj],
      }));
      setNoteInput("");
    } catch (e) {
      Alert.alert("Error", "Failed to save note.");
    }
    setIsSavingNote(false);
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: themeColors.white, paddingTop: 48 }}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 16,
            backgroundColor: themeColors.white,
            paddingTop: 0, // already handled by outer View
            paddingBottom: 80, // add extra bottom padding to avoid FAB overlap
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar */}
          <View
            style={{
              width: "100%",
              marginBottom: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              onPress={() =>
                navigation.navigate(
                  "Home",
                  route.params?.view ? { view: route.params.view } : undefined
                )
              }
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                padding: 10,
                shadowColor: themeColors.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                marginBottom: 8,
                marginLeft: -8,
              }}
            >
              <House size={20} color={themeColors.purple} />
            </TouchableOpacity>
            {/* Add Alert button and More Info Dropdown Menu */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                position: "relative",
              }}
            >
              {/* More Info Dropdown Menu */}
              <TouchableOpacity
                onPress={() => setShowMenu((v) => !v)}
                style={{
                  padding: 8,
                  borderRadius: 20,
                  backgroundColor: themeColors.white,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: -16,
                }}
              >
                <DotsThreeVertical
                  size={26}
                  color={themeColors.purple}
                  weight="bold"
                />
              </TouchableOpacity>
              {/* Add Alert Button with Text */}

              {showMenu && (
                <>
                  {/* Overlay to close menu when clicking outside */}
                  <TouchableOpacity
                    style={{
                      position: "absolute",
                      top: 0,
                      left: -1000,
                      right: -1000,
                      bottom: -1000,
                      width: 3000,
                      height: 3000,
                      zIndex: 99,
                    }}
                    activeOpacity={1}
                    onPress={() => setShowMenu(false)}
                  />
                  <View
                    style={{
                      position: "absolute",
                      top: 36,
                      right: 0,
                      backgroundColor: themeColors.white,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: themeColors.gray,
                      minWidth: 180,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.18,
                      shadowRadius: 8,
                      elevation: 10,
                      zIndex: 100,
                    }}
                  >
                    {/* Show QR Code */}
                    <TouchableOpacity
                      onPress={() => {
                        setShowMenu(false);
                        setShowQRModal(true);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 14,
                        paddingHorizontal: 18,
                      }}
                    >
                      <Text
                        style={{
                          color: themeColors.purple,
                          fontWeight: "bold",
                          fontSize: 15,
                        }}
                      >
                        Show QR Code
                      </Text>
                    </TouchableOpacity>
                    {/* Divider */}
                    <View
                      style={{
                        height: 1,
                        backgroundColor: themeColors.gray,
                        marginHorizontal: 10,
                      }}
                    />
                    {/* Report Incorrect Info */}
                    <TouchableOpacity
                      onPress={() => {
                        setShowMenu(false);
                        setTimeout(() => setShowReportModal(true), 200);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 14,
                        paddingHorizontal: 18,
                      }}
                    >
                      <Text
                        style={{
                          color: themeColors.purple,
                          fontWeight: "bold",
                          fontSize: 15,
                        }}
                      >
                        Report Incorrect Information
                      </Text>
                    </TouchableOpacity>
                    {/* Divider */}
                    <View
                      style={{
                        height: 1,
                        backgroundColor: themeColors.gray,
                        marginHorizontal: 10,
                      }}
                    />
                    {/* Delete Nook (only for owner) */}
                    <TouchableOpacity
                      onPress={() => {
                        setShowMenu(false);
                        setTimeout(handleDeleteNook, 200);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 14,
                        paddingHorizontal: 18,
                      }}
                    >
                      <Text
                        style={{
                          color: themeColors.red,
                          fontWeight: "bold",
                          fontSize: 15,
                        }}
                      >
                        Delete Nook
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Spot Image */}
          <SpotImage
            photoUrl={spot.photoUrl}
            cachedPhotoUri={cachedPhotoUri}
            themeColors={themeColors}
          />

          {/* Spot Name and Floor */}
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: themeColors.black,
              marginBottom: 6,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {spot.buildingName}
            {spot.roomNumber && (
              <Text
                style={{
                  fontSize: 24,
                  color: themeColors.black,
                  fontWeight: "bold",
                }}
              >
                {" - Floor "}
                {spot.roomNumber}
              </Text>
            )}
          </Text>

          {/* Husky Card/Department info */}
          {(spot.huskyCardNeeded || spot.department) && (
            <Text
              style={{
                fontSize: 15,
                color: spot.huskyCardNeeded
                  ? themeColors.red
                  : themeColors.darkGray,
                marginBottom: 8,
                marginTop: 2,
                fontWeight: spot.huskyCardNeeded ? "bold" : "normal",
              }}
            >
              {spot.huskyCardNeeded && "Husky Card Required"}
              {spot.huskyCardNeeded && spot.department && (
                <Text
                  style={{ color: themeColors.darkGray, fontWeight: "normal" }}
                >
                  {" "}
                  •{" "}
                </Text>
              )}
              {spot.department && (
                <Text
                  style={{ color: themeColors.darkGray, fontWeight: "normal" }}
                >
                  Department: {spot.department}
                </Text>
              )}
            </Text>
          )}

          {/* Hide ratings/alerts UI for private nooks */}
          {!isPrivateNook && (
            <>
              <OverallRating
                userOverallRating={userOverallRating}
                averageOverallRating={averageOverallRating}
                overallRatingsCount={overallRatingsCount}
                pendingOverallRating={pendingOverallRating}
                setPendingOverallRating={setPendingOverallRating}
                isSubmittingOverall={isSubmittingOverall}
                onSubmit={submitOverallRating}
                themeColors={themeColors}
              />
            </>
          )}

          {/* Tags */}
          <TagList tags={tags} themeColors={themeColors} />

          {/* Ratings */}
          {!isPrivateNook && (
            <View style={{ marginTop: 16 }}>
              <RatingsDisplay
                ratings={spot.ratings}
                themeColors={themeColors}
                getLastUpdatedLabel={getLastUpdatedLabel}
              />
              <View style={{ marginTop: 8, alignItems: "flex-end" }}>
                <Text style={{ color: themeColors.darkGray, fontSize: 13 }}>
                  {getLastUpdatedLabel(spot.ratings)}
                </Text>
              </View>
            </View>
          )}

          {/* Live Update Sliders (compact, extracted component) */}
          {!isPrivateNook && (
            <View style={{ marginTop: 14 }}>
              <LiveUpdateSliders
                liveNoise={liveNoise}
                setLiveNoise={setLiveNoise}
                liveCrowd={liveCrowd}
                setLiveCrowd={setLiveCrowd}
                isSubmittingLive={isSubmittingLive}
                onSubmit={handleLiveUpdate}
                themeColors={themeColors}
              />
            </View>
          )}

          {/* Spot Feedback (Thumbs up/down) */}
          {!isPrivateNook && (
            <SpotFeedback spotId={spotId} themeColors={themeColors} />
          )}

          {/* Modals */}
          {!isPrivateNook && (
            <>
              <AddAlertModal
                visible={showAddAlertModal}
                onClose={() => setShowAddAlertModal(false)}
                onAddAlert={handleAddAlert}
                themeColors={themeColors}
              />
              <ReportModal
                visible={showReportModal}
                onClose={() => setShowReportModal(false)}
                spotId={spotId}
                spotName={spot?.buildingName || ""}
                themeColors={themeColors}
              />
              {/* QR Code Modal */}
              <SpotQRModal
                visible={showQRModal}
                onClose={() => setShowQRModal(false)}
                spotId={spotId}
                themeColors={themeColors}
              />
            </>
          )}
          {/* Private Nook: Personal Notes and Stats */}
          {spot?.privateNook && (
            <>
              <PrivateNookStats spotId={spotId} themeColors={themeColors} />
              {/* --- Inline Notes Input --- */}
              <View
                style={{
                  marginTop: 18,
                  marginBottom: 8,
                  backgroundColor: themeColors.gray + "22",
                  borderRadius: 10,
                  padding: 14,
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
                  Personal Notes
                </Text>
                <TextInput
                  placeholder="Write a note about this nook..."
                  placeholderTextColor={themeColors.darkGray}
                  value={noteInput}
                  onChangeText={setNoteInput}
                  style={{
                    borderWidth: 1,
                    borderColor: themeColors.purple,
                    borderRadius: 8,
                    padding: 10,
                    backgroundColor: themeColors.white,
                    color: themeColors.black,
                    marginBottom: 8,
                  }}
                  multiline
                  editable={!isSavingNote}
                />
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <TouchableOpacity
                    onPress={handleSaveNote}
                    disabled={isSavingNote || !noteInput.trim()}
                    style={{
                      backgroundColor: themeColors.purple,
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 18,
                      alignItems: "center",
                      opacity: isSavingNote || !noteInput.trim() ? 0.6 : 1,
                    }}
                  >
                    <Text
                      style={{ color: themeColors.white, fontWeight: "bold" }}
                    >
                      {isSavingNote ? "Saving..." : "Save Note"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowNotesArchive(true)}
                    style={{
                      backgroundColor: themeColors.gray,
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 18,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ color: themeColors.purple, fontWeight: "bold" }}
                    >
                      View All Notes
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* --- Notes Archive Modal --- */}
              <Modal
                visible={showNotesArchive}
                transparent
                animationType="slide"
                onRequestClose={() => setShowNotesArchive(false)}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.3)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onPressOut={() => setShowNotesArchive(false)}
                >
                  <View
                    style={{
                      backgroundColor: themeColors.white,
                      borderRadius: 16,
                      padding: 24,
                      width: "85%",
                      maxHeight: "70%",
                      alignItems: "center",
                    }}
                    onStartShouldSetResponder={() => true}
                  >
                    <View style={{ width: "100%", alignItems: "flex-end" }}>
                      <TouchableOpacity
                        onPress={() => setShowNotesArchive(false)}
                        style={{ padding: 4 }}
                      >
                        <X size={22} color={themeColors.purple} weight="bold" />
                      </TouchableOpacity>
                    </View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        color: themeColors.purple,
                        marginBottom: 10,
                        textAlign: "center",
                      }}
                    >
                      Notes Archive
                    </Text>
                    {notes && notes.length > 0 ? (
                      <FlatList
                        data={[...notes].sort(
                          (a, b) => b.createdAt - a.createdAt
                        )}
                        keyExtractor={(_, idx) => idx.toString()}
                        style={{ width: "100%" }}
                        contentContainerStyle={{ paddingBottom: 8 }}
                        renderItem={({ item }) => (
                          <View
                            style={{
                              marginBottom: 14,
                              backgroundColor: themeColors.gray + "18",
                              borderRadius: 10,
                              padding: 12,
                            }}
                          >
                            <Text
                              style={{
                                color: themeColors.black,
                                fontSize: 15,
                                marginBottom: 4,
                              }}
                            >
                              {item.text}
                            </Text>
                            <Text
                              style={{
                                color: themeColors.darkGray,
                                fontSize: 12,
                                textAlign: "right",
                              }}
                            >
                              {item.createdAt
                                ? new Date(item.createdAt).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </Text>
                          </View>
                        )}
                      />
                    ) : (
                      <Text
                        style={{ color: themeColors.darkGray, fontSize: 15 }}
                      >
                        No notes yet.
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </Modal>
              {/* --- End Notes Archive Modal --- */}

              <PrivateNookNotesModal
                visible={showPrivateNotesModal}
                onClose={() => setShowPrivateNotesModal(false)}
                spotId={spotId}
                themeColors={themeColors}
              />
            </>
          )}
        </ScrollView>
      </View>
      {/* Floating Action Button for Add Alert */}
      {!isPrivateNook && (
        <View
          style={{
            position: "absolute",
            bottom: 25,
            right: 16,
            zIndex: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: themeColors.orange, // keep color as orange
              borderRadius: 50,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <TouchableOpacity
              onPress={() => setShowAddAlertModal(true)}
              accessibilityLabel="Add Alert"
              accessible={true}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Warning size={19} color={themeColors.white} weight="fill" />
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontSize: 14,
                  marginLeft: 8,
                }}
              >
                Add Alert
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

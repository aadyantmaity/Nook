import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { MagnifyingGlass, MapPin, X, Share } from "phosphor-react-native";

export default function ShareNookModal({
  visible,
  onClose,
  themeColors,
  groupId,
  groupName,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [nooks, setNooks] = useState([]);
  const [filteredNooks, setFilteredNooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery("");
      setSending(false);
    }
  }, [visible]);

  // Fetch all nooks when modal opens
  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          setNooks([]);
          setFilteredNooks([]);
          return;
        }

        const spotsSnap = await getDocs(collection(db, "studySpots"));
        const spots = spotsSnap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((spot) => {
            // Filter out private nooks not owned by user or not shared
            if (
              spot.privateNook &&
              spot.addedBy !== user.uid &&
              !(
                Array.isArray(spot.sharedWith) &&
                spot.sharedWith.includes(user.uid)
              )
            ) {
              return false;
            }
            return true;
          });

        if (isMounted) {
          setNooks(spots);
          setFilteredNooks(spots);
        }
      } catch (error) {
        console.error("Error fetching nooks:", error);
        if (isMounted) {
          setNooks([]);
          setFilteredNooks([]);
        }
      }
      setLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Filter nooks based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNooks(nooks);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = nooks.filter((nook) => {
      const name = (nook.buildingName || nook.name || "").toLowerCase();
      const address = (nook.address || "").toLowerCase();
      const roomNumber = (nook.roomNumber || "").toLowerCase();
      return (
        name.includes(query) ||
        address.includes(query) ||
        roomNumber.includes(query)
      );
    });
    setFilteredNooks(filtered);
  }, [searchQuery, nooks]);

  const handleShare = async (nook) => {
    if (!nook?.id || !groupId) return;

    // Close modal first
    onClose && onClose();

    setSending(true);
    try {
      // Fetch current user's name from Firestore
      let senderName = "User";
      let uid = auth.currentUser?.uid;
      let senderProfilePic = null;
      if (uid) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const d = userDoc.data();
          const first = d.firstName || "";
          const last = d.lastName || "";
          senderName =
            first && last
              ? `${first} ${last.charAt(0)}`
              : first
              ? first
              : "User";
          senderProfilePic = d.profilePic || null;
        } else {
          senderName =
            auth.currentUser?.displayName || auth.currentUser?.email || "User";
        }
      }

      // Add a message to the group's messages subcollection
      await addDoc(collection(db, "studyGroups", groupId, "messages"), {
        type: "nook_share",
        spotId: nook.id,
        spotName: nook.buildingName || nook.name || "Nook",
        spotPhoto: nook.photoUrl || null,
        uid,
        senderName,
        senderProfilePic,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error sharing nook:", e);
      Alert.alert("Error", "Failed to share nook.");
    }
    setSending(false);
  };

  const renderNookItem = ({ item }) => {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 16,
          paddingHorizontal: 20,
          marginHorizontal: 16,
          marginVertical: 4,
          backgroundColor: themeColors.white,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: themeColors.darkGray,
          shadowColor: themeColors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
          opacity: sending ? 0.6 : 1,
        }}
      >
        {item.photoUrl ? (
          <Image
            source={{ uri: item.photoUrl }}
            style={{
              width: 60,
              height: 60,
              borderRadius: 12,
              marginRight: 16,
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: themeColors.purple,
              backgroundColor: themeColors.lightGray,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
            }}
          >
            <MapPin size={28} color={themeColors.purple} />
          </View>
        )}
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text
            style={{
              color: themeColors.black,
              fontSize: 17,
              fontFamily: "CarosSoft",
              marginBottom: 4,
            }}
          >
            {item.buildingName || item.name || "Nook"}
          </Text>
          {item.roomNumber && (
            <Text
              style={{
                color: themeColors.purple,
                fontSize: 14,
                fontWeight: "600",
                fontFamily: "CarosSoft",
                marginBottom: 2,
              }}
            >
              Floor {item.roomNumber}
            </Text>
          )}
          {item.address && (
            <Text
              style={{
                color: themeColors.darkGray,
                fontSize: 13,
                fontFamily: "CarosSoft",
              }}
              numberOfLines={1}
            >
              {item.address}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => handleShare(item)}
          disabled={sending}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Share size={25} color={themeColors.purple} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
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
            borderRadius: 20,
            width: "92%",
            maxHeight: "85%",
            alignItems: "center",
            minHeight: 450,
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              paddingHorizontal: 24,
              paddingTop: 20,
              backgroundColor: themeColors.white,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: themeColors.purple,
                  fontFamily: "CarosSoft",
                }}
              >
                Share a Nook
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                padding: 8,
                borderRadius: 20,
                backgroundColor: themeColors.lightGray,
              }}
              accessibilityLabel="Close share nook modal"
            >
              <X size={20} color={themeColors.purple} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: themeColors.lightGray,
              borderRadius: 16,
              marginHorizontal: 24,
              marginTop: 20,
              marginBottom: 8,
              paddingHorizontal: 16,
              paddingVertical: 4,
              width: "90%",
              borderWidth: 1,
              borderColor: themeColors.darkGray,
            }}
          >
            <MagnifyingGlass size={20} color={themeColors.darkGray} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder=""
              placeholderTextColor={themeColors.darkGray}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 12,
                fontSize: 16,
                color: themeColors.black,
                fontFamily: "CarosSoft",
              }}
            />
          </View>

          {/* Results count */}
          {searchQuery.trim() && (
            <View
              style={{
                backgroundColor: themeColors.purple,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginTop: 4,
                alignSelf: "flex-start",
                marginLeft: 16,
              }}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontSize: 14,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                {filteredNooks.length} result
                {filteredNooks.length !== 1 ? "s" : ""} found
              </Text>
            </View>
          )}

          {/* Nooks List */}
          <View style={{ flex: 1, width: "100%", minHeight: 200 }}>
            {loading ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 24,
                }}
              >
                <ActivityIndicator size="large" color={themeColors.purple} />
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontSize: 16,
                    fontFamily: "CarosSoft",
                    marginTop: 16,
                  }}
                >
                  Loading study spots...
                </Text>
              </View>
            ) : filteredNooks.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 24,
                }}
              >
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: themeColors.lightGray,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <MapPin size={32} color={themeColors.darkGray} />
                </View>
                <Text
                  style={{
                    color: themeColors.black,
                    fontSize: 18,
                    fontWeight: "bold",
                    textAlign: "center",
                    fontFamily: "CarosSoft",
                    marginBottom: 8,
                  }}
                >
                  {searchQuery.trim()
                    ? "No matches found"
                    : "No study spots available"}
                </Text>
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontSize: 14,
                    textAlign: "center",
                    fontFamily: "CarosSoft",
                    lineHeight: 20,
                  }}
                >
                  {searchQuery.trim()
                    ? `Try searching for a different building name, floor number, or address.`
                    : "Study spots will appear here once they're added to the app."}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredNooks}
                renderItem={renderNookItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingVertical: 16,
                  paddingBottom: 20,
                }}
                style={{ flex: 1 }}
                removeClippedSubviews={false}
                key={searchQuery} // Force re-render when search changes
                extraData={filteredNooks.length} // Force re-render when data changes
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

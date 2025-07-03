import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  Image,
  ScrollView,
} from "react-native";
import {
  ArrowLeft,
  PaperPlaneRight,
  DotsThreeVertical,
  MapPin,
  UsersThree,
  ShareNetwork, // <-- This is the icon used for "Manage Sharing" in SpotDetailScreen
  SignOut,
  Trash,
  Users,
  Star,
} from "phosphor-react-native";
import { ThemeContext } from "../App";
import { colors } from "../constants/colors";
import { db, auth } from "../firebaseConfig";
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import PrivateNookShareModal from "../components/SpotDetail/PrivateNookShareModal"; // reuse for group sharing
import { Keyboard } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// --- Add state for Starred Nooks Modal and data ---
export default function GroupDetailView({ navigation, route }) {
  const { groupId } = route.params;
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showStarredModal, setShowStarredModal] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [userCache, setUserCache] = useState({});
  const [membersList, setMembersList] = useState([]);
  const [starredNooks, setStarredNooks] = useState([]);
  const [starredNooksData, setStarredNooksData] = useState([]);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
  const flatListRef = useRef();
  const starredListRef = useRef(null);
  const unsubGroupRef = useRef(null);
  const unsubMessagesRef = useRef(null);
  const [starredListWidth, setStarredListWidth] = useState(0);
  const [starredContentWidth, setStarredContentWidth] = useState(0);

  // Fetch group info
  useEffect(() => {
    if (!groupId) return;
    const unsub = onSnapshot(
      doc(db, "studyGroups", groupId),
      (snap) => {
        if (!snap.exists()) {
          setGroup(null);
          // Optionally, navigate back if group is deleted
          navigation.goBack?.();
          return;
        }
        setGroup({ id: snap.id, ...snap.data() });
      },
      (error) => {
        // Permission denied or other error
        setGroup(null);
        navigation.navigate("Home", {
          screen: "Community",
          params: { selectedTab: "groups" },
        });
      }
    );
    unsubGroupRef.current = unsub;
    return () => {
      if (unsubGroupRef.current) {
        unsubGroupRef.current();
        unsubGroupRef.current = null;
      }
    };
  }, [groupId]);

  // Fetch messages (subcollection "messages" under group)
  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    let unsub;
    let isActive = true;
    const q = query(
      collection(db, "studyGroups", groupId, "messages"),
      orderBy("createdAt", "asc")
    );
    try {
      unsub = onSnapshot(
        q,
        (snap) => {
          if (!isActive) return;
          setMessages(
            snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }))
          );
          setLoading(false);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        },
        (error) => {
          // Permission denied or group deleted
          setMessages([]);
          setLoading(false);
        }
      );
      unsubMessagesRef.current = unsub;
    } catch {
      setMessages([]);
      setLoading(false);
    }
    return () => {
      isActive = false;
      if (unsubMessagesRef.current) {
        unsubMessagesRef.current();
        unsubMessagesRef.current = null;
      }
    };
  }, [groupId]);

  // Send message
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, "studyGroups", groupId, "messages"), {
        text: input.trim(),
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
      setInput("");
    } catch {}
    setSending(false);
  };

  // Helper to fetch and cache user info
  const fetchUserName = async (uid) => {
    if (!uid) return "User";
    if (uid === auth.currentUser?.uid) return "You";
    if (userCache[uid]) return userCache[uid];
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const d = userDoc.data();
        const first = d.firstName || "";
        const last = d.lastName || "";
        const name =
          first && last ? `${first} ${last.charAt(0)}` : first ? first : "User";
        setUserCache((prev) => ({ ...prev, [uid]: name }));
        return name;
      }
    } catch {}
    return "User";
  };

  // Get user display name (with caching)
  const getUserName = (uid) => {
    if (!uid) return "User";
    if (uid === auth.currentUser?.uid) return "You";
    if (userCache[uid]) return userCache[uid];
    // Trigger fetch in background (non-blocking)
    fetchUserName(uid);
    return "User";
  };

  // Fetch member info for Members modal
  const fetchMembersList = async () => {
    if (!group?.memberUids) return;
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
      }));
      // Only include group members
      const members = group.memberUids.map((uid) => {
        const u = users.find((user) => user.uid === uid);
        if (!u) return { uid, firstName: "Unknown", lastName: "", email: "" };
        return u;
      });
      setMembersList(members);
    } catch {
      setMembersList([]);
    }
  };

  // --- Modal for members list ---
  const renderMembersModal = () => (
    <Modal
      visible={showMembersModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMembersModal(false)}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.2)",
          justifyContent: "center",
          alignItems: "center",
        }}
        activeOpacity={1}
        onPressOut={() => setShowMembersModal(false)}
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
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.purple,
              fontFamily: "CarosSoft",
              marginBottom: 12,
            }}
          >
            Group Members
          </Text>
          <ScrollView style={{ width: "100%" }}>
            {membersList.map((u) => (
              <View
                key={u.uid}
                style={{
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: themeColors.gray + "33",
                }}
              >
                <Text
                  style={{
                    color: themeColors.black,
                    fontFamily: "CarosSoft",
                    fontWeight: "bold",
                  }}
                >
                  {u.firstName} {u.lastName}
                </Text>
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontFamily: "CarosSoft",
                    fontSize: 13,
                  }}
                >
                  {u.email}
                </Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            onPress={() => setShowMembersModal(false)}
            style={{
              marginTop: 16,
              backgroundColor: themeColors.purple,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 32,
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
      </TouchableOpacity>
    </Modal>
  );

  // Fetch group's starred nooks from array field
  useEffect(() => {
    if (!groupId) return;
    const unsub = onSnapshot(doc(db, "studyGroups", groupId), (snap) => {
      if (snap.exists()) {
        setGroup({ id: snap.id, ...snap.data() }); // <-- ensure group state is always set
        setStarredNooks(
          Array.isArray(snap.data().starredNooks)
            ? snap.data().starredNooks
            : []
        );
      } else {
        setGroup(null);
        setStarredNooks([]);
      }
    });
    return () => unsub();
  }, [groupId]);

  // --- Fetch starred nooks info when modal opens ---
  useEffect(() => {
    const fetchStarredNooksData = async () => {
      if (!showStarredModal || !starredNooks.length) {
        setStarredNooksData([]);
        return;
      }
      try {
        // Remove duplicates and falsy values
        const uniqueIds = Array.from(new Set(starredNooks.filter(Boolean)));
        const nooks = [];
        for (const id of uniqueIds) {
          // --- Use studySpots collection ---
          const nookDoc = await getDoc(doc(db, "studySpots", id));
          if (nookDoc.exists()) {
            // Find the first message in this group that shared this nook
            const shareMsg = messages.find(
              (msg) => msg.type === "nook_share" && msg.spotId === id
            );
            nooks.push({
              id,
              ...nookDoc.data(),
              sharedBy: shareMsg?.senderName,
              sharedByUid: shareMsg?.uid,
              spotPhoto: shareMsg?.spotPhoto,
              spotName: shareMsg?.spotName,
            });
          }
        }
        setStarredNooksData(nooks);
      } catch {
        setStarredNooksData([]);
      }
    };
    fetchStarredNooksData();
  }, [showStarredModal, starredNooks, messages]);

  // Toggle star for a nook in the group (array field)
  const toggleStarNook = async (spotId) => {
    if (!groupId || !spotId) return;
    const groupRef = doc(db, "studyGroups", groupId);
    try {
      if (starredNooks.includes(spotId)) {
        await updateDoc(groupRef, {
          starredNooks: starredNooks.filter((id) => id !== spotId),
        });
      } else {
        await updateDoc(groupRef, {
          starredNooks: [...starredNooks, spotId],
        });
      }
    } catch (e) {
      Alert.alert("Error", "Failed to update starred nooks.");
    }
  };

  // Header with back arrow, group name/members, and Dots menu for owner
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.purple,
              fontFamily: "CarosSoft",
              textAlign: "center",
              maxWidth: 200,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {group?.name || "Group"}
          </Text>
          <Text
            style={{
              color: themeColors.darkGray,
              fontSize: 13,
              fontFamily: "CarosSoft",
              textAlign: "center",
            }}
            numberOfLines={1}
          >
            {(group?.memberUids?.length || 0) + " members"}
          </Text>
        </View>
      ),
      headerTitleAlign: "center",
      headerStyle: {
        backgroundColor: themeColors.white,
        shadowColor: "transparent",
        elevation: 0,
      },
      headerTitleStyle: {
        color: themeColors.purple,
        fontWeight: "bold",
        fontFamily: "CarosSoft",
        fontSize: 18,
      },
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={24} color={themeColors.purple} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowMenu(true)}
          style={{ paddingHorizontal: 16, paddingVertical: 8 }}
          accessibilityLabel="More"
        >
          <DotsThreeVertical
            size={26}
            color={themeColors.purple}
            weight="bold"
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, group, themeColors]);

  // --- Delete group handler ---
  const handleDeleteGroup = async () => {
    Alert.alert(
      "Delete Group",
      "Are you sure you want to delete this group? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Unsubscribe from all listeners before deleting
            if (unsubGroupRef.current) {
              unsubGroupRef.current();
              unsubGroupRef.current = null;
            }
            if (unsubMessagesRef.current) {
              unsubMessagesRef.current();
              unsubMessagesRef.current = null;
            }
            try {
              // Delete messages
              const messagesRef = collection(
                db,
                "studyGroups",
                groupId,
                "messages"
              );
              const messageDocs = await getDocs(messagesRef);
              const deleteMessages = messageDocs.docs.map((docSnap) =>
                deleteDoc(docSnap.ref)
              );
              await Promise.all(deleteMessages);
              await deleteDoc(doc(db, "studyGroups", groupId));
              // Go back to previous screen, or fallback to Community tab
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("Home", {
                  screen: "Community",
                  params: { selectedTab: "groups" },
                });
              }
            } catch (e) {
              Alert.alert("Error", "Failed to delete group.");
            }
          },
        },
      ]
    );
  };

  // --- Modal for menu actions ---
  const renderMenuModal = () => (
    <Modal
      visible={showMenu}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMenu(false)}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.2)",
          justifyContent: "flex-start",
          alignItems: "flex-end",
        }}
        activeOpacity={1}
        onPressOut={() => setShowMenu(false)}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 12,
            marginTop: 54,
            marginRight: 12,
            minWidth: 180,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: themeColors.gray,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          {/* --- Add Starred Nooks Option --- */}
          <TouchableOpacity
            onPress={() => {
              setShowMenu(false);
              setShowStarredModal(true);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 18,
            }}
          >
            <Star
              size={20}
              color={themeColors.purple}
              weight="bold"
              style={{ marginRight: 10 }}
            />
            <Text
              style={{
                color: themeColors.purple,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
                fontSize: 15,
              }}
            >
              Starred Nooks
            </Text>
          </TouchableOpacity>
          {group?.createdBy === auth.currentUser?.uid ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  setShowMenu(false);
                  setShowShareModal(true);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 18,
                }}
              >
                <UsersThree
                  size={20}
                  color={themeColors.purple}
                  weight="bold"
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={{
                    color: themeColors.purple,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                    fontSize: 15,
                  }}
                >
                  Manage Sharing
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={async () => {
                setShowMenu(false);
                await fetchMembersList();
                setShowMembersModal(true);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                paddingHorizontal: 18,
              }}
            >
              <UsersThree
                size={20}
                color={themeColors.purple}
                weight="bold"
                style={{ marginRight: 10 }}
              />
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                  fontSize: 15,
                }}
              >
                Members
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              setShowMenu(false);
              handleLeaveGroup();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 18,
            }}
          >
            <SignOut
              size={20}
              color={themeColors.red}
              weight="bold"
              style={{ marginRight: 10 }}
            />
            <Text
              style={{
                color: themeColors.red,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
                fontSize: 15,
              }}
            >
              Leave
            </Text>
          </TouchableOpacity>
          {group?.createdBy === auth.currentUser?.uid && (
            <TouchableOpacity
              onPress={() => {
                setShowMenu(false);
                handleDeleteGroup();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                paddingHorizontal: 18,
              }}
            >
              <Trash
                size={20}
                color={themeColors.red}
                weight="bold"
                style={{ marginRight: 10 }}
              />
              <Text
                style={{
                  color: themeColors.red,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                  fontSize: 15,
                }}
              >
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // --- Render PrivateNookShareModal for group sharing ---
  // Use groupId, group.createdBy as ownerUid, and memberUids as sharedWith
  // The modal will update the memberUids field in the group doc
  const renderShareModal = () => (
    <PrivateNookShareModal
      visible={showShareModal}
      onClose={() => setShowShareModal(false)}
      spotId={groupId}
      themeColors={themeColors}
      ownerUid={group?.createdBy}
      isGroup // pass a prop to distinguish group mode
      collectionName="studyGroups"
      fieldName="memberUids"
    />
  );

  // --- Delete a message ---
  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteDoc(doc(db, "studyGroups", groupId, "messages", messageId));
    } catch (e) {
      Alert.alert("Error", "Failed to delete message.");
    }
  };
  const handleLeaveGroup = async () => {
    if (!group || !auth.currentUser?.uid) return;

    Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            // Create new memberUids array without current user
            const updatedMembers = group.memberUids.filter(
              (uid) => uid !== auth.currentUser?.uid
            );

            // If user is the last member, delete the group
            if (updatedMembers.length === 0) {
              await handleDeleteGroup();
              return;
            }

            // Update the group document
            await updateDoc(doc(db, "studyGroups", groupId), {
              memberUids: updatedMembers,
            });

            // Navigate back to groups list
            navigation.navigate("Home", {
              screen: "Community",
              params: { selectedTab: "groups" },
            });
          } catch (error) {
            Alert.alert("Error", "Failed to leave group.");
          }
        },
      },
    ]);
  };

  // --- Starred Nooks Modal ---
  const renderStarredNooksModal = () => (
    <Modal
      visible={showStarredModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowStarredModal(false)}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.2)",
          justifyContent: "center",
          alignItems: "center",
        }}
        activeOpacity={1}
        onPressOut={() => setShowStarredModal(false)}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 16,
            padding: 24,
            width: "90%",
            maxHeight: "60%",
            alignItems: "center",
          }}
          onStartShouldSetResponder={() => true}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.purple,
              fontFamily: "CarosSoft",
              marginBottom: 12,
            }}
          >
            Starred Nooks
          </Text>
          {!starredNooksData || starredNooksData.length === 0 ? (
            <Text
              style={{
                color: themeColors.darkGray,
                fontFamily: "CarosSoft",
                fontSize: 15,
                marginVertical: 24,
              }}
            >
              No starred nooks yet.
            </Text>
          ) : (
            <View
              style={{ width: "100%", position: "relative", minHeight: 80 }}
            >
              {/* Left gradient */}
              {showLeftGradient && (
                <LinearGradient
                  colors={[themeColors.white, themeColors.white + "00"]}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 10,
                    zIndex: 2,
                  }}
                  pointerEvents="none"
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                />
              )}
              {/* Right gradient */}
              {showRightGradient && (
                <LinearGradient
                  colors={[themeColors.white + "00", themeColors.white]}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 28,
                    zIndex: 2,
                  }}
                  pointerEvents="none"
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                />
              )}
              <FlatList
                ref={starredListRef}
                data={starredNooksData}
                horizontal
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                onLayout={(e) => {
                  setStarredListWidth(e.nativeEvent.layout.width);
                }}
                onContentSizeChange={(w, h) => {
                  setStarredContentWidth(w);
                  // Show right gradient if content is wider than list
                  setShowRightGradient(w > starredListWidth + 2);
                  setShowLeftGradient(false);
                }}
                onScroll={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  const maxX = starredContentWidth - starredListWidth;
                  setShowLeftGradient(x > 2);
                  setShowRightGradient(maxX - x > 2);
                }}
                scrollEventThrottle={16}
                contentContainerStyle={{
                  paddingVertical: 8,
                  paddingHorizontal: 0,
                }}
                renderItem={({ item }) => (
                  <View
                    style={{
                      flexDirection: "row",
                      alignSelf: "center",
                      alignItems: "center",
                      marginBottom: 10,
                      maxWidth: "100%",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setShowStarredModal(false);
                        navigation.navigate("SpotDetail", { spotId: item.id });
                      }}
                      style={{
                        maxWidth: 280,
                        backgroundColor: themeColors.lightGray,
                        borderRadius: 14,
                        padding: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: "#000",
                        borderColor: themeColors.darkGray,
                        borderWidth: 1,
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                    >
                      {item.spotPhoto || item.photoURL ? (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            overflow: "hidden",
                            marginRight: 12,
                          }}
                        >
                          <Image
                            source={{ uri: item.spotPhoto || item.photoURL }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />
                        </View>
                      ) : (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            backgroundColor: themeColors.purple,
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12,
                          }}
                        >
                          <MapPin
                            size={32}
                            color={themeColors.white}
                            weight="bold"
                          />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: themeColors.purple,
                            fontWeight: "bold",
                            fontSize: 16,
                            fontFamily: "CarosSoft",
                          }}
                          numberOfLines={1}
                        >
                          {item.spotName ||
                            item.buildingName ||
                            item.name ||
                            "Nook"}
                        </Text>
                      </View>
                      {/* --- Star button inside the card, at the end --- */}
                      <TouchableOpacity
                        onPress={() => toggleStarNook(item.id)}
                        style={{
                          marginLeft: 10,
                          padding: 4,
                          backgroundColor: themeColors.white,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 20,
                        }}
                        activeOpacity={0.7}
                      >
                        <Star
                          size={22}
                          color={themeColors.purple}
                          weight={
                            starredNooks.includes(item.id) ? "fill" : "regular"
                          }
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
          )}
          <TouchableOpacity
            onPress={() => setShowStarredModal(false)}
            style={{
              marginTop: 16,
              backgroundColor: themeColors.purple,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 32,
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
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
      {renderMenuModal()}
      {renderShareModal()}
      {renderMembersModal()}
      {renderStarredNooksModal()}
      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        {loading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator color={themeColors.purple} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: 18,
              paddingBottom: 24, // match input bar's bottom padding
              flexGrow: 1,
              backgroundColor: themeColors.white,
            }}
            renderItem={({ item }) => {
              const isMe = item.uid === auth.currentUser?.uid;
              // --- Nook Share Card ---
              if (item.type === "nook_share") {
                return (
                  <View
                    style={{
                      flexDirection: "row",
                      alignSelf: "center",
                      alignItems: "center",
                      marginBottom: 10,
                      maxWidth: "100%",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate("SpotDetail", {
                          spotId: item.spotId,
                        })
                      }
                      style={{
                        maxWidth: 280,
                        backgroundColor: themeColors.lightGray,
                        borderRadius: 14,
                        padding: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: "#000",
                        borderColor: themeColors.darkGray,
                        borderWidth: 1,
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                    >
                      {item.spotPhoto ? (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            overflow: "hidden",
                            marginRight: 12,
                          }}
                        >
                          <Image
                            source={{ uri: item.spotPhoto }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />
                        </View>
                      ) : (
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            backgroundColor: themeColors.purple,
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12,
                          }}
                        >
                          <MapPin
                            size={32}
                            color={themeColors.white}
                            weight="bold"
                          />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: themeColors.purple,
                            fontWeight: "bold",
                            fontSize: 16,
                            fontFamily: "CarosSoft",
                          }}
                          numberOfLines={1}
                        >
                          {item.spotName || "Nook"}
                        </Text>
                        <Text
                          style={{
                            color: themeColors.darkGray,
                            fontSize: 13,
                            fontFamily: "CarosSoft",
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          Shared by {item.senderName || "Someone"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {/* --- Star button outside the card --- */}
                    <TouchableOpacity
                      onPress={() => toggleStarNook(item.spotId)}
                      style={{
                        marginLeft: 10,
                        padding: 4,
                        backgroundColor: themeColors.white,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      activeOpacity={0.7}
                    >
                      <Star
                        size={22}
                        color={themeColors.purple}
                        weight={
                          starredNooks.includes(item.spotId)
                            ? "fill"
                            : "regular"
                        }
                      />
                    </TouchableOpacity>
                  </View>
                );
              }
              // Regular message bubble
              return (
                <View
                  style={{
                    alignSelf: isMe ? "flex-end" : "flex-start",
                    marginBottom: 10,
                    maxWidth: "80%",
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={!isMe}
                    onLongPress={() => {
                      if (!isMe) return;
                      Alert.alert(
                        "Delete Message",
                        "Do you want to delete this message?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => handleDeleteMessage(item.id),
                          },
                        ]
                      );
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: isMe
                          ? themeColors.purple
                          : themeColors.gray,
                        borderRadius: 14,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 2,
                        elevation: 1,
                        minWidth: 50,
                        alignItems: "center",
                        alignSelf: isMe ? "flex-end" : "flex-start",
                      }}
                    >
                      <Text
                        style={{
                          color: isMe ? themeColors.white : themeColors.black,
                          fontSize: 15,
                          fontFamily: "CarosSoft",
                        }}
                      >
                        {item.text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontSize: 11,
                      marginTop: 2,
                      fontFamily: "CarosSoft",
                      textAlign: isMe ? "right" : "left",
                    }}
                  >
                    {getUserName(item.uid)}
                    {" · "}
                    {item.createdAt && item.createdAt.seconds
                      ? new Date(
                          item.createdAt.seconds * 1000
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </Text>
                </View>
              );
            }}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}
        {/* Input Bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingBottom: 24,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: themeColors.gray,
            backgroundColor: themeColors.white,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor={themeColors.darkGray}
            style={{
              flex: 1,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              color: themeColors.black,
              fontFamily: "CarosSoft",
              marginRight: 8,
            }}
            editable={!sending}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={true}
            maxLength={200}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || !input.trim()}
            style={{
              borderRadius: 20,
              padding: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Send"
          >
            <PaperPlaneRight
              size={24}
              color={themeColors.purple}
              weight="bold"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

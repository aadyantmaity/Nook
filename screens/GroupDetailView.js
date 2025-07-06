import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import {
  View,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  Image,
  Keyboard, // <-- Add Keyboard import
} from "react-native";
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
import PrivateNookShareModal from "../components/SpotDetail/PrivateNookShareModal";
import GroupMembersModal from "../components/Groups/GroupMembersModal";
import GroupMenuModal from "../components/Groups/GroupMenuModal";
import GroupMessagesList from "../components/Groups/GroupMessagesList";
import GroupInputBar from "../components/Groups/GroupInputBar";
import GroupStarredNooksModal from "../components/Groups/GroupStarredNooksModal";
import useFavorites from "../hooks/useFavorites";

export default function GroupDetailView({ navigation, route }) {
  const { groupId } = route.params;
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState(""); // ensure this is defined
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [userCache, setUserCache] = useState({});
  const [userPicCache, setUserPicCache] = useState({}); // <-- Add for profile pics
  const [membersList, setMembersList] = useState([]);
  const [starredNooks, setStarredNooks] = useState([]);
  const [starredNooksData, setStarredNooksData] = useState([]);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
  const [showStarredModal, setShowStarredModal] = useState(false); // --- Add this line to fix the error ---
  const flatListRef = useRef();
  const starredListRef = useRef(null);
  const unsubGroupRef = useRef(null);
  const unsubMessagesRef = useRef(null);
  const [starredListWidth, setStarredListWidth] = useState(0);
  const [starredContentWidth, setStarredContentWidth] = useState(0);
  const prevMembersRef = useRef(null); // Track previous members for system messages
  const hasSentJoinMessageRef = useRef(false); // Track if join message was sent for this session
  const { favoriteGroups, toggleFavoriteGroup } = useFavorites(); // <-- Get favoriteGroups state and toggle function
  const [replyToMessage, setReplyToMessage] = useState(null); // ensure this is defined
  const [mentionPickerVisible, setMentionPickerVisible] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState([]);
  // --- Track mentioned users as selected from picker ---
  const [mentionedUsers, setMentionedUsers] = useState([]); // <-- add this
  const [keyboardHeight, setKeyboardHeight] = useState(0); // <-- Add this state

  // Fetch group info (NO system message logic here anymore)
  useEffect(() => {
    if (!groupId) return;
    const unsub = onSnapshot(
      doc(db, "studyGroups", groupId),
      async (snap) => {
        if (!snap.exists()) {
          setGroup(null);
          navigation.goBack?.();
          return;
        }
        const groupData = { id: snap.id, ...snap.data() };
        setGroup(groupData);
        prevMembersRef.current = groupData.memberUids || [];
      },
      (error) => {
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
            // For inverted FlatList, offset 0 is the bottom (most recent)
            flatListRef.current?.scrollToOffset?.({
              offset: 0,
              animated: false,
            });
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

  // Fetch group members for mention suggestions
  useEffect(() => {
    if (!groupId) return;
    // Fetch group members from Firestore and set mentionUsers
    const fetchMentionUsers = async () => {
      try {
        const groupDoc = await getDoc(doc(db, "studyGroups", groupId));
        if (!groupDoc.exists()) {
          setMentionUsers([]);
          return;
        }
        const memberUids = groupDoc.data().memberUids || [];
        if (!memberUids.length) {
          setMentionUsers([]);
          return;
        }
        // Fetch user docs for all memberUids
        const usersSnap = await getDocs(collection(db, "users"));
        const users = usersSnap.docs
          .filter((d) => memberUids.includes(d.id))
          .map((d) => {
            const data = d.data();
            const first = data.firstName || "";
            const last = data.lastName || "";
            return {
              uid: d.id,
              name:
                first && last
                  ? `${first} ${last.charAt(0)}`
                  : first
                  ? first
                  : "User",
              email: data.email || "",
              profilePic: data.profilePic || null, // <-- Add profilePic here
            };
          });
        setMentionUsers(users);
      } catch {
        setMentionUsers([]);
      }
    };
    fetchMentionUsers();
  }, [groupId]);

  // Detect "@" and show mention picker
  const handleInputChange = (text) => {
    setInput(text);
    const match = text.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionPickerVisible(true);
    } else {
      setMentionPickerVisible(false);
    }
  };

  // Insert mention at cursor and track mentioned user
  const handleMentionSelect = (user) => {
    const atIdx = input.lastIndexOf("@");
    if (atIdx !== -1) {
      const before = input.slice(0, atIdx);
      const after = input.slice(atIdx).replace(/@\w*$/, "");
      setInput(before + "@" + user.name + " " + after);
    }
    setMentionPickerVisible(false);
    // Add to mentionedUsers if not already present
    setMentionedUsers((prev) =>
      prev.includes(user.uid) ? prev : [...prev, user.uid]
    );
  };

  // Send message with mentions from mentionedUsers state
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, "studyGroups", groupId, "messages"), {
        text: input.trim(),
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        replyTo: replyToMessage
          ? {
              id: replyToMessage.id,
              text: replyToMessage.text,
              senderName: getUserName(replyToMessage.uid),
            }
          : null,
        mentions: mentionedUsers, // <-- use tracked mentioned users
      });
      setInput("");
      setReplyToMessage(null);
      setMentionedUsers([]); // <-- clear after send
    } catch {}
    setSending(false);
  };

  // Helper to fetch and cache user info (name and profilePic)
  const fetchUserNameAndPic = async (uid) => {
    if (!uid) return { name: "User", profilePic: null };
    if (uid === auth.currentUser?.uid) return { name: "You", profilePic: null };
    if (userCache[uid] && userPicCache[uid] !== undefined)
      return { name: userCache[uid], profilePic: userPicCache[uid] };
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const d = userDoc.data();
        const first = d.firstName || "";
        const last = d.lastName || "";
        const name =
          first && last ? `${first} ${last.charAt(0)}` : first ? first : "User";
        const profilePic = d.profilePic || null;
        setUserCache((prev) => ({ ...prev, [uid]: name }));
        setUserPicCache((prev) => ({ ...prev, [uid]: profilePic }));
        return { name, profilePic };
      }
    } catch {}
    return { name: "User", profilePic: null };
  };

  // Memoize getUserName and getUserProfilePic for stable references
  const getUserName = useCallback(
    (uid) => {
      if (!uid) return "User";
      if (uid === auth.currentUser?.uid) return "You";
      if (userCache[uid]) return userCache[uid];
      fetchUserNameAndPic(uid);
      return "User";
    },
    [userCache, auth.currentUser?.uid]
  );

  const getUserProfilePic = useCallback(
    (uid) => {
      if (!uid) return null;
      if (uid === auth.currentUser?.uid) return null;
      if (userPicCache[uid] !== undefined) return userPicCache[uid];
      fetchUserNameAndPic(uid);
      return null;
    },
    [userPicCache, auth.currentUser?.uid]
  );

  // Memoize handleDeleteMessage for stable reference
  const handleDeleteMessage = useCallback(
    async (messageId) => {
      try {
        await deleteDoc(doc(db, "studyGroups", groupId, "messages", messageId));
      } catch (e) {
        Alert.alert("Error", "Failed to delete message.");
      }
    },
    [groupId]
  );

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
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("GroupDetails", { groupId: group?.id })
          }
          activeOpacity={0.7}
        >
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
          </View>
        </TouchableOpacity>
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
        <View style={{ flexDirection: "row", alignItems: "center" }}>
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
        </View>
      ),
    });
  }, [navigation, group, themeColors, favoriteGroups]);

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

  const handleLeaveGroup = async () => {
    if (!group || !auth.currentUser?.uid) return;

    Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            // Add system message for leaving BEFORE removing yourself
            let userDoc;
            try {
              userDoc = await getDoc(doc(db, "users", auth.currentUser?.uid));
            } catch {}
            const userName =
              userDoc && userDoc.exists()
                ? (userDoc.data().firstName || "User") +
                  (userDoc.data().lastName
                    ? " " + userDoc.data().lastName.charAt(0)
                    : "")
                : "User";
            await addDoc(collection(db, "studyGroups", groupId, "messages"), {
              type: "system",
              text: `${userName} left the group.`,
              uid: auth.currentUser?.uid,
              createdAt: serverTimestamp(),
            });

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
            navigation.goBack();
          } catch (error) {
            Alert.alert("Error", "Failed to leave group.");
          }
        },
      },
    ]);
  };

  // --- Helper to render reply preview above a message bubble ---
  function renderReplyPreview(message) {
    if (!message.replyTo) return null;
    return (
      <View
        style={{
          backgroundColor: themeColors.lightGray,
          borderLeftWidth: 3,
          borderLeftColor: themeColors.purple,
          paddingVertical: 4,
          paddingHorizontal: 10,
          marginBottom: 4,
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            color: themeColors.purple,
            fontWeight: "bold",
            fontSize: 12,
            fontFamily: "CarosSoft",
          }}
          numberOfLines={1}
        >
          Replying to {message.replyTo.senderName || "User"}
        </Text>
        <Text
          style={{
            color: themeColors.darkGray,
            fontSize: 11,
            fontFamily: "CarosSoft",
          }}
          numberOfLines={1}
        >
          {message.replyTo.text}
        </Text>
      </View>
    );
  }

  // Listen for keyboard events to adjust mention picker position
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height || 0);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
      {/* Menu Modal */}
      <GroupMenuModal
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        group={group}
        themeColors={themeColors}
        auth={auth}
        setShowShareModal={setShowShareModal}
        setShowStarredModal={setShowStarredModal}
        setShowMembersModal={setShowMembersModal}
        fetchMembersList={fetchMembersList}
        handleLeaveGroup={handleLeaveGroup}
        handleDeleteGroup={handleDeleteGroup}
        navigation={navigation}
      />
      {/* Share Modal */}
      <PrivateNookShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        spotId={groupId}
        themeColors={themeColors}
        ownerUid={group?.createdBy}
        isGroup
        collectionName="studyGroups"
        fieldName="memberUids"
      />
      {/* Members Modal */}
      <GroupMembersModal
        visible={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        membersList={membersList}
        themeColors={themeColors}
      />
      {/* Starred Nooks Modal */}
      <GroupStarredNooksModal
        visible={showStarredModal}
        onClose={() => setShowStarredModal(false)}
        starredNooksData={starredNooksData}
        navigation={navigation}
        themeColors={themeColors}
      />
      {/* Messages and Input */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator color={themeColors.purple} />
          </View>
        ) : (
          <>
            <GroupMessagesList
              messages={messages}
              group={group}
              themeColors={themeColors}
              auth={auth}
              navigation={navigation}
              starredNooks={starredNooks}
              toggleStarNook={toggleStarNook}
              userCache={userCache}
              userPicCache={userPicCache}
              getUserName={getUserName}
              getUserProfilePic={getUserProfilePic}
              handleDeleteMessage={handleDeleteMessage}
              setReplyToMessage={setReplyToMessage}
              replyToMessage={replyToMessage}
              flatListRef={flatListRef}
            />
            <GroupInputBar
              input={input}
              setInput={handleInputChange}
              sending={sending}
              handleSend={handleSend}
              replyToMessage={replyToMessage}
              setReplyToMessage={setReplyToMessage}
              getUserName={getUserName}
              themeColors={themeColors}
            />
          </>
        )}
        {mentionPickerVisible &&
          mentionUsers.filter((u) =>
            u.name.toLowerCase().includes(mentionQuery.toLowerCase())
          ).length > 0 && (
            <View
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                // Dynamically position above keyboard
                bottom: keyboardHeight + 12,
                backgroundColor: themeColors.white,
                zIndex: 1000,
                maxHeight: 220,
                borderRadius: 14,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 8,
                borderWidth: 1,
                borderColor: themeColors.lightGray,
                paddingHorizontal: 0,
                overflow: "hidden",
              }}
            >
              <ScrollView
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingVertical: 4,
                  paddingHorizontal: 0,
                }}
              >
                {mentionUsers
                  .filter((u) =>
                    u.name.toLowerCase().includes(mentionQuery.toLowerCase())
                  )
                  .map((u, idx, arr) => (
                    <TouchableOpacity
                      key={u.uid}
                      onPress={() => handleMentionSelect(u)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                        paddingHorizontal: 18,
                        backgroundColor: themeColors.white,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: themeColors.purple,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                          overflow: "hidden",
                        }}
                      >
                        {u.profilePic ? (
                          <Image
                            source={{ uri: u.profilePic }}
                            style={{ width: 32, height: 32, borderRadius: 16 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text
                            style={{
                              color: themeColors.white,
                              fontWeight: "bold",
                              fontSize: 16,
                              fontFamily: "CarosSoft",
                            }}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={{
                          color: themeColors.purple,
                          fontFamily: "CarosSoft",
                          fontSize: 16,
                          fontWeight: "bold",
                        }}
                      >
                        {u.name}
                      </Text>
                      {/* Add bottom border with padding */}
                      {idx !== arr.length - 1 && (
                        <View
                          style={{
                            position: "absolute",
                            left: 32 + 18 + 12,
                            right: 18,
                            bottom: 0,
                            height: 0.5,
                            backgroundColor: themeColors.black,
                            opacity: 0.5,
                          }}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

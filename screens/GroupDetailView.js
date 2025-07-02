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
} from "react-native";
import {
  ArrowLeft,
  PaperPlaneRight,
  DotsThreeVertical,
  MapPin,
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
  deleteDoc,
} from "firebase/firestore";
import PrivateNookShareModal from "../components/SpotDetail/PrivateNookShareModal"; // reuse for group sharing
import { Keyboard } from "react-native";

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
  const [shareLoading, setShareLoading] = useState(false);
  const [userCache, setUserCache] = useState({});
  const flatListRef = useRef();
  const unsubGroupRef = useRef(null);
  const unsubMessagesRef = useRef(null);

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
      headerRight: () =>
        group?.createdBy === auth.currentUser?.uid ? (
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
        ) : null,
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
              const messagesRef = collection(
                db,
                "studyGroups",
                groupId,
                "messages"
              );
              const messageDocs = await getDocs(messagesRef);
              const deletePromises = messageDocs.docs.map((docSnap) =>
                deleteDoc(docSnap.ref)
              );
              await Promise.all(deletePromises);
              await deleteDoc(doc(db, "studyGroups", groupId));
              // Navigate to Community tab, Study Groups section
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: "Home",
                    params: {
                      screen: "Community",
                      params: { selectedTab: "groups" },
                    },
                  },
                ],
              });
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
          <TouchableOpacity
            onPress={() => {
              setShowMenu(false);
              setShowShareModal(true);
            }}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 18,
            }}
          >
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
          <TouchableOpacity
            onPress={() => {
              setShowMenu(false);
              handleDeleteGroup();
            }}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 18,
            }}
          >
            <Text
              style={{
                color: themeColors.red,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
                fontSize: 15,
              }}
            >
              Delete Group
            </Text>
          </TouchableOpacity>
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
      {renderMenuModal()}
      {renderShareModal()}
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
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("SpotDetail", {
                        spotId: item.spotId,
                      })
                    }
                    style={{
                      alignSelf: "center", // changed from "flex-start" to "center"
                      marginBottom: 10,
                      maxWidth: "80%",
                      backgroundColor: themeColors.lightGray,
                      borderRadius: 14,
                      padding: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      shadowColor: "#000",
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

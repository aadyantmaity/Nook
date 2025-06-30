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
} from "react-native";
import {
  ArrowLeft,
  PaperPlaneRight,
  DotsThreeVertical,
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
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import PrivateNookShareModal from "../components/SpotDetail/PrivateNookShareModal"; // reuse for group sharing

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
  const flatListRef = useRef();

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
    return () => unsub();
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
    } catch {
      setMessages([]);
      setLoading(false);
    }
    return () => {
      isActive = false;
      unsub && unsub();
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

  // Get user display name (could be improved with caching)
  const getUserName = (uid) => {
    // Optionally, cache user names for performance
    if (!group || !Array.isArray(group.memberUids)) return "User";
    // In a real app, fetch user info from users collection
    if (uid === auth.currentUser?.uid) return "You";
    return "Member";
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
          style={{ paddingHorizontal: 16, paddingVertical: 8 }}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={26} color={themeColors.purple} weight="bold" />
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
            try {
              await deleteDoc(doc(db, "studyGroups", groupId));
              // Navigate to Community tab, Groups subtab
              navigation.navigate("Home", {
                screen: "Community",
                params: { selectedTab: "groups" },
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
      {renderMenuModal()}
      {renderShareModal()}
      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: 18,
              paddingBottom: 12,
              flexGrow: 1,
              backgroundColor: themeColors.white,
            }}
            renderItem={({ item }) => {
              const isMe = item.uid === auth.currentUser?.uid;
              return (
                <View
                  style={{
                    alignSelf: isMe ? "flex-end" : "flex-start",
                    marginBottom: 10,
                    maxWidth: "80%",
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
            paddingVertical: 10,
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
              backgroundColor: themeColors.gray,
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
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || !input.trim()}
            style={{
              backgroundColor:
                sending || !input.trim()
                  ? themeColors.gray
                  : themeColors.purple,
              borderRadius: 20,
              padding: 10,
              alignItems: "center",
              justifyContent: "center",
              opacity: sending || !input.trim() ? 0.7 : 1,
            }}
            accessibilityLabel="Send"
          >
            <PaperPlaneRight
              size={24}
              color={
                sending || !input.trim()
                  ? themeColors.darkGray
                  : themeColors.white
              }
              weight="bold"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

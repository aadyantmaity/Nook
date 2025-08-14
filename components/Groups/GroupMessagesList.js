import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import ProfilePicture from "../Profile/ProfilePicture";
import { Trash } from "phosphor-react-native";
import { db, auth } from "../../firebaseConfig";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  onSnapshot,
} from "firebase/firestore";
import GroupTaskPinned from "./GroupTaskPinned";
import { FONTS } from "../../constants/fonts";

// --- Import extracted components ---
import {
  SystemMessage,
  NookShareMessage,
  MyMessageBubble,
  OtherMessageBubble,
  PollMessage,
} from "./messages/MessageBubbles";

// --- Main GroupMessagesList Memoized ---
const GroupMessagesList = memo(
  ({
    messages,
    group,
    themeColors,
    auth,
    navigation,
    starredNooks,
    toggleStarNook,
    userCache,
    userPicCache,
    getUserName,
    getUserProfilePic,
    handleDeleteMessage,
    setReplyToMessage,
    replyToMessage,
    flatListRef,
    groupId,
    members,
  }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [modalInfo, setModalInfo] = useState({
      name: "",
      time: "",
      date: "",
      canDelete: false,
      messageId: null,
    });

    // --- Group Task State ---
    const [latestTask, setLatestTask] = useState(null);
    const [taskLoading, setTaskLoading] = useState(true);
    const [taskCheckLoading, setTaskCheckLoading] = useState(false);

    // Listen for latest group task
    useEffect(() => {
      if (!groupId) return;
      setTaskLoading(true);
      const q = collection(db, "studyGroups", groupId, "tasks");
      const unsub = onSnapshot(q, (snap) => {
        const tasks = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
          );
        setLatestTask(tasks[0] || null);
        setTaskLoading(false);
      });
      return () => unsub();
    }, [groupId]);

    // Toggle check/uncheck for current user
    const handleCheckToggle = async () => {
      if (!latestTask || !auth.currentUser?.uid) return;
      setTaskCheckLoading(true);
      const taskRef = doc(db, "studyGroups", groupId, "tasks", latestTask.id);
      const checked =
        Array.isArray(latestTask.checkedOff) &&
        latestTask.checkedOff.includes(auth.currentUser.uid);
      try {
        await updateDoc(taskRef, {
          checkedOff: checked
            ? arrayRemove(auth.currentUser.uid)
            : arrayUnion(auth.currentUser.uid),
        });
      } catch {}
      setTaskCheckLoading(false);
    };

    // Memoized reply preview
    const renderReplyPreview = useCallback(
      (message) => {
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
                fontFamily: FONTS.PRIMARY,
              }}
              numberOfLines={1}
            >
              Replying to {message.replyTo.senderName || "User"}
            </Text>
            <Text
              style={{
                color: themeColors.darkGray,
                fontSize: 11,
                fontFamily: FONTS.PRIMARY,
              }}
              numberOfLines={1}
            >
              {message.replyTo.text}
            </Text>
          </View>
        );
      },
      [themeColors]
    );

    // --- Double tap handler for reply ---
    const handleDoubleTap = useCallback(
      (item) => {
        setReplyToMessage(item);
      },
      [setReplyToMessage]
    );

    // Memoized mention check
    const isUserMentioned = useCallback(
      (message) => {
        if (
          !message ||
          !Array.isArray(message.mentions) ||
          !auth.currentUser?.uid
        )
          return false;
        return message.mentions.includes(auth.currentUser.uid);
      },
      [auth.currentUser?.uid]
    );

    // Memoized sender info modal
    const openSenderInfoModal = useCallback(
      (item) => {
        let name = "";
        if (item.uid === auth.currentUser?.uid) {
          name = getUserName(item.uid);
        } else {
          name = getUserName(item.uid);
        }
        // Format as first name + last initial
        if (name) {
          const parts = name.split(" ");
          const first = parts[0] || "";
          const lastInitial = parts.length > 1 && parts[1] ? parts[1][0] : "";
          name = `${first} ${lastInitial}`;
        }
        let time = "";
        let date = "";
        if (item.createdAt && item.createdAt.seconds) {
          const d = new Date(item.createdAt.seconds * 1000);
          time = d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          date = d.toLocaleDateString();
        }
        // Only allow delete if it's your own message
        setModalInfo({
          name,
          time,
          date,
          canDelete: item.uid === auth.currentUser?.uid,
          messageId: item.id,
        });
        setModalVisible(true);
      },
      [auth.currentUser?.uid, getUserName]
    );

    // --- Date separator helper ---
    const getDateString = (item) => {
      if (!item?.createdAt) return "";
      let d;
      if (item.createdAt.seconds) {
        d = new Date(item.createdAt.seconds * 1000);
      } else if (typeof item.createdAt === "number") {
        d = new Date(item.createdAt);
      } else {
        return "";
      }
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    // Memoized renderItem with date separators
    const renderItem = useCallback(
      ({ item, index }) => {
        const isMe = item.uid === auth.currentUser?.uid;
        // FlatList is inverted and data is [...messages].reverse()
        // So index 0 is the most recent message, index N is the oldest
        // To get the "next" message in chronological order:
        const nextItem = messages[messages.length - 2 - index];
        // --- NEW: Get previous item in reversed array (i.e., visually next message up) ---
        const reversedMessages = [...messages].reverse();
        // Find the next "real" message above (not system/nook_share)
        let prevItem = null;
        for (let i = index - 1; i >= 0; i--) {
          const candidate = reversedMessages[i];
          if (candidate && !["nook_share", "system"].includes(candidate.type)) {
            prevItem = candidate;
            break;
          }
        }
        const userMentioned = isUserMentioned(item);

        // --- Date separator logic ---
        let showDateSeparator = false;
        const thisDate = getDateString(item);
        const nextDate = nextItem ? getDateString(nextItem) : null;
        if (!nextItem || thisDate !== nextDate) {
          showDateSeparator = true;
        }

        // --- Show profile pic and name for my message if next is not mine or this is most recent ---
        let showMyProfilePic = false;
        let showMySenderInfo = false;
        if (isMe) {
          if (!nextItem || nextItem.uid !== item.uid) {
            showMyProfilePic = true;
            showMySenderInfo = true;
          }
        }

        // --- CHANGED: Show profile pic and sender info for others, after their last message in chain ---
        // Use prevItem (visually next message up) and skip only nook_share/system
        const showProfilePic =
          !isMe && (!prevItem || prevItem.uid !== item.uid);
        const showSenderInfo =
          !isMe && (!prevItem || prevItem.uid !== item.uid);

        // --- Render date separator if needed ---
        const dateSeparator = showDateSeparator ? (
          <View
            style={{
              alignItems: "center",
              marginVertical: 12,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 4,
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.85,
              }}
            >
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontSize: 13,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {thisDate}
              </Text>
            </View>
          </View>
        ) : null;

        let messageNode = null;
        if (item.type === "system") {
          messageNode = <SystemMessage item={item} themeColors={themeColors} />;
        } else if (item.type === "nook_share") {
          // --- Treat nook_share like poll: alignment, sender info, profile pic ---
          let nookShowProfilePic, nookShowSenderInfo;
          if (isMe) {
            nookShowProfilePic = showMyProfilePic;
            nookShowSenderInfo = false; // <-- Don't show sender info for own nook_share
          } else {
            nookShowProfilePic = showProfilePic;
            nookShowSenderInfo = showSenderInfo;
          }
          // Add gap if previous message is from a different user
          const addGap = prevItem && prevItem.uid !== item.uid ? 20 : 0;
          messageNode = (
            <NookShareMessage
              item={item}
              themeColors={themeColors}
              navigation={navigation}
              starredNooks={starredNooks}
              toggleStarNook={toggleStarNook}
              isMe={isMe}
              showProfilePic={nookShowProfilePic}
              getUserProfilePic={() =>
                item.senderProfilePic || getUserProfilePic(item.uid)
              }
              showSenderInfo={nookShowSenderInfo}
              getUserName={() => item.senderName || getUserName(item.uid)}
              addGap={addGap}
            />
          );
        } else if (item.type === "poll") {
          // --- Only show profile pic/sender info if visually most bottom message from user ---
          let pollShowProfilePic, pollShowSenderInfo;
          if (isMe) {
            pollShowProfilePic = showMyProfilePic;
            pollShowSenderInfo = false; // Don't show sender info for own poll messages
          } else {
            pollShowProfilePic = showProfilePic;
            pollShowSenderInfo = showSenderInfo;
          }
          messageNode = (
            <PollMessage
              item={item}
              themeColors={themeColors}
              groupId={group?.id}
              userUid={auth.currentUser?.uid}
              isMe={isMe}
              showProfilePic={pollShowProfilePic}
              getUserProfilePic={() =>
                item.senderProfilePic || getUserProfilePic(item.uid)
              }
              onProfilePicPress={(uid) => {
                if (uid) {
                  navigation.navigate("Profile", { uid });
                }
              }}
              showSenderInfo={pollShowSenderInfo}
              getUserName={() => item.senderName || getUserName(item.uid)}
            />
          );
        } else if (isMe) {
          messageNode = (
            <MyMessageBubble
              item={item}
              themeColors={themeColors}
              userMentioned={userMentioned}
              openSenderInfoModal={undefined}
              renderReplyPreview={renderReplyPreview}
              getUserName={() => item.senderName || getUserName(item.uid)}
              onDoubleTap={() => handleDoubleTap(item)}
              showProfilePic={showMyProfilePic}
              profilePic={
                item.senderProfilePic ||
                getUserProfilePic(auth.currentUser?.uid)
              }
              userName={item.senderName || getUserName(auth.currentUser?.uid)}
              // --- Add onLongPress for delete ---
              onLongPress={() => {
                Alert.alert(
                  "Delete Message",
                  "Are you sure you want to delete this message?",
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
            />
          );
        } else {
          // --- Add marginTop if previous message is from a different user ---
          const addGap = prevItem && prevItem.uid !== item.uid ? 20 : 0;
          messageNode = (
            <View style={{ marginBottom: addGap }}>
              <OtherMessageBubble
                item={item}
                themeColors={themeColors}
                userMentioned={userMentioned}
                openSenderInfoModal={undefined}
                showProfilePic={showProfilePic}
                getUserProfilePic={() =>
                  item.senderProfilePic || getUserProfilePic(item.uid)
                }
                showSenderInfo={showSenderInfo}
                renderReplyPreview={renderReplyPreview}
                getUserName={() => item.senderName || getUserName(item.uid)}
                onDoubleTap={() => handleDoubleTap(item)}
                onProfilePicPress={(uid) => {
                  if (uid) {
                    navigation.navigate("Profile", { uid });
                  }
                }}
                // --- Only allow long press for own messages ---
                onLongPress={undefined}
              />
            </View>
          );
        }

        // --- Render date separator BEFORE the message node ---
        return (
          <>
            {messageNode}
            {dateSeparator}
          </>
        );
      },
      [
        messages,
        auth.currentUser?.uid,
        themeColors,
        navigation,
        starredNooks,
        toggleStarNook,
        isUserMentioned,
        renderReplyPreview,
        getUserProfilePic,
        group?.id,
        getUserName,
        handleDoubleTap,
      ]
    );

    // Memoized content container style
    const contentContainerStyle = useMemo(
      () => ({
        paddingHorizontal: 10,
        paddingTop: 10,
        justifyContent: "flex-end", // this is key for inverted lists to put nonfull at top
        padding: 10,
      }),
      [themeColors.white]
    );

    return (
      <>
        {/* --- Pinned Group Task --- */}
        <GroupTaskPinned
          task={latestTask}
          members={members}
          ownerUid={group?.createdBy}
          currentUserId={auth.currentUser?.uid}
          onCheckToggle={handleCheckToggle}
          themeColors={themeColors}
          checked={
            !!(
              latestTask &&
              Array.isArray(latestTask.checkedOff) &&
              latestTask.checkedOff.includes(auth.currentUser?.uid)
            )
          }
          loading={taskCheckLoading}
          onDeleteTask={async () => {
            if (!latestTask) return;
            // Only allow group creator to delete
            if (group?.createdBy !== auth.currentUser?.uid) {
              Alert.alert("Only the group creator can delete this task.");
              return;
            }
            Alert.alert(
              "Delete Task",
              "Are you sure you want to delete this group task?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await import("firebase/firestore").then(
                        ({ deleteDoc, doc }) =>
                          deleteDoc(
                            doc(
                              db,
                              "studyGroups",
                              groupId,
                              "tasks",
                              latestTask.id
                            )
                          )
                      );
                    } catch (e) {
                      console.error("Failed to delete task:", e);
                      Alert.alert("Error", "Failed to delete task.");
                    }
                  },
                },
              ]
            );
          }}
        />
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.25)",
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={() => setModalVisible(false)}
          >
            <View
              style={{
                backgroundColor: themeColors.white,
                borderRadius: 16,
                padding: 24,
                minWidth: 220,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: themeColors.purple,
                  marginBottom: 8,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {modalInfo.name}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: themeColors.darkGray,
                  marginBottom: 2,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {modalInfo.time}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: themeColors.darkGray,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {modalInfo.date}
              </Text>
            </View>
          </Pressable>
        </Modal>
        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          inverted
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyExtractor={(item) => item.id}
          contentContainerStyle={contentContainerStyle}
          renderItem={renderItem}
          getItemLayout={(data, index) => ({
            length: 100,
            offset: 100 * index,
            index,
          })}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 20,
          }}
        />
      </>
    );
  }
);

export default GroupMessagesList;

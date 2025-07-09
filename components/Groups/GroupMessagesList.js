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
          name = getUserName(item.uid) || "You";
        } else {
          name = getUserName(item.uid) || "User";
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

    // Memoized renderItem
    const renderItem = useCallback(
      ({ item, index }) => {
        const isMe = item.uid === auth.currentUser?.uid;
        const realIndex = messages.length - 1 - index;
        const nextItem = messages[realIndex + 1];
        const userMentioned = isUserMentioned(item);

        const showProfilePic =
          !isMe &&
          (!nextItem ||
            nextItem?.uid !== item.uid ||
            nextItem?.type === "system" ||
            nextItem?.type === "nook_share");
        const showSenderInfo =
          !nextItem ||
          nextItem?.uid !== item.uid ||
          nextItem?.type === "system" ||
          nextItem?.type === "nook_share";

        if (item.type === "system") {
          return <SystemMessage item={item} themeColors={themeColors} />;
        }
        if (item.type === "nook_share") {
          return (
            <NookShareMessage
              item={item}
              themeColors={themeColors}
              navigation={navigation}
              starredNooks={starredNooks}
              toggleStarNook={toggleStarNook}
            />
          );
        }
        if (item.type === "poll") {
          return (
            <PollMessage
              item={item}
              themeColors={themeColors}
              groupId={group?.id}
              userUid={auth.currentUser?.uid}
            />
          );
        }
        if (isMe) {
          return (
            <MyMessageBubble
              item={item}
              themeColors={themeColors}
              userMentioned={userMentioned}
              openSenderInfoModal={() => openSenderInfoModal(item)}
              renderReplyPreview={renderReplyPreview}
              showSenderInfo={showSenderInfo}
              getUserName={getUserName}
              onDoubleTap={() => handleDoubleTap(item)}
            />
          );
        }
        return (
          <OtherMessageBubble
            item={item}
            themeColors={themeColors}
            userMentioned={userMentioned}
            openSenderInfoModal={() => openSenderInfoModal(item)}
            showProfilePic={showProfilePic}
            getUserProfilePic={getUserProfilePic}
            showSenderInfo={showSenderInfo}
            renderReplyPreview={renderReplyPreview}
            getUserName={getUserName}
            onDoubleTap={() => handleDoubleTap(item)}
          />
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
        openSenderInfoModal,
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
              {/* Trash icon button in top right */}
              {modalInfo.canDelete && (
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    borderRadius: 20,
                    padding: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                  }}
                  onPress={() => {
                    setModalVisible(false);
                    Alert.alert(
                      "Delete Message",
                      "Are you sure you want to delete this message?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () =>
                            handleDeleteMessage(modalInfo.messageId),
                        },
                      ]
                    );
                  }}
                  accessibilityLabel="Delete message"
                >
                  <Trash size={20} color={themeColors.red} weight="bold" />
                </TouchableOpacity>
              )}
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: themeColors.purple,
                  marginBottom: 8,
                  fontFamily: "CarosSoft",
                }}
              >
                {modalInfo.name}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: themeColors.darkGray,
                  marginBottom: 2,
                  fontFamily: "CarosSoft",
                }}
              >
                {modalInfo.time}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: themeColors.darkGray,
                  fontFamily: "CarosSoft",
                }}
              >
                {modalInfo.date}
              </Text>
              {/* Remove old delete button at the bottom */}
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

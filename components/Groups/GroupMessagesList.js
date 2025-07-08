import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import ProfilePicture from "../Profile/ProfilePicture";
import { MapPin, Star } from "phosphor-react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
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

// --- Memoized System Message ---
const SystemMessage = memo(({ item, themeColors }) => (
  <View style={{ alignItems: "center", marginTop: 8, marginBottom: 10 }}>
    <Text
      style={{
        color: themeColors.darkGray,
        fontSize: 14,
        fontFamily: "CarosSoft",
        textAlign: "center",
        fontStyle: "italic",
      }}
    >
      {item.text}
    </Text>
  </View>
));

// --- Memoized Nook Share Message ---
const NookShareMessage = memo(
  ({ item, themeColors, navigation, starredNooks, toggleStarNook }) => (
    <View
      style={{
        flexDirection: "row",
        alignSelf: "center",
        alignItems: "center",
        marginBottom: 30,
        marginTop: 30,
        maxWidth: "100%",
      }}
    >
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("SpotDetail", { spotId: item.spotId })
        }
        style={{
          maxWidth: 280,
          backgroundColor: themeColors.lightGray,
          borderRadius: 14,
          padding: 12,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          borderColor: themeColors.black,
          borderWidth: 0.5,
          elevation: 5,
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
            <MapPin size={32} color={themeColors.white} weight="bold" />
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
            {"Shared by "}
            {item.senderFirstName
              ? item.senderFirstName +
                (item.senderLastName ? " " + item.senderLastName.charAt(0) : "")
              : item.senderName || "Someone"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => toggleStarNook(item.spotId)}
          style={{ padding: 4 }}
        >
          <Star
            size={22}
            color={themeColors.purple}
            weight={starredNooks.includes(item.spotId) ? "fill" : "regular"}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  )
);

// --- Memoized My Message Bubble ---
const MyMessageBubble = memo(
  ({
    item,
    themeColors,
    userMentioned,
    openSenderInfoModal,
    handleLongPressDelete,
    renderReplyPreview,
    showSenderInfo,
  }) => (
    <View
      style={{
        flexDirection: "row-reverse",
        alignItems: "flex-end",
        alignSelf: "flex-end",
        marginBottom: 5,
        maxWidth: "80%",
        marginRight: -5,
      }}
    >
      <View style={{ flexShrink: 1 }}>
        {renderReplyPreview(item)}
        <TouchableOpacity
          activeOpacity={1}
          onLongPress={handleLongPressDelete}
          delayLongPress={400}
        >
          <TouchableOpacity
            activeOpacity={1}
            onLongPress={openSenderInfoModal}
            delayLongPress={400}
          >
            <View
              style={{
                backgroundColor: themeColors.purple,
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
                alignSelf: "flex-end",
                ...(userMentioned
                  ? {
                      borderWidth: 2,
                      borderColor: themeColors.yellow || "#FFD700",
                      shadowColor: themeColors.yellow || "#FFD700",
                      shadowOpacity: 0.25,
                      shadowRadius: 6,
                    }
                  : {}),
              }}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontSize: 15,
                  fontFamily: "CarosSoft",
                }}
              >
                {item.text}
              </Text>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
        {showSenderInfo && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 2,
              alignSelf: "flex-end",
            }}
          >
            <Text
              style={{
                color: themeColors.darkGray,
                fontSize: 11,
                marginLeft: 0,
                fontFamily: "CarosSoft",
                textAlign: "right",
              }}
            >
              {item.createdAt && item.createdAt.seconds
                ? new Date(item.createdAt.seconds * 1000).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )
                : ""}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
);

// --- Memoized Other Message Bubble ---
const OtherMessageBubble = memo(
  ({
    item,
    themeColors,
    userMentioned,
    openSenderInfoModal,
    showProfilePic,
    getUserProfilePic,
    showSenderInfo,
    renderReplyPreview,
    SwipeableMessage,
  }) => (
    <SwipeableMessage item={item}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          marginBottom: 5,
          maxWidth: "80%",
          marginLeft: -5,
        }}
      >
        {showProfilePic ? (
          <View style={{ marginRight: 10 }}>
            <ProfilePicture
              profilePic={getUserProfilePic(item.uid)}
              themeColors={themeColors}
              size={28}
            />
          </View>
        ) : (
          <View style={{ width: 28, marginRight: 10 }} />
        )}
        <View style={{ flex: 1 }}>
          {renderReplyPreview(item)}
          <View
            style={{
              flexDirection: "column",
              alignItems: "flex-start",
              flexShrink: 1,
            }}
          >
            <View
              style={{
                flexShrink: 1,
                flexGrow: 1,
                alignSelf: "stretch",
              }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onLongPress={openSenderInfoModal}
                delayLongPress={400}
              >
                <View
                  style={{
                    backgroundColor: themeColors.gray,
                    borderRadius: 14,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 2,
                    elevation: 1,
                    minWidth: 50,
                    alignItems: "flex-start",
                    alignSelf: "flex-start",
                    maxWidth: "100%",
                    ...(userMentioned
                      ? {
                          borderWidth: 2,
                          borderColor: themeColors.yellow || "#FFD700",
                          shadowColor: themeColors.yellow || "#FFD700",
                          shadowOpacity: 0.25,
                          shadowRadius: 6,
                        }
                      : {}),
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.black,
                      fontSize: 15,
                      fontFamily: "CarosSoft",
                      flexShrink: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    {item.text}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            {showSenderInfo && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontSize: 11,
                    fontFamily: "CarosSoft",
                  }}
                >
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
            )}
          </View>
        </View>
      </View>
    </SwipeableMessage>
  )
);

// --- Memoized Poll Message ---
const PollMessage = memo(({ item, themeColors, groupId, userUid }) => {
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const votes = item.poll?.votes || {};
  const totalVotes = Object.values(votes).length;
  const userVote = Object.entries(votes).find(([uid]) => uid === userUid)?.[1];

  const handleVote = async (idx) => {
    if (submitting) return;
    if (userVote === idx) return;
    setSubmitting(true);
    try {
      const msgRef = doc(db, "studyGroups", groupId, "messages", item.id);
      await updateDoc(msgRef, {
        [`poll.votes.${userUid}`]: idx,
      });
      setSelected(idx);
    } catch {}
    setSubmitting(false);
  };

  return (
    <View
      style={{
        backgroundColor: themeColors.lightGray + "CC",
        borderRadius: 12,
        padding: 10,
        marginVertical: 8,
        alignSelf: "center",
        width: "96%",
        borderWidth: 1,
        borderColor: themeColors.purple + "33",
        shadowColor: "#000",
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
          fontFamily: "CarosSoft",
          marginBottom: 6,
          marginLeft: 2,
        }}
        numberOfLines={2}
      >
        {item.poll?.question}
      </Text>
      {item.poll?.options?.map((opt, idx) => {
        const count = Object.values(votes).filter((v) => v === idx).length;
        const percent =
          totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const voted = userVote === idx;
        return (
          <TouchableOpacity
            key={idx}
            onPress={() => handleVote(idx)}
            style={{
              backgroundColor: voted ? themeColors.purple : themeColors.white,
              borderRadius: 7,
              paddingVertical: 8,
              paddingHorizontal: 10,
              marginBottom: 5,
              borderWidth: voted ? 1.5 : 1,
              borderColor: voted
                ? themeColors.purple
                : themeColors.purple + "22",
              opacity: submitting ? 0.6 : 1,
              minHeight: 32,
              justifyContent: "center",
            }}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {/* Progress bar background */}
            {userVote !== undefined && (
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${percent}%`,
                  backgroundColor: voted
                    ? themeColors.purple + "55"
                    : themeColors.purple + "18",
                  borderRadius: 7,
                  zIndex: 0,
                }}
              />
            )}
            <View
              style={{ flexDirection: "row", alignItems: "center", zIndex: 1 }}
            >
              <Text
                style={{
                  color: voted ? themeColors.white : themeColors.purple,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                  fontSize: 14,
                  flex: 1,
                  flexWrap: "wrap",
                }}
                numberOfLines={1}
              >
                {opt}
              </Text>
              {userVote !== undefined && (
                <Text
                  style={{
                    color: voted ? themeColors.white : themeColors.purple,
                    fontSize: 12,
                    marginLeft: 8,
                    fontFamily: "CarosSoft",
                  }}
                >
                  {percent}%
                </Text>
              )}
            </View>
            {userVote !== undefined && (
              <Text
                style={{
                  color: voted ? themeColors.white : themeColors.darkGray,
                  fontSize: 11,
                  marginTop: 1,
                  fontFamily: "CarosSoft",
                  textAlign: "right",
                }}
              >
                {count} vote{count !== 1 ? "s" : ""}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
      {userVote !== undefined && (
        <Text
          style={{
            color: themeColors.darkGray,
            fontSize: 11,
            marginTop: 4,
            fontFamily: "CarosSoft",
            textAlign: "right",
          }}
        >
          You voted
        </Text>
      )}
    </View>
  );
});

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
    groupId, // <-- add this prop
    members, // <-- add this prop
  }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [modalInfo, setModalInfo] = useState({
      name: "",
      time: "",
      date: "",
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

    // Memoized swipeable message
    const SwipeableMessage = useCallback(
      ({ item, children }) => {
        const translateX = React.useRef(new Animated.Value(0)).current;
        const SWIPE_THRESHOLD = 60;
        const MAX_SWIPE = 50;

        const onGestureEvent = Animated.event(
          [{ nativeEvent: { translationX: translateX } }],
          {
            useNativeDriver: false,
            listener: (event) => {
              const value = event.nativeEvent.translationX;
              if (value > MAX_SWIPE) {
                translateX.setValue(MAX_SWIPE);
              } else if (value < 0) {
                translateX.setValue(0);
              }
            },
          }
        );

        const onHandlerStateChange = (event) => {
          if (
            event.nativeEvent.oldState === State.ACTIVE ||
            event.nativeEvent.state === State.END
          ) {
            if (event.nativeEvent.translationX > SWIPE_THRESHOLD) {
              setReplyToMessage(item);
            }
            Animated.timing(translateX, {
              toValue: 0,
              duration: 120,
              useNativeDriver: false,
            }).start();
          }
        };

        return (
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetX={15}
            failOffsetY={[-10, 10]}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    translateX: translateX.interpolate({
                      inputRange: [0, MAX_SWIPE],
                      outputRange: [0, MAX_SWIPE],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              }}
            >
              {children}
            </Animated.View>
          </PanGestureHandler>
        );
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
        setModalInfo({ name, time, date });
        setModalVisible(true);
      },
      [auth.currentUser?.uid, getUserName]
    );

    // Memoized long press delete
    const handleLongPressDelete = useCallback(
      (item) => {
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
      },
      [handleDeleteMessage]
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
              handleLongPressDelete={() => handleLongPressDelete(item)}
              renderReplyPreview={renderReplyPreview}
              showSenderInfo={showSenderInfo}
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
            SwipeableMessage={SwipeableMessage}
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
        handleLongPressDelete,
        renderReplyPreview,
        getUserProfilePic,
        SwipeableMessage,
        group?.id,
      ]
    );

    // Memoized content container style
    const contentContainerStyle = useMemo(
      () => ({
        padding: 18,
        flexGrow: 1,
        backgroundColor: themeColors.white,
      }),
      [themeColors.white]
    );

    return (
      <>
        {/* --- Pinned Group Task --- */}
        <GroupTaskPinned
          task={latestTask}
          members={members}
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
        />
      </>
    );
  }
);

export default GroupMessagesList;

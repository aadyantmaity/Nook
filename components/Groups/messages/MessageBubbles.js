import React, { memo, useState, useRef } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import ProfilePicture from "../../Profile/ProfilePicture";
import { MapPin, Star, User } from "phosphor-react-native";
import { db } from "../../../firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import { FONTS } from "../../../constants/fonts";

// --- MyMessageBubble ---
export const MyMessageBubble = memo(
  ({
    item,
    themeColors,
    userMentioned,
    openSenderInfoModal,
    renderReplyPreview,
    getUserName,
    onDoubleTap,
    onLongPress, // <-- add this prop
    showProfilePic,
    profilePic,
    userName,
  }) => {
    // Double tap logic
    const lastTap = useRef(0);
    const handlePress = () => {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        onDoubleTap?.();
      }
      lastTap.current = now;
    };
    return (
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "flex-end",
          alignSelf: "flex-end",
          marginBottom: 5,
          maxWidth: "80%",
        }}
      >
        <View style={{ flex: 1 }}>
          {renderReplyPreview(item)}
          <View
            style={{
              flexDirection: "column",
              alignItems: "flex-end",
              flexShrink: 1,
            }}
          >
            <View style={{ flexShrink: 1, flexGrow: 1, alignSelf: "stretch" }}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={handlePress}
                onLongPress={onLongPress}
                delayLongPress={350}
              >
                <View
                  style={{
                    backgroundColor: themeColors.purple,
                    borderRadius: 14,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    shadowColor: themeColors.black,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 2,
                    elevation: 1,
                    minWidth: 50,
                    alignItems: "flex-end",
                    alignSelf: "flex-end",
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
                      color: themeColors.white,
                      fontSize: 15,
                      fontFamily: FONTS.PRIMARY,
                      flexShrink: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    {item.text}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }
);

// --- OtherMessageBubble ---
export const OtherMessageBubble = memo(
  ({
    item,
    themeColors,
    userMentioned,
    openSenderInfoModal,
    showProfilePic,
    getUserProfilePic,
    showSenderInfo,
    renderReplyPreview,
    getUserName,
    onDoubleTap,
    onProfilePicPress,
  }) => {
    // Double tap logic
    const lastTap = useRef(0);
    const handlePress = () => {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        onDoubleTap?.();
      }
      lastTap.current = now;
    };
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          marginBottom: 5,
          maxWidth: "80%",
          marginLeft: 0,
        }}
      >
        {showProfilePic ? (
          <TouchableOpacity
            onPress={
              onProfilePicPress ? () => onProfilePicPress(item.uid) : undefined
            }
            style={{ marginRight: 10 }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: themeColors.purple,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {getUserProfilePic() ? (
                <Image
                  source={{ uri: getUserProfilePic() }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <User size={16} color={themeColors.white} />
              )}
            </View>
          </TouchableOpacity>
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
            <View style={{ flexShrink: 1, flexGrow: 1, alignSelf: "stretch" }}>
              <TouchableOpacity activeOpacity={1} onPress={handlePress}>
                <View
                  style={{
                    backgroundColor: themeColors.gray,
                    borderRadius: 14,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    shadowColor: themeColors.black,
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
                      fontFamily: FONTS.PRIMARY,
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
                    fontWeight: "bold",
                    fontSize: 11,
                    marginRight: 2,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  {/* Show first name and last initial */}
                  {(() => {
                    const name = getUserName();
                    if (!name) return "";
                    const parts = name.split(" ");
                    const first = parts[0] || "";
                    const lastInitial =
                      parts.length > 1 && parts[1] ? parts[1][0] : "";
                    return `${first} ${lastInitial}.`;
                  })()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }
);

// --- SystemMessage ---
export const SystemMessage = memo(({ item, themeColors }) => (
  <TouchableOpacity activeOpacity={1}>
    <View
      style={{
        alignItems: "center",
        marginBottom: 5,
        maxWidth: "80%",
        alignSelf: "center",
      }}
    >
      <View
        style={{
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 16,
          shadowColor: themeColors.black,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 2,
          elevation: 1,
          minWidth: 50,
          alignItems: "center",
          alignSelf: "center",
          maxWidth: "100%",
        }}
      >
        <Text
          style={{
            color: themeColors.darkGray,
            fontSize: 14,
            fontFamily: FONTS.PRIMARY,
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          {item.text}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
));

// --- NookShareMessage ---
export const NookShareMessage = memo(
  ({
    item,
    themeColors,
    navigation,
    starredNooks,
    toggleStarNook,
    isMe,
    showProfilePic,
    getUserProfilePic,
    showSenderInfo,
    getUserName,
    addGap = 0,
    onProfilePicPress,
  }) => {
    // Alignment and margin logic (same as MyMessageBubble for isMe)
    const containerStyle = isMe
      ? {
          flexDirection: "row-reverse",
          alignItems: "flex-end",
          alignSelf: "flex-end",
          marginBottom: 5 + addGap,
          maxWidth: "80%",
        }
      : {
          flexDirection: "row",
          alignItems: "flex-end",
          alignSelf: "flex-start",
          marginBottom: 5 + addGap,
          maxWidth: "80%",
          marginLeft: 0,
        };

    return (
      <View style={containerStyle}>
        {isMe ? null : showProfilePic ? (
          <TouchableOpacity
            onPress={
              onProfilePicPress ? () => onProfilePicPress(item.uid) : undefined
            }
            style={{ marginRight: 10 }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: themeColors.purple,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {getUserProfilePic() ? (
                <Image
                  source={{ uri: getUserProfilePic() }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <User size={16} color={themeColors.white} />
              )}
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28, marginRight: 10 }} />
        )}
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("SpotDetail", { spotId: item.spotId })
            }
            style={{
              backgroundColor: themeColors.lightGray,
              borderRadius: 14,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: themeColors.purple + "44",
              shadowColor: themeColors.black,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
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
                <MapPin size={32} color={themeColors.white} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontSize: 16,
                  fontFamily: FONTS.PRIMARY,
                }}
                numberOfLines={1}
              >
                {item.spotName || "Nook"}
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
          {!isMe && showSenderInfo && (
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
                  fontWeight: "bold",
                  fontSize: 11,
                  marginRight: 2,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {getUserName()}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }
);

// --- PollMessage ---
export const PollMessage = memo(
  ({
    item,
    themeColors,
    groupId,
    userUid,
    isMe,
    showProfilePic,
    getUserProfilePic,
    onProfilePicPress,
    showSenderInfo,
    getUserName,
  }) => {
    const [selected, setSelected] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const votes = item.poll?.votes || {};
    const totalVotes = Object.values(votes).length;
    const userVote = Object.entries(votes).find(
      ([uid]) => uid === userUid
    )?.[1];

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

    // Alignment and margin logic
    const containerStyle = isMe
      ? {
          flexDirection: "row-reverse",
          alignItems: "flex-end",
          alignSelf: "flex-end",
          marginBottom: 5,
          maxWidth: "80%",
        }
      : {
          flexDirection: "row",
          alignItems: "flex-end",
          marginBottom: 5,
          maxWidth: "80%",
          marginLeft: 0,
        };

    return (
      <TouchableOpacity activeOpacity={1}>
        <View style={containerStyle}>
          {isMe ? null : showProfilePic ? (
            <TouchableOpacity
              onPress={
                onProfilePicPress
                  ? () => onProfilePicPress(item.uid)
                  : undefined
              }
              style={{ marginRight: 10 }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: themeColors.purple,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {getUserProfilePic() ? (
                  <Image
                    source={{ uri: getUserProfilePic() }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <User size={16} color={themeColors.white} />
                )}
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 28, marginRight: 10 }} />
          )}
          <View style={{ flex: 1 }}>
            <View
              style={{
                backgroundColor: themeColors.lightGray + "CC",
                borderRadius: 12,
                padding: 10,
                alignSelf: "stretch",
                width: "100%",
                borderWidth: 1,
                borderColor: themeColors.purple + "44",
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
                  fontFamily: FONTS.PRIMARY,
                  marginBottom: 6,
                  marginLeft: 2,
                }}
                numberOfLines={2}
              >
                {item.poll?.question}
              </Text>
              {item.poll?.options?.map((opt, idx) => {
                const count = Object.values(votes).filter(
                  (v) => v === idx
                ).length;
                const voted = userVote === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleVote(idx)}
                    style={{
                      backgroundColor: voted
                        ? themeColors.purple
                        : themeColors.white,
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
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        zIndex: 1,
                      }}
                    >
                      <Text
                        style={{
                          color: submitting
                            ? themeColors.darkGray
                            : voted
                            ? themeColors.white
                            : themeColors.purple,
                          fontWeight: "bold",
                          fontFamily: FONTS.PRIMARY,
                          fontSize: 14,
                          flex: 1,
                          flexWrap: "wrap",
                        }}
                        numberOfLines={1}
                      >
                        {opt}
                      </Text>
                      <Text
                        style={{
                          color: submitting
                            ? themeColors.darkGray
                            : voted
                            ? themeColors.white
                            : themeColors.purple,
                          fontSize: 12,
                          marginLeft: 8,
                          fontFamily: FONTS.PRIMARY,
                        }}
                      >
                        {count} vote{count !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {userVote !== undefined && (
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontSize: 11,
                    marginTop: 4,
                    fontFamily: FONTS.PRIMARY,
                    textAlign: "right",
                  }}
                >
                  You voted
                </Text>
              )}
            </View>
            {!isMe && showSenderInfo && (
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
                    fontWeight: "bold",
                    fontSize: 11,
                    marginRight: 2,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  {/* Show first name and last initial */}
                  {(() => {
                    const name = getUserName();
                    if (!name) return "";
                    const parts = name.split(" ");
                    const first = parts[0] || "";
                    const lastInitial =
                      parts.length > 1 && parts[1] ? parts[1][0] : "";
                    return lastInitial ? `${first} ${lastInitial}.` : first;
                  })()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

// No changes needed, already uses item.senderName and item.senderProfilePic

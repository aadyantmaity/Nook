import React from "react";
import { View, Text, TouchableOpacity, FlatList, Image } from "react-native";
import { UsersThree, At, Plus, Minus } from "phosphor-react-native";

export default function RecentActivityList({
  recentActivity,
  navigation,
  themeColors,
  expanded,
  setExpanded,
  onGoToMessage, // <-- add this prop
}) {
  // --- Ensure recentActivity is always an array ---
  const safeRecentActivity = Array.isArray(recentActivity)
    ? recentActivity
    : [];
  return (
    <View style={{ width: "100%", marginBottom: 8 }}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: themeColors.lightGray,
          marginBottom: expanded ? 8 : 0,
        }}
        accessibilityLabel={
          expanded ? "Collapse recent activity" : "Expand recent activity"
        }
      >
        <Text
          style={{
            fontSize: 17,
            color: themeColors.purple,
            fontFamily: "CarosSoft",
            marginRight: 6,
          }}
        >
          Recent Activity
        </Text>
        {expanded ? (
          <Minus size={18} color={themeColors.purple} />
        ) : (
          <Plus size={18} color={themeColors.purple} />
        )}
      </TouchableOpacity>
      {expanded && (
        <FlatList
          data={safeRecentActivity}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, idx) => `${item.type}_${item.uid}_${idx}`}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: themeColors.lightGray,
                borderRadius: 10,
                padding: 12,
                alignItems: "center",
                minWidth: 120,
                maxWidth: 160,
                marginRight: 10,
              }}
            >
              {/* Profile picture touchable */}
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate("Profile", { uid: item.uid });
                }}
                activeOpacity={0.8}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: themeColors.purple,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 6,
                  overflow: "hidden",
                }}
              >
                {item.profilePic ? (
                  <Image
                    source={{ uri: item.profilePic }}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                    resizeMode="cover"
                  />
                ) : item.type === "mention" ? (
                  <At size={28} color={themeColors.white} />
                ) : item.type === "join_group" ? (
                  <UsersThree size={28} color={themeColors.white} />
                ) : (
                  <UsersThree size={28} color={themeColors.white} />
                )}
              </TouchableOpacity>
              {/* Rest of card touchable for message navigation */}
              <TouchableOpacity
                onPress={() => {
                  if (item.type === "mention" && item.feedMessageId) {
                    onGoToMessage?.(item);
                  } else if (item.type === "join_group" && item.groupId) {
                    navigation.navigate("GroupDetail", {
                      groupId: item.groupId,
                    });
                  }
                }}
                activeOpacity={0.8}
                style={{ width: "100%", alignItems: "center" }}
              >
                <Text
                  style={{
                    color: themeColors.black,
                    fontWeight: "bold",
                    fontSize: 15,
                    fontFamily: "CarosSoft",
                    textAlign: "center",
                    marginBottom: 2,
                  }}
                  numberOfLines={1}
                >
                  {item.name || item.groupName || item.postText || ""}
                </Text>
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontSize: 13,
                    fontFamily: "CarosSoft",
                    textAlign: "center",
                  }}
                  numberOfLines={2}
                >
                  {item.type === "followed_by"
                    ? "Followed you"
                    : item.type === "mention"
                    ? "Mentioned You"
                    : ""}
                </Text>
                {/* Removed Go to Message button */}
              </TouchableOpacity>
            </View>
          )}
          style={{ minHeight: 60 }}
        />
      )}
    </View>
  );
}

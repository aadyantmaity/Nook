import React from "react";
import { View, Text } from "react-native";

export default function TagList({ tags, themeColors }) {
  return (
    <View style={{ marginTop: 0, marginBottom: 16, alignItems: "flex-start" }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {tags.length > 0 ? (
          tags.map((tag, index) => (
            <View
              key={index}
              style={{
                backgroundColor: themeColors.purple,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: themeColors.white, fontSize: 14 }}>
                {String(tag)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 16, color: themeColors.black }}>
            No tags available
          </Text>
        )}
      </View>
    </View>
  );
}

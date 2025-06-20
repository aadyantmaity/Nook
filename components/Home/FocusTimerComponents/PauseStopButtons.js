import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Pause, Stop } from "phosphor-react-native";

export function PauseStopButtons({ onPause, onStop, themeColors }) {
  return (
    <>
      <TouchableOpacity
        onPress={onPause}
        style={{
          backgroundColor: themeColors.purple,
          borderRadius: 30,
          padding: 18,
          marginHorizontal: 8,
        }}
      >
        <Pause size={28} color={themeColors.white} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onStop}
        style={{
          backgroundColor: themeColors.red,
          borderRadius: 30,
          padding: 18,
          marginHorizontal: 8,
        }}
      >
        <Stop size={28} color={themeColors.white} />
      </TouchableOpacity>
    </>
  );
}

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Play, Pause, Stop, Timer } from "phosphor-react-native";

// Helper to format seconds as mm:ss
function formatTime(secs) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function TimerControls({
  timer,
  isBreak,
  isRunning,
  onStart,
  onPause,
  onStop,
  onSettings,
  themeColors,
}) {
  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
          width: "100%",
        }}
      >
        <Text
          style={{
            fontSize: 48,
            fontWeight: "bold",
            color: themeColors.purple,
            fontFamily: "CarosSoft",
          }}
        >
          {formatTime(timer)}
        </Text>
        <TouchableOpacity
          onPress={onSettings}
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 30,
            padding: 14,
            marginLeft: 12,
            borderWidth: 1,
            borderColor: themeColors.purple,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="Pomodoro Settings"
        >
          <Timer size={22} color={themeColors.purple} weight="bold" />
        </TouchableOpacity>
      </View>
      <Text
        style={{
          color: themeColors.darkGray,
          marginBottom: 18,
          fontFamily: "CarosSoft",
        }}
      >
        {isBreak ? "Break" : "Pomodoro"}
      </Text>
      <View
        style={{
          flexDirection: "row",
          marginTop: 12,
          alignItems: "center",
        }}
      >
        {!isRunning && (
          <TouchableOpacity
            onPress={onStart}
            style={{
              backgroundColor: themeColors.green,
              borderRadius: 30,
              padding: 18,
              marginHorizontal: 8,
            }}
          >
            <Play size={28} color={themeColors.white} />
          </TouchableOpacity>
        )}
        {isRunning && (
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
        )}
        {!isRunning && (
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
        )}
      </View>
    </>
  );
}

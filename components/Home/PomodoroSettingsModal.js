import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
} from "react-native";
import { Check } from "phosphor-react-native";

export default function PomodoroSettingsModal({
  visible,
  onClose,
  workTimeSetting,
  setWorkTimeSetting,
  breakTimeSetting,
  setBreakTimeSetting,
  isRunning,
  isBreak,
  setTimer,
  themeColors,
  reflectionsEnabled = true,
  setReflectionsEnabled,
}) {
  const [workInput, setWorkInput] = useState(String(workTimeSetting));
  const [breakInput, setBreakInput] = useState(String(breakTimeSetting));

  useEffect(() => {
    setWorkInput(String(workTimeSetting));
    setBreakInput(String(breakTimeSetting));
  }, [workTimeSetting, breakTimeSetting, visible]);

  const handleDone = () => {
    const work = parseInt(workInput, 10);
    const brk = parseInt(breakInput, 10);
    if (!work || work < 1 || work > 180) return;
    if (!brk || brk < 1 || brk > 60) return;
    setWorkTimeSetting(work); // parent will update Firestore
    setBreakTimeSetting(brk); // parent will update Firestore
    if (!isRunning && !isBreak) setTimer(work * 60);
    if (!isRunning && isBreak) setTimer(brk * 60);
    onClose();
  };

  const isDisabled =
    !workInput ||
    !breakInput ||
    isNaN(Number(workInput)) ||
    isNaN(Number(breakInput)) ||
    parseInt(workInput, 10) < 1 ||
    parseInt(workInput, 10) > 180 ||
    parseInt(breakInput, 10) < 1 ||
    parseInt(breakInput, 10) > 60;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 16,
            padding: 24,
            width: "85%",
            alignItems: "center",
            position: "absolute",
            left: "7.5%",
            right: "7.5%",
            bottom: "40%",
            borderWidth: 1,
            borderColor: themeColors.black,
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
          onStartShouldSetResponder={() => true}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: themeColors.purple,
              marginBottom: 16,
              fontFamily: "CarosSoft",
            }}
          >
            Pomodoro Settings
          </Text>
          {/* Reflections toggle */}

          <View style={{ width: "100%", marginBottom: 18 }}>
            <Text
              style={{
                color: themeColors.black,
                fontSize: 16,
                marginBottom: 6,
                fontFamily: "CarosSoft",
              }}
            >
              Work Duration (minutes)
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: themeColors.purple,
                borderRadius: 8,
                padding: 10,
                color: themeColors.black,
                backgroundColor: themeColors.white,
                fontSize: 16,
                fontFamily: "CarosSoft",
                marginBottom: 12,
              }}
              keyboardType="numeric"
              value={workInput}
              onChangeText={setWorkInput}
              maxLength={3}
              placeholder="25"
              placeholderTextColor={themeColors.darkGray}
            />
            <Text
              style={{
                color: themeColors.black,
                fontSize: 16,
                marginBottom: 6,
                fontFamily: "CarosSoft",
              }}
            >
              Break Duration (minutes)
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: themeColors.purple,
                borderRadius: 8,
                padding: 10,
                color: themeColors.black,
                backgroundColor: themeColors.white,
                fontSize: 16,
                fontFamily: "CarosSoft",
              }}
              keyboardType="numeric"
              value={breakInput}
              onChangeText={setBreakInput}
              maxLength={2}
              placeholder="5"
              placeholderTextColor={themeColors.darkGray}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
              alignSelf: "flex-end",
            }}
          >
            <Text
              style={{
                color: themeColors.purple,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
                marginRight: 8,
              }}
            >
              {reflectionsEnabled
                ? "Reflections Enabled"
                : "Reflections Disabled"}
            </Text>
            <Switch
              value={!!reflectionsEnabled}
              onValueChange={setReflectionsEnabled}
              trackColor={{ false: themeColors.gray, true: themeColors.purple }}
              thumbColor={
                reflectionsEnabled ? themeColors.white : themeColors.gray
              }
              accessibilityLabel={
                reflectionsEnabled
                  ? "Disable Reflections"
                  : "Enable Reflections"
              }
            />
          </View>
          <TouchableOpacity
            onPress={handleDone}
            disabled={isDisabled}
            style={{
              backgroundColor: isDisabled
                ? themeColors.gray
                : themeColors.purple,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 24,
              alignItems: "center",
              marginTop: 8,
              opacity: isDisabled ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                color: isDisabled ? themeColors.darkGray : themeColors.white,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
                fontSize: 16,
                letterSpacing: 0.1,
              }}
            >
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

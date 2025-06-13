import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import Slider from "@react-native-community/slider";
import { SpeakerHigh, UsersThree } from "phosphor-react-native";

export default function LiveUpdateModal({
  visible,
  onClose,
  spotId,
  initialNoise = 0,
  initialCrowd = 0,
  onSubmit,
  themeColors,
}) {
  const [noise, setNoise] = useState(initialNoise);
  const [crowd, setCrowd] = useState(initialCrowd);

  const handleSubmit = () => {
    if (onSubmit) onSubmit({ noise, crowd });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 16,
            padding: 24,
            width: "85%",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 12,
              color: themeColors.black,
            }}
          >
            Live Update
          </Text>
          <View style={{ width: "100%", marginBottom: 16 }}>
            <Text style={{ color: themeColors.black, marginBottom: 4 }}>
              Noise Level
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <SpeakerHigh size={22} color={themeColors.purple} />
              <Slider
                style={{ flex: 1, marginHorizontal: 10 }}
                minimumValue={0}
                maximumValue={5}
                step={1}
                value={noise}
                onValueChange={setNoise}
                minimumTrackTintColor={themeColors.purple}
                maximumTrackTintColor={themeColors.gray}
                thumbTintColor={themeColors.purple}
              />
              <Text style={{ color: themeColors.black }}>{noise}</Text>
            </View>
          </View>
          <View style={{ width: "100%", marginBottom: 16 }}>
            <Text style={{ color: themeColors.black, marginBottom: 4 }}>
              Crowd Level
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <UsersThree size={22} color={themeColors.purple} />
              <Slider
                style={{ flex: 1, marginHorizontal: 10 }}
                minimumValue={0}
                maximumValue={5}
                step={1}
                value={crowd}
                onValueChange={setCrowd}
                minimumTrackTintColor={themeColors.purple}
                maximumTrackTintColor={themeColors.gray}
                thumbTintColor={themeColors.purple}
              />
              <Text style={{ color: themeColors.black }}>{crowd}</Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: themeColors.gray,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 18,
                alignItems: "center",
                flex: 1,
                marginRight: 8,
              }}
            >
              <Text style={{ color: themeColors.black, fontWeight: "bold" }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={{
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 18,
                alignItems: "center",
                flex: 1,
                marginLeft: 8,
              }}
            >
              <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                Submit
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

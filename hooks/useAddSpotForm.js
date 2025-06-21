import { useState } from "react";

export default function useAddSpotForm(initialState = {}) {
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [huskyCardNeeded, setHuskyCardNeeded] = useState(false);
  const [department, setDepartment] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [showAddedBy, setShowAddedBy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUWBuilding, setIsUWBuilding] = useState(true);
  const [customBuilding, setCustomBuilding] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [customImage, setCustomImage] = useState(null);

  const resetForm = () => {
    setSelectedBuilding("");
    setRoomNumber("");
    setHuskyCardNeeded(false);
    setDepartment("");
    setSelectedTags([]);
    setShowAddedBy(false);
    setIsUWBuilding(true);
    setCustomBuilding("");
    setIsFavorite(false);
    setCustomImage(null);
  };

  return {
    selectedBuilding,
    setSelectedBuilding,
    roomNumber,
    setRoomNumber,
    huskyCardNeeded,
    setHuskyCardNeeded,
    department,
    setDepartment,
    selectedTags,
    setSelectedTags,
    showAddedBy,
    setShowAddedBy,
    isLoading,
    setIsLoading,
    isUWBuilding,
    setIsUWBuilding,
    customBuilding,
    setCustomBuilding,
    isFavorite,
    setIsFavorite,
    showPreview,
    setShowPreview,
    customImage,
    setCustomImage,
    resetForm,
  };
}

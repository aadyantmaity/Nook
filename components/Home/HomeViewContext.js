import React, { createContext, useContext, useState } from "react";

const HomeViewContext = createContext();

export function HomeViewProvider({ children }) {
  const [showMapView, setShowMapView] = useState(false);
  const [showFriendsView, setShowFriendsView] = useState(false); // Add friends view state
  const [tabIndex, setTabIndex] = useState(1); // Home tab index

  return (
    <HomeViewContext.Provider
      value={{
        showMapView,
        setShowMapView,
        showFriendsView,
        setShowFriendsView,
        tabIndex,
        setTabIndex,
      }}
    >
      {children}
    </HomeViewContext.Provider>
  );
}

export function useHomeView() {
  return useContext(HomeViewContext);
}

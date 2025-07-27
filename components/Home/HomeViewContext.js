import React, { createContext, useContext, useState } from "react";

const HomeViewContext = createContext();

export function HomeViewProvider({ children }) {
  const [showMapView, setShowMapView] = useState(false);
  const [tabIndex, setTabIndex] = useState(1); // Home tab index

  return (
    <HomeViewContext.Provider value={{ showMapView, setShowMapView, tabIndex, setTabIndex }}>
      {children}
    </HomeViewContext.Provider>
  );
}

export function useHomeView() {
  return useContext(HomeViewContext);
}
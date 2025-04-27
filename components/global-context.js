"use client"

import { createContext, useContext, useState } from "react"

const GlobalContext = createContext();

export function GlobalProvider({ children, initEmployee }) {
  const [employee, setEmployee] = useState(initEmployee || null)

  return (
    <GlobalContext.Provider value={{ employee, setEmployee }}>
      {children}
    </GlobalContext.Provider>
  );
}

// Custom hook for easier access
export function useGlobalContext() {
  return useContext(GlobalContext)
}
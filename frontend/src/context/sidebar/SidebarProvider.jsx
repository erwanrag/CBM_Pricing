//src/context/sidebar/SidebarProvider.jsx
import { useState } from "react";
import { SidebarContext } from "./SidebarContext";

export function SidebarProvider({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const togglePin = () => setIsSidebarPinned(!isSidebarPinned);

  return (
    <SidebarContext.Provider
      value={{ isSidebarOpen, isSidebarPinned, toggleSidebar, closeSidebar, togglePin }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

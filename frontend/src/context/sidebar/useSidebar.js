//src/context/sidebar/useSidebar.js

import { useContext } from "react";
import { SidebarContext } from "./SidebarContext";

export const useSidebar = () => useContext(SidebarContext);

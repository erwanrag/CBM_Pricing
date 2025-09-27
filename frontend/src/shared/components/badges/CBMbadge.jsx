// src/shared/components/badges/CBMBadge.jsx
import React from "react";
import { cn } from "@/lib/utils";

const badgeColors = {
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-gray-100 text-gray-800",
};

export function CBMBadge({ children, color = "gray", className = "" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        badgeColors[color],
        className,
      )}
    >
      {children}
    </span>
  );
}

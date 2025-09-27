//src/shared/components/buttons/CBMButton.jsx
import React from "react";
import { cn } from "@/lib/utils";

// 📌 Style centralisé
const base =
  "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  primary: "bg-cbm-blue text-white hover:bg-cbm-accent focus:ring-cbm-blue",
  ghost: "bg-transparent hover:bg-gray-100 text-cbm-blue",
  danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
};

const sizes = {
  sm: "px-3 py-1 text-sm rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-5 py-2.5 text-base rounded-xl",
};

export default function CBMButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

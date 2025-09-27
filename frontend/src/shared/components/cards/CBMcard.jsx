// src/shared/components/cards/CBMCard.jsx
import React from "react";
import { cn } from "@/lib/utils";

export function CBMCard({ className, ...props }) {
  return <div className={cn("rounded-xl border bg-white shadow-sm", className)} {...props} />;
}

export function CBMCardHeader({ className, ...props }) {
  return <div className={cn("p-4 border-b", className)} {...props} />;
}

export function CBMCardTitle({ className, ...props }) {
  return <h2 className={cn("text-xl font-semibold", className)} {...props} />;
}

export function CBMCardContent({ className, ...props }) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CBMCardFooter({ className, ...props }) {
  return <div className={cn("p-4 border-t", className)} {...props} />;
}

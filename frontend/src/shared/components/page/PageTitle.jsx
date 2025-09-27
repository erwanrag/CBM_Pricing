// src/shared/components/page/PageTitle.jsx
import React from "react";
import { Typography } from "@mui/material";

export default function PageTitle({ children, icon = null, subtitle = null }) {
  return (
    <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
      <div>
        <div className="flex items-center gap-3">
          {icon && <div className="text-cbm-blue">{icon}</div>}
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {children}
          </Typography>
        </div>
        {subtitle && (
          <Typography variant="body2" className="text-gray-600 mt-1">
            {subtitle}
          </Typography>
        )}
      </div>
    </div>
  );
}

// src/shared/components/tables/CBMDataGridWrapper.jsx
import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Typography } from "@mui/material";
import GlobalSkeleton from "@/shared/components/skeleton/GlobalSkeleton";

export default function CBMDataGridWrapper({
  rows,
  columns,
  loading = false,
  title = "",
  pageSize = 25,
  pageSizeOptions = [25, 50, 100],
  sx = {},
  ...props
}) {
  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      {title && (
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          {title}
        </Typography>
      )}

      {loading ? (
        <GlobalSkeleton height="50vh" />
      ) : (
        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          pageSize={pageSize}
          rowsPerPageOptions={pageSizeOptions}
          disableSelectionOnClick
          disableColumnFilter
          sx={{
            borderRadius: 2,
            border: "1px solid #e0e0e0",
            fontFamily: "'Inter', sans-serif",
            backgroundColor: "#fff",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f9fafb",
              fontWeight: "bold",
            },
            "& .MuiDataGrid-cell": {
              whiteSpace: "normal",
              wordBreak: "break-word",
              py: 1,
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "#f3f4f6",
            },
            ...sx,
          }}
          {...props}
        />
      )}
    </Box>
  );
}

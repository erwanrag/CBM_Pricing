// 📁 src/components/ui/ExportExcelButton.jsx
import * as XLSX from "xlsx";
import { Button } from "@mui/material";

export default function ExportExcelButton({ data, fileName = "export.xlsx", children, ...props }) {
  const handleClick = () => {
    if (!data || !data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Feuille1");
    XLSX.writeFile(wb, fileName);
  };

  return (
    <Button variant="contained" color="success" onClick={handleClick} {...props}>
      {children || "Exporter vers Excel"}
    </Button>
  );
}

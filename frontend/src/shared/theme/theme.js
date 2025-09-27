// src/shared/theme/theme.js

import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import { frFR } from "@mui/material/locale";

// Couleurs CBM d'après le site officiel
const cbmBlue = "#1b365d"; // Bleu foncé CBM
const cbmSecondary = "#f9fafb"; // Gris très clair (bg)
const cbmAccent = "#005b96"; // Bleu plus lumineux (accent)
const cbmYellow = "#fff8dc"; // Jaune clair pour surbrillance
const cbmBorder = "#e0e0e0"; // Gris bordure claire

let theme = createTheme(
  {
    palette: {
      mode: "light",
      primary: { main: cbmBlue },
      secondary: { main: cbmSecondary },
      background: {
        default: cbmSecondary,
        paper: "#ffffff",
      },
      warning: { main: cbmYellow },
      info: { main: cbmAccent },
    },
    typography: {
      fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
      h1: { fontSize: "2.5rem", fontWeight: 700 },
      h2: { fontSize: "2rem", fontWeight: 600 },
      h3: { fontSize: "1.75rem", fontWeight: 600 },
      h4: { fontSize: "1.5rem", fontWeight: 500 },
      h5: { fontSize: "1.25rem", fontWeight: 500 },
      h6: { fontSize: "1rem", fontWeight: 500 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: "12px",
            fontWeight: 600,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: {
            borderRadius: "16px",
          },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            borderRadius: "12px",
            border: `1px solid ${cbmBorder}`,
            fontFamily: "'Inter', sans-serif",
          },
        },
      },
    },
  },
  frFR,
);

theme = responsiveFontSizes(theme);

const LAYOUT = {
  HEADER_HEIGHT: 64,
  SIDEBAR_WIDTH: 240,
};

export default theme;
export { LAYOUT };

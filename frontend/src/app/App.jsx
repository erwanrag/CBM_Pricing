// src/app/App.jsx
import AppRouter from "@/app/routes/AppRouter";
import { AuthProvider } from "@/context/auth/AuthProvider";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ErrorBoundary from "@/shared/components/error/ErrorBoundary"; 
import theme from "@/shared/theme/theme";

function App() {

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ErrorBoundary fallback={<div>❌ Une erreur est survenue dans l'application.</div>}>
          <AppRouter />
        </ErrorBoundary>
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </ThemeProvider>
  );
}


export default App;

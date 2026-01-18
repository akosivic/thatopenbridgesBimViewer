import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n' // Import i18n configuration
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles'; // Import ThemeProvider
import { createTheme } from '@mui/material/styles';
import App from './App.tsx';
import WorldViewer from './worldviewer/WorldViewer.tsx';
import { initAuthGuard } from './auth/auth-guard.ts';

// Create the custom theme
const theme = createTheme({
  typography: {
    fontFamily: "'Roboto', 'Hiragino Sans', 'Yu Gothic UI', 'Hiragino Kaku Gothic ProN', sans-serif",
  },
});

// Initialize app with auth check
async function initApp() {
  // Check authentication first
  const user = await initAuthGuard();
  if (!user) {
    // User is being redirected to login, stop initialization
    return;
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider theme={theme}> {/* Apply the custom theme */}
        <BrowserRouter>
          <Routes>
            <Route path="/ws/node/bimviewer/" element={<App />} />
            <Route path="/ws/node/bimviewer/worldviewer" element={<WorldViewer />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </StrictMode>
  );
}

initApp();

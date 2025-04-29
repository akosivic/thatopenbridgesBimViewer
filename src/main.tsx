import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles'; // Import ThemeProvider
import { createTheme } from '@mui/material/styles';

// Create the custom theme
const theme = createTheme({
  typography: {
    fontFamily: "'Roboto', 'Hiragino Sans', 'Yu Gothic UI', 'Hiragino Kaku Gothic ProN', sans-serif",
  },
  root: {
    fontFamily: "'Roboto', 'Hiragino Sans', 'Yu Gothic UI', 'Hiragino Kaku Gothic ProN', sans-serif"
  }
});


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}> {/* Apply the custom theme */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);

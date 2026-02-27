
// import './App.css'
// Change this line in App.tsx
import HeaderComponent from '../components/HeaderComponent'; // Ensure the casing matches the actual file name
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme } from '@mui/material/styles';
import { WorldViewerComponent } from '../components/WorldViewerComponent';
import { useAuth } from '../components/common/authentication';
import { Navigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';

const theme = createTheme({
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: 'transparent !important',
          background: 'transparent !important',
        },
        html: {
          backgroundColor: 'transparent !important',
          background: 'transparent !important',
        }
      }
    }
  }
});

function WorldViewer() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight="100vh"
          flexDirection="column"
          gap={2}
        >
          <CircularProgress />
          <Typography variant="h6">{t('loading')}</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/ws/node/bimviewer/" replace />;
  }

  // Show the WorldViewer if authenticated
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ 
        height: '100vh', 
        width: '100vw', 
        background: 'transparent',
        backgroundColor: 'transparent',
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }}>
        <HeaderComponent />
        <WorldViewerComponent />
      </div>
      {/* rest of your app */}
    </ThemeProvider>
  )
}

export default WorldViewer;

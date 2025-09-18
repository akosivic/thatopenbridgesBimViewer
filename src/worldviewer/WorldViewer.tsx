
// import './App.css'
// Change this line in App.tsx
import HeaderComponent from '../components/HeaderComponent'; // Ensure the casing matches the actual file name
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme } from '@mui/material/styles';
import { WorldViewerComponent } from '../components/WorldViewerComponent';

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

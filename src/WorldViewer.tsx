
// import './App.css'
// Change this line in App.tsx
import HeaderComponent from './components/HeaderComponent'; // Ensure the casing matches the actual file name
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme } from '@mui/material/styles';
import { WorldViewerComponent } from './components/WorldViewerComponent';
import FooterComponent from './components/FooterComponent'; // Ensure the casing matches the actual file name

const theme = createTheme();

function App() {

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HeaderComponent />
      <WorldViewerComponent />
      <FooterComponent />
      {/* rest of your app */}
    </ThemeProvider>
  )
}

export default App

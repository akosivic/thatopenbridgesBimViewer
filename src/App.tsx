
// import './App.css'
// Change this line in App.tsx
import HeaderComponent from './components/common/HeaderComponent'; // Ensure the casing matches the actual file name
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme } from '@mui/material/styles';
import { WorldViewerComponent } from './components/common/WorldViewerComponent';

const theme = createTheme();

function App() {

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HeaderComponent />
      <WorldViewerComponent />
      {/* rest of your app */}
    </ThemeProvider>
  )
}

export default App

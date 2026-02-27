import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import Divider from '@mui/material/Divider';

import HeaderComponent from './components/HeaderComponent';
import LoginButtonComponent from './components/LoginButtonComponent';
import { useAuth } from './components/common/authentication';
import { Navigate } from 'react-router-dom';
import { JSX } from 'react';
import { useTranslation } from 'react-i18next';

// Styled component for the container
const StyledBox = styled(Box)({
  display: 'flex',
  alignItems: 'center', // aligns items horizontally center
  justifyContent: 'center',
  minHeight: '100vh',
  gap: '16px', // space between elements
});

function App(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <StyledBox>
        <HeaderComponent />
        <StyledBox>
          <Typography
            variant="h6"
            component="h6"
            sx={{
              cursor: 'default',
            }}
          >
            {t('loading')}
          </Typography>
        </StyledBox>
      </StyledBox>
    );
  }

  // Redirect to WorldViewer if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/ws/node/bimviewer/worldviewer" replace />;
  }

  // Show login screen if not authenticated
  return (
    <StyledBox>
      <HeaderComponent />
      <StyledBox>
        <Typography
          variant="h5"
          component="h5"
          sx={{
            cursor: 'default',
          }}
        >
          {t('bimManager')}
        </Typography>
        <Divider orientation="vertical" flexItem />
        <LoginButtonComponent />
      </StyledBox>
    </StyledBox>
  );
}

export default App;
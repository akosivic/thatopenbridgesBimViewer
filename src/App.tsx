import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import Divider from '@mui/material/Divider';

import FooterComponent from './components/FooterComponent';
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
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  if (isAuthenticated) {
    return <Navigate to="/worldviewer" />;
  }

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
      <FooterComponent />
    </StyledBox>
  );
}

export default App;
import React from 'react';
import Button from '@mui/material/Button';
import { login } from '../components/common/authentication';
import { useTranslation } from 'react-i18next';

// Login button component with MSAL
const LoginButton: React.FC = () => {
  const { t } = useTranslation();

  // Handle login action
  const handleLogin = (): void => {
    login('/worldviewer');
  };

  return (
    <Button
      variant="contained"
      onClick={handleLogin}
      sx={{
        minWidth: '120px',
        textTransform: 'none',
      }}
    >
      {t('login')}
    </Button>
  );
};

export default LoginButton;
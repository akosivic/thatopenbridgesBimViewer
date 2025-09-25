import React, { useState } from 'react';
import Button from '@mui/material/Button';
import { login } from '../components/common/authentication';
import { useTranslation } from 'react-i18next';
import LoginForm from './LoginForm';

// Login button component with Loytec authentication
const LoginButton: React.FC = () => {
  const { t } = useTranslation();
  const [showLoginForm, setShowLoginForm] = useState(false);

  const handleLoginSuccess = async (sessionId: string, username: string, authResponse?: any) => {
    try {
      // Store the session information using the authentication service
      await login(sessionId, username, authResponse);
      
      // Redirect to the BIM viewer after successful login
      window.location.href = '/ws/node/bimviewer/worldviewer';
    } catch (error) {
      console.error('Login success handling failed:', error);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        onClick={() => setShowLoginForm(true)}
        sx={{
          minWidth: '120px',
          textTransform: 'none',
        }}
      >
        {t('login')}
      </Button>

      <LoginForm
        open={showLoginForm}
        onClose={() => setShowLoginForm(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
};

export default LoginButton;
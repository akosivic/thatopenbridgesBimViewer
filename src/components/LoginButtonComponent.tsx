import React, { useState } from 'react';
import Button from '@mui/material/Button';
import { login, useAuth } from '../components/common/authentication';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LoginForm from './LoginForm';
import { debugError } from "../utils/debugLogger";

// Login button component with Loytec authentication
const LoginButton: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [showLoginForm, setShowLoginForm] = useState(false);

  const handleLoginSuccess = async (sessionId: string, username: string, authResponse?: any) => {
    try {
      // Store the session information using the authentication service
      await login(sessionId, username, authResponse);
      
      // Refresh auth state to trigger App.tsx redirection
      await refreshAuth();
      
      // Close the login form
      setShowLoginForm(false);
      
      // Navigate to WorldViewer (App.tsx will handle this via Navigate component)
      navigate('/ws/node/bimviewer/worldviewer', { replace: true });
    } catch (error) {
      debugError('Login success handling failed:', error);
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

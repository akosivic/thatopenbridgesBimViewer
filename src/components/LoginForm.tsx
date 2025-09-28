import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  CircularProgress,
  Typography,
  FormControlLabel,
  Checkbox,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import loytecAuthService from '../services/loytecAuth';
import { LoginCredentials } from '../types/auth';
import { getAppConfig } from '../config/appConfig';

interface LoginFormProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess: (sessionId: string, username: string, authResponse?: any) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ open, onClose, onLoginSuccess }) => {
  const { t } = useTranslation();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loytecUrl, setLoytecUrl] = useState('');

  const config = getAppConfig();

  useEffect(() => {
    if (open) {
      // Load saved credentials if available
      const savedUsername = localStorage.getItem('loytec_username');
      const savedRememberMe = localStorage.getItem('loytec_remember_me') === 'true';
      
      if (savedUsername && savedRememberMe) {
        setCredentials(prev => ({ ...prev, username: savedUsername }));
        setRememberMe(true);
      }

      setLoytecUrl(config.loytecBaseUrl);
    }
  }, [open, config.loytecBaseUrl]);

  const handleInputChange = (field: keyof LoginCredentials) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      setError(t('pleaseEnterCredentials') || 'Please enter both username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loytecAuthService.authenticate(credentials);
      
      if (result.success && result.sessionId) {
        // Save credentials if remember me is checked
        if (rememberMe) {
          localStorage.setItem('loytec_username', credentials.username);
          localStorage.setItem('loytec_remember_me', 'true');
        } else {
          localStorage.removeItem('loytec_username');
          localStorage.removeItem('loytec_remember_me');
        }

        // Get the actual username from Loytec response if available
        const actualUsername = result.loytecResponse?.sessUser || credentials.username;
        
        onLoginSuccess(result.sessionId, actualUsername, result);
        handleClose();
      } else {
        // Handle specific Loytec authentication failures
        let errorMessage = result.error || t('loginFailed') || 'Login failed';
        
        if (result.loytecResponse?.authFail && result.loytecResponse.authFail.length > 0) {
          errorMessage = `Authentication failed: ${result.loytecResponse.authFail.join(', ')}`;
        } else if (result.loytecResponse?.loginState !== 2 || !result.loytecResponse?.loggedIn) {
          errorMessage = `Login failed: Invalid login state`;
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loginError') || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCredentials({ username: '', password: '' });
    setError(null);
    setLoading(false);
    setShowPassword(false);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            {t('loginToLoytec') || 'Login to Loytec System'}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setShowAdvanced(!showAdvanced)}
            title={t('advancedSettings') || 'Advanced Settings'}
          >
            <SettingsIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <>
          {/* Advanced Settings */}
          {showAdvanced && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <TextField
                fullWidth
                label={t('loytecServerUrl') || 'Loytec Server URL'}
                value={loytecUrl}
                onChange={(e) => setLoytecUrl(e.target.value)}
                helperText={t('serverUrlHelp') || 'Configure the Loytec system base URL'}
                variant="outlined"
                size="small"
              />
            </Box>
          )}

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={t('username') || 'Username'}
            value={credentials.username}
            onChange={handleInputChange('username')}
            margin="normal"
            required
            autoComplete="username"
            disabled={loading}
            variant="outlined"
          />

          <TextField
            fullWidth
            label={t('password') || 'Password'}
            type={showPassword ? 'text' : 'password'}
            value={credentials.password}
            onChange={handleInputChange('password')}
            margin="normal"
            required
            autoComplete="current-password"
            disabled={loading}
            variant="outlined"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
            }
            label={t('rememberMe') || 'Remember username'}
            sx={{ mt: 1 }}
          />
        </Box>
        </>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          {t('cancel') || 'Cancel'}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !credentials.username || !credentials.password}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? (t('loggingIn') || 'Logging in...') : (t('login') || 'Login')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoginForm;
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Box, Button, MenuItem, Select } from '@mui/material';
import SvgIcon from '@mui/material/SvgIcon';
import Divider from '@mui/material/Divider';
import { logout } from './common/Authentication';
import AuthGuard from './common/AuthGuard';
import { useTranslation } from 'react-i18next';

const HeaderComponent = () => {
  const { t, i18n } = useTranslation();
  
  const handleLanguageChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    i18n.changeLanguage(event.target.value as string);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function BridgesIcon(props: any) {
    return (
      <SvgIcon {...props} viewBox='0 0 176 49'>
        <path fillRule="evenodd" fill="rgb(255, 255, 255)" d="M18.86,0l1.71,14H14.73L16.44,0H16L0,39.71H11.57l.54-4.37H23.19l.54,4.37H35.3L19.33,0ZM13,28.48l1.3-10.59h6.81l1.3,10.59ZM52.68,15.59A8.89,8.89,0,0,0,47,17.87l-.09,0v-12l-2.87.91v25.5a11.12,11.12,0,0,0,5.39,1.27c5.46,0,8.33-4.31,8.33-10.29C57.77,19.58,56.15,15.59,52.68,15.59ZM49.81,31.12a5.86,5.86,0,0,1-2.89-.76V20.14A6.09,6.09,0,0,1,51,18.25c2.47,0,3.89,1.92,3.89,5.95,0,4.94-2.24,6.91-5.07,6.91Zm10.24-8.65h8.63v2.85H60Zm19.88-6.86.35,3.32-.2.22a5.39,5.39,0,0,0-2-.36,4,4,0,0,0-3.58,1.77V33H71.62V20.87a6.21,6.21,0,0,0-1-3.85l2.59-1.44a4.55,4.55,0,0,1,1.15,2.66l.1.07a6.2,6.2,0,0,1,5.44-2.72Zm4,.87,2.87-.87V33H83.93Zm2.83-2.91-2.83.86V11.51l2.83-.86Zm17.79-7.7-2.74.91v9.28a7.54,7.54,0,0,0-2.62-.47c-5.46,0-8.3,4.31-8.3,10.31,0,3.63,1.65,7.63,5.09,7.63a8.64,8.64,0,0,0,5.69-2.35l.13.07a6.33,6.33,0,0,0,1.73,2.53L105.85,32a5,5,0,0,1-1.33-3.79Zm-2.76,23.07a6.07,6.07,0,0,1-4.11,1.93c-2.5,0-3.85-2-3.85-5.95,0-4.87,2.23-6.87,5.06-6.87a5.81,5.81,0,0,1,2.9.81Zm30.87,2.12c-3.88,0-5.31-2.93-5.31-6.52h10.1l.4-.38c0-4.42-1.57-8.33-6.16-8.33-4.23,0-7.21,3.73-7.21,9.36s3,8.32,7.91,8.32a11,11,0,0,0,5.49-1.38l-.76-2.28A10,10,0,0,1,132.66,31.06Zm-1.06-12.9c1.9,0,3.29,1.62,3.29,4.07h-7.41c.43-2.63,2-4.08,4.12-4.08ZM151.81,28c0,3.88-2.93,5.57-6.1,5.57a7.38,7.38,0,0,1-4.59-1.3l.84-2.34a6.29,6.29,0,0,0,4,1.41,2.89,2.89,0,0,0,3.14-2.66c0-1.61-1.22-2.24-3.41-3.08s-4.11-2.07-4.11-4.66c0-3.36,2.47-5.29,5.83-5.29a8.51,8.51,0,0,1,3.58.8l-.85,2.47a6,6,0,0,0-3.27-1.05,2.41,2.41,0,0,0-2.59,2.34c0,1.69.91,2.28,3.1,3.12,2.46,1,4.42,2,4.42,4.67ZM118.45,17.4a8.17,8.17,0,0,0-2.79-.65c-4.74,0-7.5,3.74-7.5,9.45,0,3.47,1.92,6.89,5.12,6.89a7,7,0,0,0,5.08-1.86l.08.05v1.17c0,3.82-2.1,5.18-4.06,5.18-1.72,0-2.25-.82-3.12-1.44L109,37.8c1.61,1.49,2.64,2.23,5.17,2.23,4.36,0,6.86-2.83,7-7.54h0V14.94l-2.74.91Zm-3.84,13.29c-2.32,0-3.71-1.53-3.71-5.3,0-4.63,2.2-6.53,4.84-6.53a5.22,5.22,0,0,1,2.71.88v9.11a5.67,5.67,0,0,1-3.84,1.83Z"></path>
      </SvgIcon >
    );
  }

  const handleLogOff = () => {
    logout();
  };

  return (
    <AppBar position="sticky" sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%'
    }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BridgesIcon sx={{ width: '6em', height: '2em' }} />
          <Divider orientation="vertical" flexItem>
          </Divider>
          <Typography variant="h6" component="div" sx={{
            cursor: 'default',
            marginLeft: '1em'
          }}>
            {t('bimManager')}
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Select
            value={i18n.language}
            onChange={handleLanguageChange as any}
            size="small"
            sx={{ 
              color: 'white', 
              mr: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' },
              '& .MuiSvgIcon-root': { color: 'white' }
            }}
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="ja">日本語</MenuItem>
          </Select>
          <AuthGuard>
            <Button color="inherit" onClick={handleLogOff}>
              {t('logout')}
            </Button>
          </AuthGuard>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default HeaderComponent;
import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { Theme } from '@mui/material/styles';

interface FooterProps {
  className?: string;
}

const FooterComponent: React.FC<FooterProps> = ({ className }) => {
  return (
    <Box
      component="footer"
      className={className}
      sx={{
        py: 1,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme: Theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[200]
            : theme.palette.grey[800],
        position: 'fixed',
        bottom: 0,
        width: '100%'
      }}
    >
      <Container maxWidth="sm">
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
        >
          © {new Date().getFullYear()} b-ridges | BIM Manager. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default FooterComponent;

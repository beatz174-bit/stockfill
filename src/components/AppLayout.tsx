import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { NavigationBar } from './NavigationBar';

export const AppLayout = () => (
  <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
    <NavigationBar />
    <Box component="main" sx={{ flexGrow: 1 }}>
      <Outlet />
    </Box>
  </Box>
);

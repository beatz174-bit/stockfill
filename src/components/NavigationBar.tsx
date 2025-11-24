import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/start', label: 'Start' },
  { to: '/pick-lists', label: 'Pick Lists' },
  { to: '/products', label: 'Products' },
  { to: '/categories', label: 'Categories' },
  { to: '/areas', label: 'Areas' },
  { to: '/data', label: 'Import/Export' },
  { to: '/scan', label: 'Scan' },
];

const isActivePath = (currentPath: string, target: string) =>
  currentPath === target || currentPath.startsWith(`${target}/`);

export const NavigationBar = () => {
  const location = useLocation();

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ gap: 2, overflowX: 'auto' }}>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}
        >
          StockFill
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {navLinks.map((link) => {
            const active = isActivePath(location.pathname, link.to);
            return (
              <Button
                key={link.to}
                component={RouterLink}
                to={link.to}
                color="inherit"
                sx={{
                  minWidth: 'fit-content',
                  opacity: active ? 1 : 0.8,
                  textTransform: 'none',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {link.label}
              </Button>
            );
          })}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

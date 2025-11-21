import { Button, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export const HomeScreen = () => (
  <Container sx={{ py: 4 }}>
    <Typography variant="h4" gutterBottom>
      StockFill
    </Typography>
    <Stack spacing={2}>
      <Button component={RouterLink} to="/start" variant="contained">
        Create Pick List
      </Button>
      <Button component={RouterLink} to="/pick-lists" variant="outlined">
        View & Edit Pick Lists
      </Button>
      <Button component={RouterLink} to="/products" variant="outlined">
        Manage Products
      </Button>
      <Button component={RouterLink} to="/areas" variant="outlined">
        Manage Areas
      </Button>
      <Button component={RouterLink} to="/scan" variant="outlined">
        Scan Barcode
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Product data provided by Open Food Facts (openfoodfacts.org)
      </Typography>
    </Stack>
  </Container>
);

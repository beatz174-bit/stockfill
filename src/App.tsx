import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DBProvider } from './context/DBProvider';
import { AppLayout } from './components/AppLayout';
import { HomeScreen } from './screens/HomeScreen';
import { StartPickListScreen } from './screens/StartPickListScreen';
import { PickListsScreen } from './screens/PickListsScreen';
import { ActivePickListScreen } from './screens/ActivePickListScreen';
import { ManageProductsScreen } from './screens/ManageProductsScreen';
import { ManageAreasScreen } from './screens/ManageAreasScreen';
import { ManageCategoriesScreen } from './screens/ManageCategoriesScreen';
import { BarcodeScannerScreen } from './screens/BarcodeScannerScreen';
import { useServiceWorker } from './hooks/useServiceWorker';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0d6efd',
    },
  },
});

const AppRoutes = () => {
  useServiceWorker();
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/start" element={<StartPickListScreen />} />
        <Route path="/pick-lists" element={<PickListsScreen />} />
        <Route path="/pick-lists/:id" element={<ActivePickListScreen />} />
        <Route path="/products" element={<ManageProductsScreen />} />
        <Route path="/categories" element={<ManageCategoriesScreen />} />
        <Route path="/areas" element={<ManageAreasScreen />} />
        <Route path="/scan" element={<BarcodeScannerScreen />} />
      </Route>
    </Routes>
  );
};

export const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DBProvider>
        <AppRoutes />
      </DBProvider>
    </BrowserRouter>
  </ThemeProvider>
);

import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DBProvider } from './context/DBProvider';
import { AppLayout } from './components/AppLayout';
import React, { Suspense, lazy } from 'react';
import { useServiceWorker } from './hooks/useServiceWorker';

const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const StartPickListScreen = lazy(() => import('./screens/StartPickListScreen'));
const PickListsScreen = lazy(() => import('./screens/PickListsScreen'));
const ActivePickListScreen = lazy(() => import('./screens/ActivePickListScreen'));
const ManageProductsScreen = lazy(() => import('./screens/ManageProductsScreen'));
const ManageAreasScreen = lazy(() => import('./screens/ManageAreasScreen'));
const ManageCategoriesScreen = lazy(() => import('./screens/ManageCategoriesScreen'));
const BarcodeScannerScreen = lazy(() => import('./screens/BarcodeScannerScreen'));
const ImportExportScreen = lazy(() => import('./screens/ImportExportScreen'));

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
    <Suspense fallback={<div>Loading…</div>}>
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
          <Route path="/data" element={<ImportExportScreen />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <DBProvider>
        <AppRoutes />
      </DBProvider>
    </BrowserRouter>
  </ThemeProvider>
);

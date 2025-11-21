import { Container, Typography } from '@mui/material';
import { useState } from 'react';
import { BarcodeScannerView } from '../components/BarcodeScannerView';

export const BarcodeScannerScreen = () => {
  const [lastCode, setLastCode] = useState('');

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Barcode Scanner
      </Typography>
      <BarcodeScannerView onDetected={(code) => setLastCode(code)} />
      {lastCode ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Last detected: {lastCode}
        </Typography>
      ) : null}
    </Container>
  );
};

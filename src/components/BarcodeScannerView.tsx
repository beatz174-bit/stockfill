import { useEffect } from 'react';
import { Alert, Card, CardContent, Typography } from '@mui/material';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

interface BarcodeScannerViewProps {
  onDetected?: (code: string) => void;
}

export const BarcodeScannerView = ({ onDetected }: BarcodeScannerViewProps) => {
  const { videoRef, result } = useBarcodeScanner();

  useEffect(() => {
    if (result.code && onDetected) {
      onDetected(result.code);
    }
  }, [onDetected, result.code]);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          Scan Barcode
        </Typography>
        <video ref={videoRef} style={{ width: '100%', borderRadius: 8 }} />
        {result.code ? <Alert severity="success">Detected {result.code}</Alert> : null}
        {result.error ? <Alert severity="error">{result.error}</Alert> : null}
      </CardContent>
    </Card>
  );
};

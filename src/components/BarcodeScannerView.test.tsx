import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BarcodeScannerView } from './BarcodeScannerView';

const mockUseBarcodeScanner = vi.fn();

vi.mock('../hooks/useBarcodeScanner', () => ({
  useBarcodeScanner: () => mockUseBarcodeScanner(),
}));

describe('BarcodeScannerView', () => {
  it('notifies when a barcode is detected and shows success alert', () => {
    const onDetected = vi.fn();
    const videoRef = { current: document.createElement('video') } as React.RefObject<HTMLVideoElement>;

    mockUseBarcodeScanner.mockReturnValue({
      videoRef,
      result: { code: '12345', error: null },
    });

    render(<BarcodeScannerView onDetected={onDetected} />);

    expect(screen.getByText(/detected 12345/i)).toBeVisible();
    expect(onDetected).toHaveBeenCalledWith('12345');
  });

  it('renders an error alert when scanning fails', () => {
    const videoRef = { current: document.createElement('video') } as React.RefObject<HTMLVideoElement>;

    mockUseBarcodeScanner.mockReturnValue({
      videoRef,
      result: { code: '', error: 'Camera access denied' },
    });

    render(<BarcodeScannerView />);

    expect(screen.getByText(/camera access denied/i)).toBeVisible();
  });
});

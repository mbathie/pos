'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ScanBarcode } from 'lucide-react';

/**
 * Barcode Scanner Component
 * Supports both 1D barcodes and QR codes
 * Scanner opens in a dialog for better UX
 */
export default function BarcodeScanner({
  value = '',
  onChange,
  placeholder = 'Scan or enter barcode...',
  disabled = false
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const codeReaderRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const lastScannedRef = useRef(null);
  const lastScanTimeRef = useRef(0);

  // Keep onChange ref updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Cleanup camera resources
  const stopCamera = useCallback(() => {
    console.log('Stopping barcode scanner camera...');

    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (e) {
        console.log('Error stopping controls:', e);
      }
      controlsRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped:', track.kind);
      });
      videoRef.current.srcObject = null;
    }

    codeReaderRef.current = null;
    setIsScanning(false);
  }, []);

  // Start camera and scanning
  const startCamera = useCallback(async () => {
    if (disabled || !videoRef.current) {
      console.log('Cannot start camera: disabled or no video ref');
      return;
    }

    // Stop any existing camera first
    stopCamera();

    console.log('Starting barcode scanner...');
    setIsInitializing(true);
    setCameraError(null);
    setIsScanning(false);

    try {
      // Configure hints for all common barcode formats
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.CODE_128,
        BarcodeFormat.ITF,
        BarcodeFormat.CODABAR,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.PDF_417,
        BarcodeFormat.AZTEC,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints);
      codeReaderRef.current = codeReader;

      // Get available video devices
      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      console.log('Available cameras:', videoInputDevices.length);

      if (videoInputDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      // Prefer back camera for barcode scanning
      const backCamera = videoInputDevices.find(device =>
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );

      const selectedDeviceId = backCamera?.deviceId || videoInputDevices[0].deviceId;
      console.log('Selected camera:', backCamera ? 'Back' : 'Default');

      const constraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      };

      console.log('Starting decode from constraints...');

      const controls = await codeReader.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText();
            const format = result.getBarcodeFormat();
            const now = Date.now();

            // Prevent duplicate scans of the same barcode within 2 seconds
            if (text === lastScannedRef.current && now - lastScanTimeRef.current < 2000) {
              console.log('Ignoring duplicate scan:', text);
              return;
            }

            console.log('Barcode detected:', text, 'Format:', format);

            // Record this scan
            lastScannedRef.current = text;
            lastScanTimeRef.current = now;

            // Stop camera immediately before closing dialog
            stopCamera();

            // Update value
            onChangeRef.current?.(text);

            // Close dialog after a tiny delay to ensure cleanup
            setTimeout(() => {
              setDialogOpen(false);
            }, 50);
          }
        }
      );

      controlsRef.current = controls;
      setIsScanning(true);
      setIsInitializing(false);
      console.log('Scanner ready and scanning');

    } catch (err) {
      console.error('Camera initialization error:', err);
      setCameraError(err.message || 'Unable to access camera');
      setIsInitializing(false);
    }
  }, [disabled, stopCamera]);

  // Handle dialog open
  const handleOpenDialog = useCallback(() => {
    // Clear last scanned when opening dialog (allow re-scanning same barcode)
    lastScannedRef.current = null;
    lastScanTimeRef.current = 0;
    setCameraError(null);
    setDialogOpen(true);
  }, []);

  // Handle dialog close
  const handleDialogChange = useCallback((open) => {
    if (!open) {
      stopCamera();
      setDialogOpen(false);
    }
  }, [stopCamera]);

  // Start camera when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      // Delay to ensure video element is mounted in DOM
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [dialogOpen, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleOpenDialog}
          disabled={disabled}
          className="cursor-pointer"
        >
          <ScanBarcode className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>

          <div className="relative bg-black aspect-[4/3]">
            {isInitializing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-2" />
                  <p className="text-white text-sm">Starting camera...</p>
                </div>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Scanning overlay */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-72 h-24 border-2 border-white/70 rounded-lg relative">
                  <div className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl"></div>
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr"></div>
                  <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl"></div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br"></div>
                  <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-primary/50 animate-pulse"></div>
                </div>
              </div>
            )}

            {/* Status indicator */}
            {isScanning && (
              <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                Position barcode in frame
              </div>
            )}

            {/* Error message */}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center px-4">
                  <p className="text-white mb-4">{cameraError}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={startCamera}
                    className="cursor-pointer"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 pt-2 text-center">
            <p className="text-sm text-muted-foreground">
              Hold the barcode steady within the frame
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

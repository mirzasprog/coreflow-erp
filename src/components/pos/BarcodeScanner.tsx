import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, SwitchCamera, X } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      initScanner();
    }
    return () => {
      stopScanner();
    };
  }, [open]);

  const initScanner = async () => {
    try {
      setError(null);
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        startScanning(devices[0].id);
      } else {
        setError("No camera found on this device");
      }
    } catch (err) {
      setError("Camera permission denied or not available");
    }
  };

  const startScanning = async (cameraId: string) => {
    if (scannerRef.current) {
      await stopScanner();
    }

    const scanner = new Html5Qrcode("barcode-scanner-container");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          onScan(decodedText);
          handleClose();
        },
        () => {
          // Ignore QR code scan failures
        }
      );
      setIsScanning(true);
    } catch (err) {
      setError("Failed to start camera");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        // Ignore stop errors
      }
    }
    setIsScanning(false);
    scannerRef.current = null;
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    await startScanning(cameras[nextIndex].id);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-center">
              <X className="mb-2 h-12 w-12 text-destructive" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={initScanner} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div
                id="barcode-scanner-container"
                ref={containerRef}
                className="relative overflow-hidden rounded-lg bg-muted"
                style={{ minHeight: 280 }}
              />

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Point camera at barcode
                </p>
                {cameras.length > 1 && (
                  <Button variant="outline" size="sm" onClick={switchCamera}>
                    <SwitchCamera className="mr-2 h-4 w-4" />
                    Switch Camera
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

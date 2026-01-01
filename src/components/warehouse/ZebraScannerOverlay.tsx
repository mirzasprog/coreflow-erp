import { useState, useEffect } from 'react';
import { useZebraScanner, useBarcodeLookup, ScanResult } from '@/hooks/useZebraScanner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scan, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ZebraScannerOverlayProps {
  enabled?: boolean;
  onItemScanned?: (item: any) => void;
  showOverlay?: boolean;
}

export function ZebraScannerOverlay({ 
  enabled = true, 
  onItemScanned,
  showOverlay = true 
}: ZebraScannerOverlayProps) {
  const [lastScannedItem, setLastScannedItem] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  const { lookupItem, isLoading } = useBarcodeLookup();

  const handleScan = async (result: ScanResult) => {
    setScanError(null);
    setLastScannedItem(null);

    const item = await lookupItem(result.barcode);
    
    if (item) {
      setLastScannedItem(item);
      onItemScanned?.(item);
      toast.success(`Skeniran: ${item.name}`);
    } else {
      setScanError(`Artikal nije pronađen: ${result.barcode}`);
      toast.error(`Nepoznat barkod: ${result.barcode}`);
    }
  };

  const { lastScan, isScanning, buffer } = useZebraScanner({
    enabled,
    onScan: handleScan,
    minLength: 4,
    maxDelay: 50
  });

  const handleManualSubmit = async () => {
    if (!manualBarcode.trim()) return;
    
    await handleScan({
      barcode: manualBarcode.trim(),
      timestamp: new Date(),
      type: 'camera'
    });
    
    setManualBarcode('');
    setShowManualInput(false);
  };

  const clearLastScan = () => {
    setLastScannedItem(null);
    setScanError(null);
  };

  if (!showOverlay) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      {/* Scanner Status */}
      <Card className="shadow-lg border-2">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium">
                {enabled ? 'Zebra Skener Aktivan' : 'Skener Isključen'}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowManualInput(!showManualInput)}
            >
              <Scan className="h-4 w-4" />
            </Button>
          </div>

          {/* Scanning Indicator */}
          {isScanning && (
            <div className="mb-3 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm text-blue-600">Skeniranje...</span>
              </div>
              {buffer && (
                <code className="text-xs text-muted-foreground mt-1 block">
                  {buffer}
                </code>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="mb-3 p-2 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Pretražujem...</span>
              </div>
            </div>
          )}

          {/* Last Scanned Item */}
          {lastScannedItem && (
            <div className="mb-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{lastScannedItem.name}</p>
                    <p className="text-xs text-muted-foreground">{lastScannedItem.code}</p>
                    {lastScannedItem.lot_tracking && (
                      <Badge variant="outline" className="text-xs mt-1">LOT praćenje</Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearLastScan}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {scanError && (
            <div className="mb-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-600">{scanError}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={clearLastScan}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Manual Input */}
          {showManualInput && (
            <div className="flex gap-2">
              <Input
                placeholder="Unesite barkod..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                autoFocus
              />
              <Button size="sm" onClick={handleManualSubmit}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Last Scan Info */}
          {lastScan && !lastScannedItem && !scanError && (
            <div className="text-xs text-muted-foreground">
              Zadnji sken: {lastScan.barcode} ({lastScan.timestamp.toLocaleTimeString()})
            </div>
          )}

          {/* Instructions */}
          {!isScanning && !lastScannedItem && !scanError && !showManualInput && (
            <p className="text-xs text-muted-foreground text-center">
              Skenirajte barkod pomoću Zebra skenera ili kliknite ikonu za ručni unos
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ScanResult {
  barcode: string;
  timestamp: Date;
  type: 'keyboard' | 'camera' | 'serial';
}

interface UseZebraScannerOptions {
  enabled?: boolean;
  onScan?: (result: ScanResult) => void;
  minLength?: number;
  maxDelay?: number; // Max delay between keystrokes in ms (for keyboard wedge mode)
  prefixes?: string[]; // Optional barcode prefixes to filter
  suffixes?: string[]; // Optional barcode suffixes to filter
}

// Zebra MC3300 and similar devices work in "keyboard wedge" mode
// They simulate keyboard input, sending characters rapidly
export function useZebraScanner(options: UseZebraScannerOptions = {}) {
  const {
    enabled = true,
    onScan,
    minLength = 4,
    maxDelay = 50, // Zebra scanners typically send chars < 50ms apart
    prefixes = [],
    suffixes = []
  } = options;

  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [buffer, setBuffer] = useState('');
  
  const bufferRef = useRef('');
  const lastKeystrokeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processBarcode = useCallback((rawBarcode: string) => {
    let barcode = rawBarcode.trim();
    
    // Remove known prefixes
    for (const prefix of prefixes) {
      if (barcode.startsWith(prefix)) {
        barcode = barcode.slice(prefix.length);
        break;
      }
    }
    
    // Remove known suffixes
    for (const suffix of suffixes) {
      if (barcode.endsWith(suffix)) {
        barcode = barcode.slice(0, -suffix.length);
        break;
      }
    }

    if (barcode.length >= minLength) {
      const result: ScanResult = {
        barcode,
        timestamp: new Date(),
        type: 'keyboard'
      };
      
      setLastScan(result);
      onScan?.(result);
      return result;
    }
    return null;
  }, [minLength, prefixes, suffixes, onScan]);

  const clearBuffer = useCallback(() => {
    bufferRef.current = '';
    setBuffer('');
    setIsScanning(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKeystroke = now - lastKeystrokeRef.current;
      
      // If too much time passed, this is manual typing - reset buffer
      if (timeSinceLastKeystroke > maxDelay && bufferRef.current.length > 0) {
        clearBuffer();
      }

      // Ignore modifier keys and special keys
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.key.length > 1 && event.key !== 'Enter') return;

      // Check if we're in an input field - let user type normally if so
      const activeElement = document.activeElement;
      const isInputField = activeElement instanceof HTMLInputElement || 
                          activeElement instanceof HTMLTextAreaElement ||
                          activeElement?.getAttribute('contenteditable') === 'true';

      // For input fields, only intercept if it looks like rapid scanner input
      if (isInputField && timeSinceLastKeystroke > maxDelay) {
        return; // Let user type normally
      }

      lastKeystrokeRef.current = now;

      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (event.key === 'Enter') {
        // Enter key signals end of barcode
        if (bufferRef.current.length >= minLength) {
          event.preventDefault();
          event.stopPropagation();
          processBarcode(bufferRef.current);
        }
        clearBuffer();
      } else {
        // Add character to buffer
        bufferRef.current += event.key;
        setBuffer(bufferRef.current);
        setIsScanning(true);

        // If scanning started, prevent default to avoid typing in fields
        if (bufferRef.current.length > 2 && timeSinceLastKeystroke < maxDelay) {
          event.preventDefault();
          event.stopPropagation();
        }

        // Auto-clear buffer after delay (in case Enter is missed)
        timeoutRef.current = setTimeout(() => {
          if (bufferRef.current.length >= minLength) {
            processBarcode(bufferRef.current);
          }
          clearBuffer();
        }, 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, maxDelay, minLength, processBarcode, clearBuffer]);

  // Manual scan input (for testing or camera-based scanning)
  const manualScan = useCallback((barcode: string) => {
    const result: ScanResult = {
      barcode,
      timestamp: new Date(),
      type: 'camera'
    };
    setLastScan(result);
    onScan?.(result);
    return result;
  }, [onScan]);

  // Clear last scan
  const clearLastScan = useCallback(() => {
    setLastScan(null);
  }, []);

  return {
    lastScan,
    isScanning,
    buffer,
    manualScan,
    clearLastScan,
    clearBuffer
  };
}

// Hook to lookup item by barcode
export function useBarcodeLookup() {
  const [isLoading, setIsLoading] = useState(false);
  
  const lookupItem = useCallback(async (barcode: string) => {
    setIsLoading(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase
        .from('items')
        .select('id, code, name, barcode, selling_price, purchase_price, lot_tracking, require_lot_on_receipt')
        .or(`barcode.eq.${barcode},code.eq.${barcode}`)
        .eq('active', true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { lookupItem, isLoading };
}

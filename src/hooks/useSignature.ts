import { useState, useEffect } from 'react';

const SIGNATURE_STORAGE_KEY = 'user_digital_signature';

export function useSignature() {
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(SIGNATURE_STORAGE_KEY);
    if (stored) {
      setSavedSignature(stored);
    }
  }, []);

  const saveSignature = (signatureData: string) => {
    if (signatureData) {
      localStorage.setItem(SIGNATURE_STORAGE_KEY, signatureData);
      setSavedSignature(signatureData);
    }
  };

  const clearSavedSignature = () => {
    localStorage.removeItem(SIGNATURE_STORAGE_KEY);
    setSavedSignature(null);
  };

  return {
    savedSignature,
    saveSignature,
    clearSavedSignature
  };
}

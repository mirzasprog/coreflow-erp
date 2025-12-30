interface SignatureDisplayProps {
  signature: string | null;
  label?: string;
  showPlaceholder?: boolean;
}

export function SignatureDisplay({ 
  signature, 
  label = 'Potpis', 
  showPlaceholder = true 
}: SignatureDisplayProps) {
  if (!signature && !showPlaceholder) {
    return null;
  }

  return (
    <div className="signature-display">
      <p className="text-sm text-gray-500 mb-2">{label}</p>
      {signature ? (
        <div className="border-b border-gray-400 pb-2">
          <img 
            src={signature} 
            alt="Digitalni potpis" 
            className="max-w-[200px] h-auto"
            style={{ maxHeight: '80px' }}
          />
        </div>
      ) : (
        <div className="border-b border-gray-400 pb-2 h-16">
          <span className="text-xs text-gray-400">_____________________</span>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-1">Datum: {new Date().toLocaleDateString('hr-HR')}</p>
    </div>
  );
}

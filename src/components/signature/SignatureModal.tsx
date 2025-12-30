import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignatureCanvas } from './SignatureCanvas';
import { useSignature } from '@/hooks/useSignature';
import { FileDown, Pen, Save } from 'lucide-react';

interface SignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (signature: string | null) => void;
  title?: string;
  description?: string;
}

export function SignatureModal({
  open,
  onOpenChange,
  onConfirm,
  title = 'Digitalni potpis',
  description = 'Potpišite dokument prije generiranja'
}: SignatureModalProps) {
  const { savedSignature, saveSignature } = useSignature();
  const [currentSignature, setCurrentSignature] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('draw');

  useEffect(() => {
    if (open) {
      setCurrentSignature(savedSignature);
      if (savedSignature) {
        setActiveTab('saved');
      }
    }
  }, [open, savedSignature]);

  const handleSaveAndUse = () => {
    if (currentSignature) {
      saveSignature(currentSignature);
    }
    onConfirm(currentSignature);
    onOpenChange(false);
  };

  const handleSkip = () => {
    onConfirm(null);
    onOpenChange(false);
  };

  const handleUseSaved = () => {
    if (savedSignature) {
      onConfirm(savedSignature);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw">Nacrtaj novi</TabsTrigger>
            <TabsTrigger value="saved" disabled={!savedSignature}>
              Koristi spremljeni
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-4 mt-4">
            <SignatureCanvas
              onSave={setCurrentSignature}
              width={400}
              height={150}
            />
          </TabsContent>

          <TabsContent value="saved" className="space-y-4 mt-4">
            {savedSignature ? (
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground mb-2">Vaš spremljeni potpis:</p>
                <img 
                  src={savedSignature} 
                  alt="Spremljeni potpis" 
                  className="max-w-full h-auto border rounded bg-white"
                />
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nemate spremljeni potpis. Nacrtajte novi potpis.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            Preskoči potpis
          </Button>
          <div className="flex gap-2">
            {activeTab === 'saved' && savedSignature ? (
              <Button onClick={handleUseSaved}>
                <FileDown className="h-4 w-4 mr-2" />
                Koristi ovaj potpis
              </Button>
            ) : (
              <Button 
                onClick={handleSaveAndUse}
                disabled={!currentSignature}
              >
                <Save className="h-4 w-4 mr-2" />
                Spremi i koristi
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

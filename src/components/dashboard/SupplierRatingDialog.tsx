import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Star, ThumbsUp, MessageCircle, Truck } from 'lucide-react';
import { format } from 'date-fns';

interface SupplierRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: { id: string; name: string } | null;
}

interface RatingStarsProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  icon: React.ReactNode;
}

function RatingStars({ value, onChange, label, icon }: RatingStarsProps) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <Label className="text-sm font-medium">{label}</Label>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="transition-transform hover:scale-110"
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            onClick={() => onChange(star)}
          >
            <Star
              className={`h-8 w-8 ${
                star <= (hoverValue || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function SupplierRatingDialog({ open, onOpenChange, supplier }: SupplierRatingDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [qualityRating, setQualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [notes, setNotes] = useState('');

  // Fetch existing ratings
  const { data: ratings } = useQuery({
    queryKey: ['supplier-ratings', supplier?.id],
    queryFn: async () => {
      if (!supplier?.id) return [];
      const { data, error } = await supabase
        .from('supplier_ratings')
        .select('*')
        .eq('partner_id', supplier.id)
        .order('rating_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!supplier?.id && open
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!supplier?.id) throw new Error('No supplier selected');
      if (qualityRating === 0 || communicationRating === 0 || deliveryRating === 0) {
        throw new Error('Please rate all categories');
      }

      const { error } = await supabase
        .from('supplier_ratings')
        .insert({
          partner_id: supplier.id,
          quality_rating: qualityRating,
          communication_rating: communicationRating,
          delivery_rating: deliveryRating,
          notes: notes.trim() || null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-ratings'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers-with-performance'] });
      toast({ title: 'Ocjena spremljena', description: 'Ocjena dobavljača je uspješno spremljena.' });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Greška', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setQualityRating(0);
    setCommunicationRating(0);
    setDeliveryRating(0);
    setNotes('');
  };

  const averageRating = ratings && ratings.length > 0
    ? (ratings.reduce((acc, r) => acc + (r.quality_rating + r.communication_rating + r.delivery_rating) / 3, 0) / ratings.length).toFixed(1)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ocijeni dobavljača: {supplier?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Average Rating Display */}
          {averageRating && (
            <div className="rounded-lg bg-muted p-4 text-center">
              <div className="text-3xl font-bold text-primary">{averageRating}</div>
              <div className="text-sm text-muted-foreground">Prosječna ocjena ({ratings?.length} ocjena)</div>
            </div>
          )}

          {/* New Rating Form */}
          <div className="space-y-4">
            <h4 className="font-medium">Nova ocjena</h4>
            
            <RatingStars
              value={qualityRating}
              onChange={setQualityRating}
              label="Kvaliteta proizvoda"
              icon={<ThumbsUp className="h-4 w-4 text-blue-500" />}
            />

            <RatingStars
              value={communicationRating}
              onChange={setCommunicationRating}
              label="Komunikacija"
              icon={<MessageCircle className="h-4 w-4 text-green-500" />}
            />

            <RatingStars
              value={deliveryRating}
              onChange={setDeliveryRating}
              label="Pouzdanost isporuke"
              icon={<Truck className="h-4 w-4 text-orange-500" />}
            />

            <div className="space-y-2">
              <Label>Napomena (opcionalno)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dodaj komentar o dobavljaču..."
                rows={3}
                maxLength={500}
              />
            </div>

            <Button 
              onClick={() => saveMutation.mutate()} 
              disabled={saveMutation.isPending || qualityRating === 0 || communicationRating === 0 || deliveryRating === 0}
              className="w-full"
            >
              {saveMutation.isPending ? 'Spremanje...' : 'Spremi ocjenu'}
            </Button>
          </div>

          {/* Rating History */}
          {ratings && ratings.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Povijest ocjena</h4>
              <div className="max-h-48 space-y-2 overflow-auto">
                {ratings.slice(0, 5).map((rating) => (
                  <div key={rating.id} className="rounded border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4">
                        <span title="Kvaliteta">Q: {rating.quality_rating}★</span>
                        <span title="Komunikacija">C: {rating.communication_rating}★</span>
                        <span title="Isporuka">D: {rating.delivery_rating}★</span>
                      </div>
                      <span className="text-muted-foreground">
                        {format(new Date(rating.rating_date), 'dd.MM.yyyy')}
                      </span>
                    </div>
                    {rating.notes && (
                      <p className="mt-1 text-muted-foreground">{rating.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

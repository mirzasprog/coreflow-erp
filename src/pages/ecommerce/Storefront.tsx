import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus, Trash2, User, Package } from "lucide-react";
import { useRegisterCustomer } from "@/hooks/useEcommerceCustomers";
import { useCreateEcommerceOrder } from "@/hooks/useEcommerce";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface CartItem { id: string; name: string; price: number; quantity: number; vat_rate_id: string | null; vat_rate: number; }

export default function Storefront() {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const { data: items } = useQuery({
    queryKey: ['storefront-items', search],
    queryFn: async () => {
      let q = supabase.from('items').select('id, code, name, selling_price, description').eq('active', true).limit(50);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));
    },
  });

  const register = useRegisterCustomer();
  const createOrder = useCreateEcommerceOrder();

  const addToCart = (item: any) => {
    setCart(c => {
      const ex = c.find(x => x.id === item.id);
      if (ex) return c.map(x => x.id === item.id ? { ...x, quantity: x.quantity + 1 } : x);
      return [...c, { id: item.id, name: item.name, price: Number(item.selling_price) || 0, quantity: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart(c => c.filter(x => x.id !== id));
  const total = cart.reduce((s, x) => s + x.price * x.quantity, 0);

  const [checkout, setCheckout] = useState({ name: '', email: '', phone: '', address: '', city: '', postal: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', first_name: '', last_name: '', phone: '' });

  const handleCheckout = async () => {
    if (!cart.length) return toast.error("Košarica je prazna");
    if (!checkout.name || !checkout.email) return toast.error("Unesite ime i email");
    try {
      await createOrder.mutateAsync({
        header: {
          customer_name: checkout.name,
          customer_email: checkout.email,
          customer_phone: checkout.phone,
          shipping_address: checkout.address,
          shipping_city: checkout.city,
          shipping_postal_code: checkout.postal,
          shipping_country: 'BA',
          payment_method: 'cod',
          payment_status: 'pending',
          status: 'new',
        },
        lines: cart.map(c => ({ item_id: c.id, description: c.name, quantity: c.quantity, unit_price: c.price, total: c.price * c.quantity })),
      });
      setCart([]);
      setCheckoutOpen(false);
      toast.success("Hvala na narudžbi!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">🛍️ Web Shop</h1>
          <div className="flex items-center gap-2">
            {!user && (
              <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><User className="h-4 w-4 mr-2" />Registracija</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registracija</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Email *</Label><Input type="email" value={registerForm.email} onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })} /></div>
                    <div><Label>Lozinka *</Label><Input type="password" value={registerForm.password} onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Ime</Label><Input value={registerForm.first_name} onChange={e => setRegisterForm({ ...registerForm, first_name: e.target.value })} /></div>
                      <div><Label>Prezime</Label><Input value={registerForm.last_name} onChange={e => setRegisterForm({ ...registerForm, last_name: e.target.value })} /></div>
                    </div>
                    <div><Label>Telefon</Label><Input value={registerForm.phone} onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })} /></div>
                    <Button className="w-full" onClick={async () => {
                      await register.mutateAsync(registerForm);
                      setRegisterOpen(false);
                    }} disabled={register.isPending}>Registriraj se</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
              <DialogTrigger asChild>
                <Button><ShoppingCart className="h-4 w-4 mr-2" />Košarica ({cart.reduce((s,c) => s+c.quantity, 0)})</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Košarica</DialogTitle></DialogHeader>
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Košarica je prazna</p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cart.map(c => (
                        <div key={c.id} className="flex items-center justify-between border-b pb-2">
                          <div className="flex-1"><p className="font-medium">{c.name}</p><p className="text-sm text-muted-foreground">{c.price.toFixed(2)} KM × {c.quantity}</p></div>
                          <Button size="icon" variant="ghost" onClick={() => removeFromCart(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-3 flex justify-between font-bold">
                      <span>Ukupno:</span><span>{total.toFixed(2)} KM</span>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Ime i prezime *" value={checkout.name} onChange={e => setCheckout({...checkout, name: e.target.value})} />
                        <Input placeholder="Email *" value={checkout.email} onChange={e => setCheckout({...checkout, email: e.target.value})} />
                      </div>
                      <Input placeholder="Telefon" value={checkout.phone} onChange={e => setCheckout({...checkout, phone: e.target.value})} />
                      <Input placeholder="Adresa" value={checkout.address} onChange={e => setCheckout({...checkout, address: e.target.value})} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Grad" value={checkout.city} onChange={e => setCheckout({...checkout, city: e.target.value})} />
                        <Input placeholder="Poštanski broj" value={checkout.postal} onChange={e => setCheckout({...checkout, postal: e.target.value})} />
                      </div>
                      <Button className="w-full" onClick={handleCheckout} disabled={createOrder.isPending}>Naruči (pouzeće)</Button>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Input placeholder="Pretraga proizvoda..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {(items || []).map(item => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="bg-muted rounded h-32 flex items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="font-semibold line-clamp-1">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.code}</p>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{Number(item.selling_price || 0).toFixed(2)} KM</Badge>
                  <Button size="sm" onClick={() => addToCart(item)}><Plus className="h-3 w-3 mr-1" />Dodaj</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(items?.length === 0) && <p className="col-span-full text-center text-muted-foreground py-8">Nema proizvoda</p>}
        </div>
      </main>
    </div>
  );
}

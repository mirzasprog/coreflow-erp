import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/NavLink";
import { ShoppingCart, Package, Settings, TrendingUp, Users, CreditCard, Globe } from "lucide-react";
import { useEcommerceOrders } from "@/hooks/useEcommerce";
import { useItems } from "@/hooks/useMasterData";
import { useEcommerceCustomers } from "@/hooks/useEcommerceCustomers";

export default function EcommerceIndex() {
  const { data: orders } = useEcommerceOrders();
  const { data: items } = useItems();
  const { data: customers } = useEcommerceCustomers();
  const today = new Date().toDateString();
  const ordersToday = orders?.filter((o) => new Date(o.order_date).toDateString() === today).length || 0;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const revenue = orders?.filter((o) => new Date(o.order_date) >= monthStart).reduce((s, o) => s + Number(o.total), 0) || 0;
  return (
    <div>
      <Header title="E-Commerce" subtitle="Web Shop i Online Prodaja" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Narudžbe danas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ordersToday}</div>
              <p className="text-xs text-muted-foreground">Narudžbe danas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aktivni proizvodi</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{items?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Aktivnih artikala</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Prihod ovaj mjesec</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{revenue.toFixed(2)} KM</div>
              <p className="text-xs text-muted-foreground">Online prodaja</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Registrirani kupci</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Online korisnici</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <NavLink to="/ecommerce/products" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Package className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Katalog proizvoda</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Upravljanje proizvodima za web shop
                </p>
              </CardContent>
            </Card>
          </NavLink>
          
          <NavLink to="/ecommerce/orders" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <ShoppingCart className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Narudžbe</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Pregled i obrada online narudžbi
                </p>
              </CardContent>
            </Card>
          </NavLink>

          <NavLink to="/ecommerce/settings" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Settings className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Postavke shopa</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Konfiguracija web shopa
                </p>
              </CardContent>
            </Card>
          </NavLink>

          <NavLink to="/ecommerce/customers" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Users className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Registrirani kupci</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {customers?.length || 0} kupaca
                </p>
              </CardContent>
            </Card>
          </NavLink>

          <a href="/shop" target="_blank" rel="noopener noreferrer" className="block">
            <Card className="h-full border-dashed hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Globe className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Web Shop Preview</h3>
                <Badge variant="outline" className="mt-2">Otvori storefront</Badge>
              </CardContent>
            </Card>
          </a>
        </div>

        {/* Features Info */}
        <Card>
          <CardHeader>
            <CardTitle>E-Commerce Modul</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Katalog proizvoda
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Sinkronizacija s ERP artiklima</li>
                  <li>• Slike i opisi proizvoda</li>
                  <li>• Kategorije i filteri</li>
                  <li>• SEO optimizacija</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Narudžbe
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Online košarica i checkout</li>
                  <li>• Integracija s dostavom</li>
                  <li>• Automatsko kreiranje otpremnica</li>
                  <li>• E-fakture za narudžbe</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Plaćanja
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Stripe integracija</li>
                  <li>• Pouzeće</li>
                  <li>• Virman / Uplata na račun</li>
                  <li>• PayPal (uskoro)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

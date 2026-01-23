import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/NavLink";
import { ShoppingCart, Package, Settings, TrendingUp, Users, CreditCard, Globe } from "lucide-react";

export default function EcommerceIndex() {
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
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Nema novih narudžbi</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aktivni proizvodi</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">U web shopu</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Prihod ovaj mjesec</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0,00 KM</div>
              <p className="text-xs text-muted-foreground">Online prodaja</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Registrirani kupci</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
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

          <Card className="h-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Globe className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-muted-foreground">Web Shop Preview</h3>
              <Badge variant="outline" className="mt-2">Uskoro</Badge>
            </CardContent>
          </Card>
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

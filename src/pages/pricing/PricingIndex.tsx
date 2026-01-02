import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { NavLink } from '@/components/NavLink';
import { 
  Tag, 
  ListOrdered, 
  Percent, 
  History, 
  TrendingUp, 
  Settings,
  ArrowRight,
  Sparkles,
  Building2,
  Cog
} from 'lucide-react';
import { useModuleSettings, useToggleModule, usePriceLists, usePromoActivities } from '@/hooks/usePriceManagement';
import { useToast } from '@/hooks/use-toast';

export default function PricingIndex() {
  const { toast } = useToast();
  const { data: moduleSettings, isLoading: moduleLoading } = useModuleSettings('price_management');
  const { data: priceLists } = usePriceLists();
  const { data: promoActivities } = usePromoActivities();
  const toggleModule = useToggleModule();

  const isModuleEnabled = moduleSettings?.enabled ?? false;
  
  const activePriceLists = priceLists?.filter(pl => pl.active)?.length || 0;
  const activePromos = promoActivities?.filter(p => p.status === 'active')?.length || 0;
  const draftPromos = promoActivities?.filter(p => p.status === 'draft')?.length || 0;

  const handleToggleModule = async () => {
    try {
      await toggleModule.mutateAsync({
        moduleName: 'price_management',
        enabled: !isModuleEnabled
      });
      toast({
        title: !isModuleEnabled ? 'Modul aktiviran' : 'Modul deaktiviran',
        description: !isModuleEnabled 
          ? 'Upravljanje cijenama je sada aktivno. Cijene artikala se upravljaju kroz ovaj modul.'
          : 'Upravljanje cijenama je deaktivirano. Cijene se mogu uređivati kroz Items stranicu.'
      });
    } catch (error) {
      toast({
        title: 'Greška',
        description: 'Nije moguće promijeniti status modula',
        variant: 'destructive'
      });
    }
  };

  const menuItems = [
    {
      title: 'Cjenici',
      description: 'Upravljanje cjenicima i dodjeljivanje lokacijama',
      icon: ListOrdered,
      href: '/pricing/price-lists',
      count: activePriceLists,
      countLabel: 'aktivnih',
      color: 'text-blue-500'
    },
    {
      title: 'Promo Aktivnosti',
      description: 'Akcije, popusti i sezonske promocije',
      icon: Percent,
      href: '/pricing/promos',
      count: activePromos,
      countLabel: 'aktivnih',
      badge: draftPromos > 0 ? `${draftPromos} draft` : undefined,
      color: 'text-green-500'
    },
    {
      title: 'Historija Cijena',
      description: 'Pregled svih promjena cijena kroz vrijeme',
      icon: History,
      href: '/pricing/history',
      color: 'text-orange-500'
    },
    {
      title: 'Cijene Konkurencije',
      description: 'Praćenje cijena kod konkurenata',
      icon: TrendingUp,
      href: '/pricing/competitors',
      color: 'text-purple-500'
    },
    {
      title: 'Pravila Cijena',
      description: 'Automatska pravila za popuste i akcije',
      icon: Cog,
      href: '/pricing/rules',
      color: 'text-red-500'
    }
  ];

  if (moduleLoading) {
    return (
      <div>
        <Header title="Upravljanje Cijenama" subtitle="Price Management Module" />
        <div className="flex items-center justify-center p-12">
          <div className="text-muted-foreground">Učitavanje...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Upravljanje Cijenama" subtitle="Price Management Module" />

      <div className="p-6 space-y-6">
        {/* Module Toggle Card */}
        <Card className={isModuleEnabled ? 'border-primary/50 bg-primary/5' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isModuleEnabled ? 'bg-primary/20' : 'bg-muted'}`}>
                  <Settings className={`h-6 w-6 ${isModuleEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Status Modula
                    <Badge variant={isModuleEnabled ? 'default' : 'secondary'}>
                      {isModuleEnabled ? 'AKTIVAN' : 'NEAKTIVAN'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {isModuleEnabled 
                      ? 'Cijene artikala se upravljaju isključivo kroz ovaj modul'
                      : 'Cijene artikala se uređuju kroz Items stranicu u Warehouse modulu'
                    }
                  </CardDescription>
                </div>
              </div>
              <Switch 
                checked={isModuleEnabled}
                onCheckedChange={handleToggleModule}
                disabled={toggleModule.isPending}
              />
            </div>
          </CardHeader>
          {isModuleEnabled && (
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>AI asistent za analizu cijena je dostupan prilikom kreiranja promocija</span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Module Features Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {menuItems.map((item) => (
            <NavLink key={item.href} to={item.href} className="block">
              <Card className={`h-full transition-all hover:shadow-md hover:border-primary/30 ${!isModuleEnabled ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted`}>
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                {(item.count !== undefined || item.badge) && (
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {item.count !== undefined && (
                        <Badge variant="outline">
                          {item.count} {item.countLabel}
                        </Badge>
                      )}
                      {item.badge && (
                        <Badge variant="secondary">{item.badge}</Badge>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            </NavLink>
          ))}
        </div>

        {/* Quick Stats */}
        {isModuleEnabled && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <ListOrdered className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{priceLists?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Ukupno cjenika</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Percent className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{activePromos}</div>
                    <div className="text-sm text-muted-foreground">Aktivne promocije</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Tag className="h-8 w-8 text-orange-500" />
                  <div>
                    <div className="text-2xl font-bold">{draftPromos}</div>
                    <div className="text-sm text-muted-foreground">Promocije u pripremi</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">{activePriceLists}</div>
                    <div className="text-sm text-muted-foreground">Aktivni cjenici</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
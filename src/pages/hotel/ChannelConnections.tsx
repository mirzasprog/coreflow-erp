import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, Link2, RefreshCw, Check, X, ExternalLink } from "lucide-react";
import { useChannelConnections, useCreateChannelConnection } from "@/hooks/useHotel";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const channelInfo: Record<string, { name: string; color: string; logo: string; description: string }> = {
  booking_com: {
    name: "Booking.com",
    color: "bg-blue-600",
    logo: "B",
    description: "Najveća platforma za rezervacije smještaja",
  },
  airbnb: {
    name: "Airbnb",
    color: "bg-rose-500",
    logo: "A",
    description: "Platforma za kratkoročni najam",
  },
  expedia: {
    name: "Expedia",
    color: "bg-yellow-500",
    logo: "E",
    description: "Globalna turistička platforma",
  },
};

export default function ChannelConnections() {
  const { data: connections, isLoading } = useChannelConnections();
  const createConnection = useCreateChannelConnection();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [propertyId, setPropertyId] = useState("");

  const handleConnect = async () => {
    if (!selectedChannel) return;
    
    await createConnection.mutateAsync({
      channel_name: selectedChannel,
      api_key: apiKey || null,
      property_id: propertyId || null,
      is_active: true,
      last_sync_at: null,
      sync_status: "idle",
      settings: {},
    });
    
    setSelectedChannel("");
    setApiKey("");
    setPropertyId("");
    setDialogOpen(false);
  };

  const handleSync = (channelId: string) => {
    toast.info("Sinkronizacija pokrenuta...", { description: "Ova funkcionalnost zahtijeva API integraciju" });
  };

  const getConnectedChannels = () => {
    return connections?.map(c => c.channel_name) || [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Kanali rezervacija
          </h1>
          <p className="text-muted-foreground">
            Povežite platforme poput Booking.com i Airbnb za automatsku sinkronizaciju
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Link2 className="h-4 w-4 mr-2" />
              Poveži novi kanal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Poveži kanal</DialogTitle>
              <DialogDescription>
                Unesite API podatke za povezivanje s platformom
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Platforma</Label>
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberi platformu" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(channelInfo).map(([key, info]) => (
                      <SelectItem 
                        key={key} 
                        value={key}
                        disabled={getConnectedChannels().includes(key)}
                      >
                        {info.name} {getConnectedChannels().includes(key) && "(već povezano)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>API ključ</Label>
                <Input 
                  type="password"
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Unesite API ključ"
                />
              </div>
              <div>
                <Label>Property ID</Label>
                <Input 
                  value={propertyId} 
                  onChange={(e) => setPropertyId(e.target.value)}
                  placeholder="ID vaše nekretnine na platformi"
                />
              </div>
              <Button 
                onClick={handleConnect} 
                disabled={!selectedChannel || createConnection.isPending}
                className="w-full"
              >
                Poveži
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Available Channels */}
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(channelInfo).map(([key, info]) => {
          const connection = connections?.find(c => c.channel_name === key);
          const isConnected = !!connection;
          
          return (
            <Card key={key} className={isConnected ? "border-green-200" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded ${info.color} flex items-center justify-center text-white font-bold`}>
                      {info.logo}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{info.name}</CardTitle>
                    </div>
                  </div>
                  {isConnected ? (
                    <Badge className="bg-green-100 text-green-800">
                      <Check className="h-3 w-3 mr-1" />
                      Povezano
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <X className="h-3 w-3 mr-1" />
                      Nepovezano
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{info.description}</p>
                
                {isConnected ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Status:</span>
                      <Badge variant="outline">{connection.sync_status}</Badge>
                    </div>
                    {connection.last_sync_at && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Zadnja sinkronizacija:</span>
                        <span className="text-muted-foreground">
                          {new Date(connection.last_sync_at).toLocaleString('hr')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Aktivno:</span>
                      <Switch checked={connection.is_active} />
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleSync(connection.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sinkroniziraj
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setSelectedChannel(key);
                      setDialogOpen(true);
                    }}
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Poveži
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* API Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle>Kako funkcionira integracija?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="font-medium flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</div>
                Povežite kanal
              </div>
              <p className="text-sm text-muted-foreground">
                Unesite API ključeve dobivene od platforme
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-medium flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</div>
                Automatska sinkronizacija
              </div>
              <p className="text-sm text-muted-foreground">
                Rezervacije se automatski povlače u sustav
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-medium flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</div>
                Ažuriranje dostupnosti
              </div>
              <p className="text-sm text-muted-foreground">
                Promjene se šalju natrag na sve platforme
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" size="sm" asChild>
              <a href="https://partner.booking.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Booking.com Partner
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://www.airbnb.com/hosting" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Airbnb Hosting
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

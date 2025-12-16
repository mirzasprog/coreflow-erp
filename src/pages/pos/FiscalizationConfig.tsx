import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useFiscalizationConfigs,
  useSaveFiscalizationConfig,
  useDeleteFiscalizationConfig,
  useFiscalizationLogs,
  type FiscalizationConfig,
} from "@/hooks/useFiscalization";
import { usePOSTerminals } from "@/hooks/usePOS";
import { useLocations } from "@/hooks/useMasterData";
import { format } from "date-fns";
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Settings,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FiscalizationConfig() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<FiscalizationConfig> | null>(null);

  const { data: configs = [], isLoading } = useFiscalizationConfigs();
  const { data: terminals = [] } = usePOSTerminals();
  const { data: locations = [] } = useLocations();
  const { data: logs = [] } = useFiscalizationLogs();

  const saveMutation = useSaveFiscalizationConfig();
  const deleteMutation = useDeleteFiscalizationConfig();

  const handleSave = () => {
    if (!editingConfig) return;
    saveMutation.mutate(editingConfig as any, {
      onSuccess: () => {
        setShowDialog(false);
        setEditingConfig(null);
      },
    });
  };

  const handleEdit = (config: any) => {
    setEditingConfig(config);
    setShowDialog(true);
  };

  const handleNew = () => {
    setEditingConfig({
      fiscal_mode: "disabled",
      auto_fiscalize: true,
      retry_on_failure: true,
      max_retries: 3,
      active: true,
    });
    setShowDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="outline" className="text-success border-success"><CheckCircle className="h-3 w-3 mr-1" /> Uspješno</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Neuspješno</Badge>;
      case "pending":
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Na čekanju</Badge>;
      case "retry":
        return <Badge variant="outline" className="text-warning border-warning"><AlertCircle className="h-3 w-3 mr-1" /> Pokušaj</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case "fbih": return "FBiH (Fiskalni printer)";
      case "rs": return "RS (Poreska uprava API)";
      case "disabled": return "Onemogućeno";
      default: return mode;
    }
  };

  return (
    <div>
      <Header
        title="Fiscalization Configuration"
        subtitle="Konfiguracija fiskalizacije • FBiH / RS"
      />

      <div className="p-6">
        <Tabs defaultValue="config">
          <TabsList className="mb-4">
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Konfiguracija
            </TabsTrigger>
            <TabsTrigger value="logs">
              <FileText className="h-4 w-4 mr-2" />
              Logovi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <div className="module-card">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Terminal Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    Konfiguracija fiskalizacije po terminalu/lokaciji
                  </p>
                </div>
                <Button onClick={handleNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova konfiguracija
                </Button>
              </div>

              {isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : configs.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
                  <Settings className="mb-2 h-12 w-12" />
                  <p>Nema konfiguracija</p>
                  <p className="text-sm">Dodajte konfiguraciju za terminal</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Terminal</TableHead>
                      <TableHead>Lokacija</TableHead>
                      <TableHead>Režim</TableHead>
                      <TableHead>Auto fisk.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map((config: any) => (
                      <TableRow key={config.id}>
                        <TableCell>
                          {config.pos_terminals?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {config.locations?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.fiscal_mode === "disabled" ? "secondary" : "default"}>
                            {getModeLabel(config.fiscal_mode)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {config.auto_fiscalize ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          {config.active ? (
                            <Badge variant="outline" className="text-success border-success">Aktivan</Badge>
                          ) : (
                            <Badge variant="secondary">Neaktivan</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(config)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(config.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <div className="module-card">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Fiscalization Logs</h3>
                <p className="text-sm text-muted-foreground">
                  Povijest fiskalizacije i grešaka
                </p>
              </div>

              {logs.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
                  <FileText className="mb-2 h-12 w-12" />
                  <p>Nema logova</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum/Vrijeme</TableHead>
                      <TableHead>Tip operacije</TableHead>
                      <TableHead>Režim</TableHead>
                      <TableHead>Fiskalni br.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Greška</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.created_at), "dd.MM.yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.operation_type === "receipt" && "Račun"}
                            {log.operation_type === "x_report" && "X-Report"}
                            {log.operation_type === "z_report" && "Z-Report"}
                            {log.operation_type === "void" && "Storno"}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.fiscal_mode}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.fiscal_number || "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {log.error_message || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingConfig?.id ? "Uredi konfiguraciju" : "Nova konfiguracija"}
            </DialogTitle>
            <DialogDescription>
              Konfiguracija fiskalizacije za terminal/lokaciju
            </DialogDescription>
          </DialogHeader>

          {editingConfig && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Terminal</Label>
                  <Select
                    value={editingConfig.terminal_id || ""}
                    onValueChange={(v) => setEditingConfig({ ...editingConfig, terminal_id: v || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Odaberi terminal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Svi terminali</SelectItem>
                      {terminals.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.terminal_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Lokacija</Label>
                  <Select
                    value={editingConfig.location_id || ""}
                    onValueChange={(v) => setEditingConfig({ ...editingConfig, location_id: v || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Odaberi lokaciju" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sve lokacije</SelectItem>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Režim fiskalizacije</Label>
                <Select
                  value={editingConfig.fiscal_mode}
                  onValueChange={(v) => setEditingConfig({ ...editingConfig, fiscal_mode: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Onemogućeno</SelectItem>
                    <SelectItem value="fbih">FBiH (Fiskalni printer - XML)</SelectItem>
                    <SelectItem value="rs">RS (Poreska uprava - REST API)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingConfig.fiscal_mode === "fbih" && (
                <div className="space-y-4 rounded-lg border p-4">
                  <h4 className="font-medium">FBiH Postavke (Fiskalni printer)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tip uređaja</Label>
                      <Input
                        placeholder="npr. TRING, EPSON"
                        value={editingConfig.fbih_device_type || ""}
                        onChange={(e) => setEditingConfig({ ...editingConfig, fbih_device_type: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tip konekcije</Label>
                      <Select
                        value={editingConfig.fbih_connection_type || ""}
                        onValueChange={(v) => setEditingConfig({ ...editingConfig, fbih_connection_type: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Odaberi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="usb">USB</SelectItem>
                          <SelectItem value="lan">LAN (Mreža)</SelectItem>
                          <SelectItem value="serial">Serijski port</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {editingConfig.fbih_connection_type === "lan" && (
                      <>
                        <div className="space-y-2">
                          <Label>IP adresa uređaja</Label>
                          <Input
                            placeholder="192.168.1.100"
                            value={editingConfig.fbih_device_ip || ""}
                            onChange={(e) => setEditingConfig({ ...editingConfig, fbih_device_ip: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Port</Label>
                          <Input
                            type="number"
                            placeholder="9100"
                            value={editingConfig.fbih_device_port || ""}
                            onChange={(e) => setEditingConfig({ ...editingConfig, fbih_device_port: parseInt(e.target.value) || undefined })}
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-2">
                      <Label>Operaterski kod</Label>
                      <Input
                        placeholder="Kod operatera"
                        value={editingConfig.fbih_operator_code || ""}
                        onChange={(e) => setEditingConfig({ ...editingConfig, fbih_operator_code: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingConfig.fiscal_mode === "rs" && (
                <div className="space-y-4 rounded-lg border p-4">
                  <h4 className="font-medium">RS Postavke (Poreska uprava API)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>API URL</Label>
                      <Input
                        placeholder="https://efaktura.mfin.gov.rs/api"
                        value={editingConfig.rs_api_url || ""}
                        onChange={(e) => setEditingConfig({ ...editingConfig, rs_api_url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>PIB</Label>
                      <Input
                        placeholder="Poreski identifikacioni broj"
                        value={editingConfig.rs_pib || ""}
                        onChange={(e) => setEditingConfig({ ...editingConfig, rs_pib: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Šifra poslovne jedinice</Label>
                      <Input
                        placeholder="Šifra PJ"
                        value={editingConfig.rs_business_unit_code || ""}
                        onChange={(e) => setEditingConfig({ ...editingConfig, rs_business_unit_code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Thumbprint certifikata</Label>
                      <Input
                        placeholder="Certificate thumbprint"
                        value={editingConfig.rs_certificate_thumbprint || ""}
                        onChange={(e) => setEditingConfig({ ...editingConfig, rs_certificate_thumbprint: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * API ključ se pohranjuje enkriptirano u bazi podataka
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Automatska fiskalizacija</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatski fiskaliziraj svaki račun
                  </p>
                </div>
                <Switch
                  checked={editingConfig.auto_fiscalize}
                  onCheckedChange={(v) => setEditingConfig({ ...editingConfig, auto_fiscalize: v })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Ponovi pri neuspjehu</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatski ponovi fiskalizaciju ako ne uspije
                  </p>
                </div>
                <Switch
                  checked={editingConfig.retry_on_failure}
                  onCheckedChange={(v) => setEditingConfig({ ...editingConfig, retry_on_failure: v })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Aktivna konfiguracija</Label>
                  <p className="text-xs text-muted-foreground">
                    Omogući/onemogući ovu konfiguraciju
                  </p>
                </div>
                <Switch
                  checked={editingConfig.active}
                  onCheckedChange={(v) => setEditingConfig({ ...editingConfig, active: v })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Odustani
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Spremi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

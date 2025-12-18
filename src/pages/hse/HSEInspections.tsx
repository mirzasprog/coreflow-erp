import { useMemo, useState, useRef } from "react";
import { format } from "date-fns";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { useCreateSafetyInspection, useSafetyDevices, useSafetyInspections } from "@/hooks/useHSE";
import { useHSEUpload } from "@/hooks/useHSEUpload";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, ShieldCheck, AlertTriangle, Upload, FileText, X } from "lucide-react";

export default function HSEInspections() {
  const { data: inspections, isLoading } = useSafetyInspections();
  const { data: devices } = useSafetyDevices();
  const createInspection = useCreateSafetyInspection();
  const { uploadFile, uploading } = useHSEUpload();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deviceId, setDeviceId] = useState<string>("");
  const [inspectionDate, setInspectionDate] = useState<string>("");
  const [result, setResult] = useState<string>("passed");
  const [inspectorName, setInspectorName] = useState<string>("");
  const [inspectorCompany, setInspectorCompany] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const stats = useMemo(() => {
    const total = inspections?.length || 0;
    const passed = inspections?.filter((i) => i.passed !== false).length || 0;
    const failed = total - passed;
    return { total, passed, failed };
  }, [inspections]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleCreate = async () => {
    if (!deviceId || !inspectionDate) {
      toast({
        title: "Nedostaju podaci",
        description: "Odaberite uređaj i datum pregleda.",
        variant: "destructive",
      });
      return;
    }

    try {
      let attachmentUrl: string | null = null;

      if (selectedFile) {
        attachmentUrl = await uploadFile(selectedFile, "inspections");
      }

      await createInspection.mutateAsync({
        device_id: deviceId,
        inspection_date: inspectionDate,
        result,
        passed: result === "passed",
        inspector_name: inspectorName || null,
        inspector_company: inspectorCompany || null,
        notes: notes || null,
        attachment_url: attachmentUrl,
      });

      toast({ title: "Pregled spremljen" });
      setInspectionDate("");
      setResult("passed");
      setInspectorName("");
      setInspectorCompany("");
      setNotes("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      toast({
        title: "Greška",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <Header title="Safety Inspections" subtitle="Pregledi uređaja i evidencija rezultata" />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Ukupno pregleda"
            value={stats.total.toString()}
            change="Evidentirani pregledi"
            icon={ClipboardCheck}
            iconColor="bg-module-hse/10 text-module-hse"
          />
          <StatCard
            title="Prošlo"
            value={stats.passed.toString()}
            changeType="positive"
            change="Validirani uređaji"
            icon={ShieldCheck}
            iconColor="bg-success/10 text-success"
          />
          <StatCard
            title="Nije prošlo"
            value={stats.failed.toString()}
            changeType={stats.failed > 0 ? "negative" : "positive"}
            change="Zahtijeva pažnju"
            icon={AlertTriangle}
            iconColor="bg-destructive/10 text-destructive"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="module-card lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Zadnji pregledi</h3>
                <p className="text-sm text-muted-foreground">Prikazano prema zadnjem datumu pregleda</p>
              </div>
            </div>

            {isLoading ? (
              <div className="py-10 text-center text-muted-foreground">Učitavanje...</div>
            ) : !inspections?.length ? (
              <div className="py-10 text-center text-muted-foreground">Nema evidentiranih pregleda.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Uređaj</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Inspektor</TableHead>
                      <TableHead>Rezultat</TableHead>
                      <TableHead>Bilješke</TableHead>
                      <TableHead>Dokument</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspections.map((inspection) => (
                      <TableRow key={inspection.id}>
                        <TableCell className="font-medium">
                          {inspection.safety_devices?.name || inspection.safety_devices?.device_code}
                        </TableCell>
                        <TableCell>{format(new Date(inspection.inspection_date), "dd.MM.yyyy")}</TableCell>
                        <TableCell>
                          {inspection.inspector_name || "—"}
                          {inspection.inspector_company && (
                            <span className="block text-xs text-muted-foreground">
                              {inspection.inspector_company}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {inspection.passed ? (
                            <Badge className="bg-success/20 text-success">Passed</Badge>
                          ) : (
                            <Badge className="bg-destructive/20 text-destructive">Failed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs text-sm text-muted-foreground">
                          {inspection.notes || "—"}
                        </TableCell>
                        <TableCell>
                          {inspection.attachment_url ? (
                            <a
                              href={inspection.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              Certifikat
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="module-card space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Novi pregled</h3>
              <p className="text-sm text-muted-foreground">Spojeno na Supabase bazu</p>
            </div>

            <Select value={deviceId} onValueChange={setDeviceId}>
              <SelectTrigger>
                <SelectValue placeholder="Odaberi uređaj" />
              </SelectTrigger>
              <SelectContent>
                {devices?.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name || device.device_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Datum pregleda</label>
              <Input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
            </div>

            <Select value={result} onValueChange={setResult}>
              <SelectTrigger>
                <SelectValue placeholder="Rezultat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passed">Prošao</SelectItem>
                <SelectItem value="failed">Nije prošao</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Inspektor"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
            />
            <Input
              placeholder="Kompanija inspektora"
              value={inspectorCompany}
              onChange={(e) => setInspectorCompany(e.target.value)}
            />
            <Textarea
              placeholder="Bilješke..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Certifikat / Potvrda</label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {selectedFile && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  {selectedFile.name}
                </p>
              )}
            </div>

            <Button onClick={handleCreate} disabled={createInspection.isPending || uploading} className="w-full">
              {uploading ? "Uploading..." : "Spremi pregled"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

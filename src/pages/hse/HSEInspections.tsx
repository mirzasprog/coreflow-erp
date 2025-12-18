import { useMemo, useRef, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { useCreateSafetyInspection, useSafetyDevices, useSafetyInspections, useUpdateSafetyInspection, SafetyInspection } from "@/hooks/useHSE";
import { useHSEUpload } from "@/hooks/useHSEUpload";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, ShieldCheck, AlertTriangle, Upload, FileText, X, Pencil, Mail, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function HSEInspections() {
  const { data: inspections, isLoading } = useSafetyInspections();
  const { data: devices } = useSafetyDevices();
  const createInspection = useCreateSafetyInspection();
  const updateInspection = useUpdateSafetyInspection();
  const { uploadFile, uploading } = useHSEUpload();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [deviceId, setDeviceId] = useState<string>("");
  const [inspectionDate, setInspectionDate] = useState<string>("");
  const [result, setResult] = useState<string>("passed");
  const [inspectorName, setInspectorName] = useState<string>("");
  const [inspectorCompany, setInspectorCompany] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingInspection, setEditingInspection] = useState<SafetyInspection | null>(null);
  const [editDeviceId, setEditDeviceId] = useState<string>("");
  const [editInspectionDate, setEditInspectionDate] = useState<string>("");
  const [editResult, setEditResult] = useState<string>("passed");
  const [editInspectorName, setEditInspectorName] = useState<string>("");
  const [editInspectorCompany, setEditInspectorCompany] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  const stats = useMemo(() => {
    const total = inspections?.length || 0;
    const passed = inspections?.filter((i) => i.passed !== false).length || 0;
    const failed = total - passed;
    return { total, passed, failed };
  }, [inspections]);

  const enrichedInspections = useMemo(() => {
    const today = new Date();
    return (
      inspections?.map((inspection) => {
        const nextDate = inspection.safety_devices?.next_inspection_date
          ? new Date(inspection.safety_devices.next_inspection_date)
          : null;
        const daysRemaining = nextDate ? differenceInCalendarDays(nextDate, today) : null;

        let status: "due" | "expiring" | "scheduled" | "unscheduled" = "scheduled";
        if (!nextDate) status = "unscheduled";
        else if (daysRemaining < 0) status = "due";
        else if (daysRemaining <= 30) status = "expiring";

        return { ...inspection, daysRemaining, status };
      }) || []
    );
  }, [inspections]);

  const dueInspections = useMemo(
    () => enrichedInspections.filter((inspection) => inspection.status === "due" || inspection.status === "expiring"),
    [enrichedInspections]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditSelectedFile(file);
      setRemoveExistingAttachment(false);
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

  const openEdit = (inspection: SafetyInspection) => {
    setEditingInspection(inspection);
    setEditDeviceId(inspection.device_id);
    setEditInspectionDate(inspection.inspection_date || "");
    setEditResult(inspection.result || "passed");
    setEditInspectorName(inspection.inspector_name || "");
    setEditInspectorCompany(inspection.inspector_company || "");
    setEditNotes(inspection.notes || "");
    setEditSelectedFile(null);
    setRemoveExistingAttachment(false);
  };

  const resetEditForm = () => {
    setEditingInspection(null);
    setEditSelectedFile(null);
    setRemoveExistingAttachment(false);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const handleUpdate = async () => {
    if (!editingInspection) return;
    if (!editDeviceId || !editInspectionDate) {
      toast({
        title: "Nedostaju podaci",
        description: "Uredite uređaj i datum pregleda.",
        variant: "destructive",
      });
      return;
    }

    try {
      let attachmentUrl = removeExistingAttachment ? null : editingInspection.attachment_url;

      if (editSelectedFile) {
        attachmentUrl = await uploadFile(editSelectedFile, "inspections");
      }

      await updateInspection.mutateAsync({
        id: editingInspection.id,
        device_id: editDeviceId,
        inspection_date: editInspectionDate,
        result: editResult,
        passed: editResult === "passed",
        inspector_name: editInspectorName || null,
        inspector_company: editInspectorCompany || null,
        notes: editNotes || null,
        attachment_url: attachmentUrl,
      });

      toast({ title: "Pregled ažuriran" });
      resetEditForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Greška prilikom spremanja";
      toast({
        title: "Greška",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleSendReminders = async () => {
    if (!dueInspections.length) {
      toast({
        title: "Nema pregleda za slanje",
        description: "Svi uređaji su ažurirani.",
      });
      return;
    }

    try {
      setSendingReminders(true);
      const { data, error } = await supabase.functions.invoke("send-hse-reminders", {
        body: { inspectionIds: dueInspections.map((inspection) => inspection.id) },
      });

      if (error) throw error;

      toast({
        title: "Email upozorenja poslana",
        description: data?.message || "Obavijest poslata odgovornima.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Greška prilikom slanja";
      toast({
        title: "Slanje nije uspjelo",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSendingReminders(false);
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

        <Alert className="border-warning/60 bg-warning/10">
          <BellRing className="h-5 w-5 text-warning" />
          <div className="flex-1">
            <AlertTitle>Istek rokova inspekcije</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-4 w-4" /> Kasneće: {dueInspections.filter((i) => i.status === "due").length}
              </span>
              <span className="flex items-center gap-1 text-warning">
                <ClipboardCheck className="h-4 w-4" /> Uskoro: {dueInspections.filter((i) => i.status === "expiring").length}
              </span>
              <span className="flex items-center gap-1 text-success">
                <ShieldCheck className="h-4 w-4" /> U skladu: {stats.total - dueInspections.length}
              </span>
            </AlertDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleSendReminders} disabled={sendingReminders}>
            <Mail className="mr-2 h-4 w-4" />
            {sendingReminders ? "Slanje..." : "Email upozorenja"}
          </Button>
        </Alert>

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
                      <TableHead>Status</TableHead>
                      <TableHead>Bilješke</TableHead>
                      <TableHead>Dokument</TableHead>
                      <TableHead className="w-[60px] text-right">Akcija</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichedInspections.map((inspection) => (
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
                        <TableCell>
                          {inspection.status === "due" ? (
                            <Badge className="bg-destructive/20 text-destructive">Isteklo</Badge>
                          ) : inspection.status === "expiring" ? (
                            <Badge className="bg-warning/20 text-warning">
                              Za {inspection.daysRemaining} d
                            </Badge>
                          ) : (
                            <Badge className="bg-success/20 text-success">Planirano</Badge>
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
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(inspection)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
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

        <Drawer open={!!editingInspection} onOpenChange={(open) => !open && resetEditForm()}>
          <DrawerContent>
            <DrawerHeader className="border-b">
              <DrawerTitle>Uredi pregled uređaja</DrawerTitle>
              <p className="text-sm text-muted-foreground">
                Zamijeni dokument, osvježi datum ili bilješke za postojeći zapis.
              </p>
            </DrawerHeader>

            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Uređaj</Label>
                <Select value={editDeviceId} onValueChange={setEditDeviceId}>
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
              </div>

              <div className="space-y-2">
                <Label>Datum pregleda</Label>
                <Input type="date" value={editInspectionDate} onChange={(e) => setEditInspectionDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Rezultat</Label>
                <Select value={editResult} onValueChange={setEditResult}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rezultat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passed">Prošao</SelectItem>
                    <SelectItem value="failed">Nije prošao</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Inspektor</Label>
                <Input value={editInspectorName} onChange={(e) => setEditInspectorName(e.target.value)} placeholder="Ime inspektora" />
              </div>

              <div className="space-y-2">
                <Label>Kompanija inspektora</Label>
                <Input value={editInspectorCompany} onChange={(e) => setEditInspectorCompany(e.target.value)} placeholder="Kompanija" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Bilješke</Label>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Bilješke" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Dokument</Label>
                <div className="flex flex-col gap-2 rounded-lg border p-3">
                  {editingInspection?.attachment_url && !removeExistingAttachment && !editSelectedFile && (
                    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                      <a
                        href={editingInspection.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        Trenutni dokument
                      </a>
                      <Button size="sm" variant="ghost" onClick={() => setRemoveExistingAttachment(true)}>
                        Ukloni
                      </Button>
                    </div>
                  )}
                  {(removeExistingAttachment || !editingInspection?.attachment_url) && (
                    <div className="flex items-center gap-2">
                      <Input
                        ref={editFileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleEditFileChange}
                        className="flex-1"
                      />
                      {editSelectedFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditSelectedFile(null);
                            if (editFileInputRef.current) editFileInputRef.current.value = "";
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                  {removeExistingAttachment && (
                    <p className="text-xs text-muted-foreground">Dokument će biti uklonjen nakon spremanja.</p>
                  )}
                  {editSelectedFile && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Upload className="h-3 w-3" />
                      {editSelectedFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DrawerFooter className="border-t">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <DrawerClose asChild>
                  <Button variant="ghost" onClick={resetEditForm}>
                    Odustani
                  </Button>
                </DrawerClose>
                <Button onClick={handleUpdate} disabled={updateInspection.isPending || uploading}>
                  {uploading ? "Uploading..." : "Spremi promjene"}
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { format, addMonths } from "date-fns";
import { differenceInCalendarDays } from "date-fns";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import {
  HeartPulse,
  AlertTriangle,
  CheckCircle,
  Clock,
  Upload,
  FileText,
  X,
  Pencil,
  BellRing,
  Mail,
  Smartphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMedicalCheckStats, useCreateMedicalCheck, useUpdateMedicalCheck, MedicalCheck } from "@/hooks/useHSE";
import { useHSEUpload } from "@/hooks/useHSEUpload";
import { useHREmployees } from "@/hooks/useHR";
import { useToast } from "@/hooks/use-toast";

const typeLabels: Record<string, string> = {
  sanitary_booklet: "Sanitary Booklet",
  periodic_medical: "Periodic Medical",
  other: "Other",
};

type StatusFilter = "all" | "overdue" | "expiring" | "valid";

export default function HSEMedicalChecks() {
  const { data: checks, stats, isLoading } = useMedicalCheckStats();
  const { data: employees } = useHREmployees();
  const createMedicalCheck = useCreateMedicalCheck();
  const updateMedicalCheck = useUpdateMedicalCheck();
  const { uploadFile, uploading } = useHSEUpload();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  // Form state
  const [employeeId, setEmployeeId] = useState<string>("");
  const [checkType, setCheckType] = useState<string>("periodic_medical");
  const [checkDate, setCheckDate] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingCheck, setEditingCheck] = useState<MedicalCheck | null>(null);
  const [editEmployeeId, setEditEmployeeId] = useState<string>("");
  const [editCheckType, setEditCheckType] = useState<string>("periodic_medical");
  const [editCheckDate, setEditCheckDate] = useState<string>("");
  const [editValidUntil, setEditValidUntil] = useState<string>("");
  const [editResult, setEditResult] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [hasAnnouncedAlerts, setHasAnnouncedAlerts] = useState(false);

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

  const enrichedChecks = useMemo(() => {
    const today = new Date();
    return (
      checks?.map((check) => {
        const validUntilDate = check.valid_until ? new Date(check.valid_until) : null;
        const daysRemaining = validUntilDate ? differenceInCalendarDays(validUntilDate, today) : null;

        let status: StatusFilter = "valid";
        if (daysRemaining === null) status = "valid";
        else if (daysRemaining < 0) status = "overdue";
        else if (daysRemaining <= 30) status = "expiring";

        return {
          ...check,
          daysRemaining,
          status,
        };
      }) || []
    );
  }, [checks]);

  const filteredChecks = useMemo(() => {
    return enrichedChecks.filter((check) => {
      if (statusFilter !== "all" && check.status !== statusFilter) return false;
      if (!search) return true;
      const haystack = `${check.employees?.first_name || ""} ${check.employees?.last_name || ""} ${typeLabels[check.check_type] || check.check_type}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [enrichedChecks, statusFilter, search]);

  const dueChecks = useMemo(
    () => enrichedChecks.filter((check) => check.status === "overdue" || check.status === "expiring"),
    [enrichedChecks]
  );

  const renderStatus = (status: StatusFilter, daysRemaining: number | null) => {
    if (status === "overdue") {
      return <Badge className="bg-destructive/20 text-destructive">Overdue ({Math.abs(daysRemaining || 0)}d)</Badge>;
    }
    if (status === "expiring") {
      return <Badge className="bg-warning/20 text-warning">Expires in {daysRemaining}d</Badge>;
    }
    return <Badge className="bg-success/20 text-success">Valid</Badge>;
  };

  const handleCreate = async () => {
    if (!employeeId || !checkDate || !checkType) {
      toast({
        title: "Nedostaju podaci",
        description: "Odaberite zaposlenika, tip pregleda i datum.",
        variant: "destructive",
      });
      return;
    }

    try {
      let attachmentUrl: string | null = null;

      if (selectedFile) {
        attachmentUrl = await uploadFile(selectedFile, "medical-checks");
      }

      await createMedicalCheck.mutateAsync({
        employee_id: employeeId,
        check_type: checkType as "sanitary_booklet" | "periodic_medical" | "other",
        check_date: checkDate,
        valid_until: validUntil || null,
        result: result || null,
        notes: notes || null,
        attachment_url: attachmentUrl,
      });

      toast({ title: "Pregled spremljen" });
      setEmployeeId("");
      setCheckDate("");
      setValidUntil("");
      setResult("");
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

  // Auto-calculate valid_until based on check type
  const handleCheckDateChange = (date: string) => {
    setCheckDate(date);
    if (date) {
      const checkDateObj = new Date(date);
      // Default validity: sanitary booklet = 6 months, medical = 12 months
      const months = checkType === "sanitary_booklet" ? 6 : 12;
      const validUntilDate = addMonths(checkDateObj, months);
      setValidUntil(format(validUntilDate, "yyyy-MM-dd"));
    }
  };

  const handleEditCheckDateChange = (date: string) => {
    setEditCheckDate(date);
    if (date) {
      const checkDateObj = new Date(date);
      const months = editCheckType === "sanitary_booklet" ? 6 : 12;
      const validUntilDate = addMonths(checkDateObj, months);
      setEditValidUntil(format(validUntilDate, "yyyy-MM-dd"));
    }
  };

  const handleSendReminders = async () => {
    if (!dueChecks.length) {
      toast({
        title: "Nema pregleda za slanje",
        description: "Svi pregledi su ažurni.",
      });
      return;
    }

    try {
      setSendingReminders(true);
      const { data, error } = await supabase.functions.invoke("send-hse-reminders", {
        body: { medicalCheckIds: dueChecks.map((check) => check.id) },
      });

      if (error) throw error;

      toast({
        title: "Email obavijesti poslane",
        description: data?.message || "Provjerite inbox zaposlenika.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Greška prilikom slanja emaila";
      toast({
        title: "Slanje nije uspjelo",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSendingReminders(false);
    }
  };

  const openEdit = (check: MedicalCheck) => {
    setEditingCheck(check);
    setEditEmployeeId(check.employee_id);
    setEditCheckType(check.check_type);
    setEditCheckDate(check.check_date || "");
    setEditValidUntil(check.valid_until || "");
    setEditResult(check.result || "");
    setEditNotes(check.notes || "");
    setEditSelectedFile(null);
    setRemoveExistingAttachment(false);
  };

  const resetEditForm = () => {
    setEditingCheck(null);
    setEditSelectedFile(null);
    setRemoveExistingAttachment(false);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const handleUpdate = async () => {
    if (!editingCheck) return;
    if (!editEmployeeId || !editCheckDate || !editCheckType) {
      toast({
        title: "Nedostaju podaci",
        description: "Popunite zaposlenika, datum i tip pregleda.",
        variant: "destructive",
      });
      return;
    }

    try {
      let attachmentUrl = removeExistingAttachment ? null : editingCheck.attachment_url;

      if (editSelectedFile) {
        attachmentUrl = await uploadFile(editSelectedFile, "medical-checks");
      }

      await updateMedicalCheck.mutateAsync({
        id: editingCheck.id,
        employee_id: editEmployeeId,
        check_type: editCheckType as "sanitary_booklet" | "periodic_medical" | "other",
        check_date: editCheckDate,
        valid_until: editValidUntil || null,
        result: editResult || null,
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

  useEffect(() => {
    if (!hasAnnouncedAlerts && (stats.overdue > 0 || stats.expiringSoon > 0)) {
      toast({
        title: "Pregledi zahtijevaju pažnju",
        description: `Isteklo: ${stats.overdue}, uskoro ističe: ${stats.expiringSoon}`,
        variant: "destructive",
      });
      setHasAnnouncedAlerts(true);
    }
  }, [stats.overdue, stats.expiringSoon, hasAnnouncedAlerts, toast]);

  return (
    <div>
      <Header title="Medical Checks" subtitle="Liječnički i sanitarni pregledi zaposlenika" />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Checks"
            value={stats.total.toString()}
            change="Evidentirani pregledi"
            icon={HeartPulse}
            iconColor="bg-module-hse/10 text-module-hse"
          />
          <StatCard
            title="Overdue"
            value={stats.overdue.toString()}
            change="Istekli pregledi"
            changeType={stats.overdue > 0 ? "negative" : "positive"}
            icon={AlertTriangle}
            iconColor="bg-destructive/10 text-destructive"
          />
          <StatCard
            title="Expiring Soon"
            value={stats.expiringSoon.toString()}
            change="30 dana"
            changeType={stats.expiringSoon > 0 ? "negative" : "positive"}
            icon={Clock}
            iconColor="bg-warning/10 text-warning"
          />
          <StatCard
            title="Compliance Rate"
            value={`${stats.complianceRate}%`}
            change="Validni pregledi"
            changeType="positive"
            icon={CheckCircle}
            iconColor="bg-success/10 text-success"
          />
        </div>

        <Alert className="border-warning/60 bg-warning/10">
          <BellRing className="h-5 w-5 text-warning" />
          <div className="flex-1">
            <AlertTitle>Upozorenja o isteku pregleda</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-4 w-4" /> Isteklo: {stats.overdue}
              </span>
              <span className="flex items-center gap-1 text-warning">
                <Clock className="h-4 w-4" /> Uskoro ističe: {stats.expiringSoon}
              </span>
              <span className="flex items-center gap-1 text-success">
                <CheckCircle className="h-4 w-4" /> Validno: {stats.total - stats.overdue}
              </span>
            </AlertDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" size="sm" onClick={handleSendReminders} disabled={sendingReminders}>
              <Mail className="mr-2 h-4 w-4" />
              {sendingReminders ? "Slanje..." : "Pošalji email upozorenja"}
            </Button>
            <Button variant="secondary" size="sm" className="gap-2" onClick={() => setStatusFilter("overdue")}>
              <Smartphone className="h-4 w-4" />
              Prikaži u aplikaciji
            </Button>
          </div>
        </Alert>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="module-card lg:col-span-2">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Pregledi zaposlenika</h3>
                <p className="text-sm text-muted-foreground">Realni podaci iz evidencije medicinskih pregleda</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex gap-2">
                  {(["all", "overdue", "expiring", "valid"] as StatusFilter[]).map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                    >
                      {status === "all" ? "Sve" : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
                <Input
                  placeholder="Search employees or type..."
                  className="w-full min-w-[240px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="py-10 text-center text-muted-foreground">Učitavanje podataka...</div>
            ) : filteredChecks.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                Nema pregleda za odabrani filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zaposlenik</TableHead>
                      <TableHead>Vrsta pregleda</TableHead>
                      <TableHead>Datum pregleda</TableHead>
                      <TableHead>Vrijedi do</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dokument</TableHead>
                      <TableHead className="w-[60px] text-right">Akcija</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChecks.map((check) => (
                      <TableRow key={check.id}>
                        <TableCell className="font-medium">
                          {check.employees
                            ? `${check.employees.first_name} ${check.employees.last_name}`
                            : "—"}
                        </TableCell>
                        <TableCell>{typeLabels[check.check_type] || check.check_type}</TableCell>
                        <TableCell>
                          {check.check_date ? format(new Date(check.check_date), "dd.MM.yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          {check.valid_until
                            ? format(new Date(check.valid_until), "dd.MM.yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {renderStatus(check.status, check.daysRemaining)}
                        </TableCell>
                        <TableCell>
                          {check.attachment_url ? (
                            <a
                              href={check.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              Dokument
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(check)}>
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

          {/* New Medical Check Form */}
          <div className="module-card space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Novi pregled</h3>
              <p className="text-sm text-muted-foreground">Evidentiraj liječnički pregled</p>
            </div>

            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Odaberi zaposlenika" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={checkType} onValueChange={setCheckType}>
              <SelectTrigger>
                <SelectValue placeholder="Tip pregleda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="periodic_medical">Periodični liječnički</SelectItem>
                <SelectItem value="sanitary_booklet">Sanitarna knjižica</SelectItem>
                <SelectItem value="other">Ostalo</SelectItem>
              </SelectContent>
            </Select>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Datum pregleda</label>
              <Input 
                type="date" 
                value={checkDate} 
                onChange={(e) => handleCheckDateChange(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Vrijedi do</label>
              <Input 
                type="date" 
                value={validUntil} 
                onChange={(e) => setValidUntil(e.target.value)} 
              />
            </div>

            <Input
              placeholder="Rezultat (npr. Sposoban)"
              value={result}
              onChange={(e) => setResult(e.target.value)}
            />

            <Textarea
              placeholder="Bilješke..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Potvrda / Nalaz</label>
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

            <Button onClick={handleCreate} disabled={createMedicalCheck.isPending || uploading} className="w-full">
              {uploading ? "Uploading..." : "Spremi pregled"}
            </Button>
          </div>
        </div>

        <Drawer open={!!editingCheck} onOpenChange={(open) => !open && resetEditForm()}>
          <DrawerContent>
            <DrawerHeader className="border-b">
              <DrawerTitle>Uredi pregled</DrawerTitle>
              <p className="text-sm text-muted-foreground">
                Ažuriraj datume, rezultate ili zamijeni postojeći dokument.
              </p>
            </DrawerHeader>

            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label>Zaposlenik</Label>
                <Select value={editEmployeeId} onValueChange={setEditEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberi zaposlenika" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tip pregleda</Label>
                <Select value={editCheckType} onValueChange={setEditCheckType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tip pregleda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="periodic_medical">Periodični liječnički</SelectItem>
                    <SelectItem value="sanitary_booklet">Sanitarna knjižica</SelectItem>
                    <SelectItem value="other">Ostalo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Datum pregleda</Label>
                <Input type="date" value={editCheckDate} onChange={(e) => handleEditCheckDateChange(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Vrijedi do</Label>
                <Input type="date" value={editValidUntil} onChange={(e) => setEditValidUntil(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Rezultat</Label>
                <Input value={editResult} onChange={(e) => setEditResult(e.target.value)} placeholder="Rezultat pregleda" />
              </div>

              <div className="space-y-2">
                <Label>Bilješke</Label>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Bilješke" />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label>Dokument</Label>
                <div className="flex flex-col gap-2 rounded-lg border p-3">
                  {editingCheck?.attachment_url && !removeExistingAttachment && !editSelectedFile && (
                    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                      <a
                        href={editingCheck.attachment_url}
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
                  {(removeExistingAttachment || !editingCheck?.attachment_url) && (
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
                <Button onClick={handleUpdate} disabled={updateMedicalCheck.isPending || uploading}>
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

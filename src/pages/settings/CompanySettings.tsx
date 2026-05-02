import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { useLocations } from '@/hooks/useMasterData';
import { useCompanySettings, useSaveCompanySettings, useDeleteCompanySettings, type CompanySettings } from '@/hooks/useCompanySettings';

const empty: CompanySettings = {
  legal_name: '',
  tax_id: '',
  country: 'BA',
  default_currency: 'BAM',
  einvoice_scheme_id: '9938',
};

export default function CompanySettingsPage() {
  const { data: settings, isLoading } = useCompanySettings();
  const { data: locations } = useLocations();
  const save = useSaveCompanySettings();
  const del = useDeleteCompanySettings();
  const [editing, setEditing] = useState<CompanySettings | null>(null);

  useEffect(() => {
    // close form after successful save
    if (save.isSuccess) setEditing(null);
  }, [save.isSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    save.mutate(editing);
  };

  return (
    <div>
      <Header title="Postavke kompanije" subtitle="Podaci prodavatelja po lokaciji za e-fakture (UBL XML)" />

      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          {!editing && (
            <Button onClick={() => setEditing(empty)}>
              <Plus className="mr-2 h-4 w-4" /> Nova lokacija
            </Button>
          )}
        </div>

        {editing && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editing.id ? 'Uredi postavke' : 'Nova postavka'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Lokacija</Label>
                  <Select
                    value={editing.location_id ?? ''}
                    onValueChange={(v) => setEditing({ ...editing, location_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Odaberi lokaciju" /></SelectTrigger>
                    <SelectContent>
                      {locations?.map((l: { id: string; name: string; code: string }) => (
                        <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pravni naziv *</Label>
                  <Input required value={editing.legal_name} onChange={(e) => setEditing({ ...editing, legal_name: e.target.value })} />
                </div>
                <div>
                  <Label>JIB *</Label>
                  <Input required value={editing.tax_id} onChange={(e) => setEditing({ ...editing, tax_id: e.target.value })} />
                </div>
                <div>
                  <Label>PDV broj</Label>
                  <Input value={editing.vat_number ?? ''} onChange={(e) => setEditing({ ...editing, vat_number: e.target.value })} />
                </div>
                <div>
                  <Label>Matični broj</Label>
                  <Input value={editing.registration_number ?? ''} onChange={(e) => setEditing({ ...editing, registration_number: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Adresa</Label>
                  <Input value={editing.address ?? ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
                </div>
                <div>
                  <Label>Grad</Label>
                  <Input value={editing.city ?? ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
                </div>
                <div>
                  <Label>Poštanski broj</Label>
                  <Input value={editing.postal_code ?? ''} onChange={(e) => setEditing({ ...editing, postal_code: e.target.value })} />
                </div>
                <div>
                  <Label>Država (ISO)</Label>
                  <Input value={editing.country ?? ''} onChange={(e) => setEditing({ ...editing, country: e.target.value })} />
                </div>
                <div>
                  <Label>Valuta</Label>
                  <Input value={editing.default_currency ?? ''} onChange={(e) => setEditing({ ...editing, default_currency: e.target.value })} />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input value={editing.phone ?? ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={editing.email ?? ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                </div>
                <div>
                  <Label>Web</Label>
                  <Input value={editing.website ?? ''} onChange={(e) => setEditing({ ...editing, website: e.target.value })} />
                </div>
                <div>
                  <Label>Banka</Label>
                  <Input value={editing.bank_name ?? ''} onChange={(e) => setEditing({ ...editing, bank_name: e.target.value })} />
                </div>
                <div>
                  <Label>IBAN</Label>
                  <Input value={editing.iban ?? ''} onChange={(e) => setEditing({ ...editing, iban: e.target.value })} />
                </div>
                <div>
                  <Label>SWIFT</Label>
                  <Input value={editing.swift ?? ''} onChange={(e) => setEditing({ ...editing, swift: e.target.value })} />
                </div>
                <div>
                  <Label>E-Faktura Endpoint ID</Label>
                  <Input value={editing.einvoice_endpoint_id ?? ''} onChange={(e) => setEditing({ ...editing, einvoice_endpoint_id: e.target.value })} />
                </div>
                <div>
                  <Label>E-Faktura Scheme ID</Label>
                  <Input value={editing.einvoice_scheme_id ?? ''} onChange={(e) => setEditing({ ...editing, einvoice_scheme_id: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Napomene</Label>
                  <Textarea value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" disabled={save.isPending}>
                    <Save className="mr-2 h-4 w-4" /> Spremi
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Konfigurirane lokacije</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Učitavanje...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lokacija</TableHead>
                    <TableHead>Pravni naziv</TableHead>
                    <TableHead>JIB</TableHead>
                    <TableHead>PDV</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead className="text-right">Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(settings ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nema unesenih podataka</TableCell></TableRow>
                  ) : (
                    settings?.map((s) => {
                      const loc = locations?.find((l: { id: string; name: string }) => l.id === s.location_id);
                      return (
                        <TableRow key={s.id}>
                          <TableCell>{loc?.name ?? '—'}</TableCell>
                          <TableCell className="font-medium">{s.legal_name}</TableCell>
                          <TableCell>{s.tax_id}</TableCell>
                          <TableCell>{s.vat_number ?? '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{s.iban ?? '—'}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => setEditing(s as CompanySettings)}>Uredi</Button>
                            <Button size="sm" variant="destructive" onClick={() => s.id && del.mutate(s.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

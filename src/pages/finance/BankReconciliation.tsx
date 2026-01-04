import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, Upload, FileSpreadsheet, Check, X, Link2, Unlink, 
  Wand2, ArrowDownLeft, ArrowUpRight, Loader2, AlertCircle 
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { format } from "date-fns";
import {
  useBankStatements,
  useBankStatement,
  useImportBankStatement,
  useAutoMatchSuggestions,
  useMatchTransaction,
  useUnmatchTransaction,
  BankStatementLine,
  MatchSuggestion,
} from "@/hooks/useBankReconciliation";

export default function BankReconciliation() {
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { data: statements, isLoading: statementsLoading } = useBankStatements();
  const { data: selectedStatement, isLoading: statementLoading } = useBankStatement(selectedStatementId || undefined);
  const { data: suggestions } = useAutoMatchSuggestions(selectedStatementId || undefined);
  const matchTransaction = useMatchTransaction();
  const unmatchTransaction = useUnmatchTransaction();
  const importStatement = useImportBankStatement();

  const [importData, setImportData] = useState({
    bank_name: '',
    account_number: '',
    statement_date: new Date().toISOString().split('T')[0],
    opening_balance: 0,
    closing_balance: 0,
    lines: [] as Array<{
      transaction_date: string;
      description: string;
      amount: number;
      transaction_type: string;
      partner_name: string;
    }>,
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simple CSV parsing (for demo - real implementation would handle various bank formats)
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').slice(1); // Skip header
      
      const lines = rows
        .filter(row => row.trim())
        .map(row => {
          const cols = row.split(';');
          const amount = parseFloat(cols[3]?.replace(',', '.') || '0');
          return {
            transaction_date: cols[0] || new Date().toISOString().split('T')[0],
            description: cols[1] || '',
            partner_name: cols[2] || '',
            amount,
            transaction_type: amount >= 0 ? 'credit' : 'debit',
          };
        });

      setImportData(prev => ({ ...prev, lines }));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    await importStatement.mutateAsync(importData);
    setImportDialogOpen(false);
    setImportData({
      bank_name: '',
      account_number: '',
      statement_date: new Date().toISOString().split('T')[0],
      opening_balance: 0,
      closing_balance: 0,
      lines: [],
    });
  };

  const handleAutoMatch = async (suggestion: MatchSuggestion) => {
    await matchTransaction.mutateAsync({
      lineId: suggestion.lineId,
      invoiceId: suggestion.invoiceId,
    });
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  const unmatchedLines = selectedStatement?.lines?.filter(l => !l.matched) || [];
  const matchedLines = selectedStatement?.lines?.filter(l => l.matched) || [];

  return (
    <div>
      <Header 
        title="Bank Reconciliation" 
        subtitle="Sparivanje bankovnih izvoda • Bank Statement Matching" 
      />

      <div className="p-6 space-y-6">
        {/* Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import bankovnog izvoda</DialogTitle>
              <DialogDescription>
                Učitajte CSV datoteku ili unesite transakcije ručno
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Naziv banke</Label>
                  <Input
                    value={importData.bank_name}
                    onChange={(e) => setImportData(prev => ({ ...prev, bank_name: e.target.value }))}
                    placeholder="npr. UniCredit"
                  />
                </div>
                <div>
                  <Label>Broj računa</Label>
                  <Input
                    value={importData.account_number}
                    onChange={(e) => setImportData(prev => ({ ...prev, account_number: e.target.value }))}
                    placeholder="HR12345678901234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Datum izvoda</Label>
                  <Input
                    type="date"
                    value={importData.statement_date}
                    onChange={(e) => setImportData(prev => ({ ...prev, statement_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Početno stanje</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={importData.opening_balance}
                    onChange={(e) => setImportData(prev => ({ ...prev, opening_balance: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label>Završno stanje</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={importData.closing_balance}
                    onChange={(e) => setImportData(prev => ({ ...prev, closing_balance: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Učitaj CSV datoteku (format: datum;opis;partner;iznos)
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                />
              </div>

              {importData.lines.length > 0 && (
                <div className="max-h-60 overflow-auto border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Opis</TableHead>
                        <TableHead>Partner</TableHead>
                        <TableHead className="text-right">Iznos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.lines.map((line, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{line.transaction_date}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{line.description}</TableCell>
                          <TableCell>{line.partner_name}</TableCell>
                          <TableCell className={`text-right ${line.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(line.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                Odustani
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!importData.bank_name || importStatement.isPending}
              >
                {importStatement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importiraj
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Statements List */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Izvodi</CardTitle>
              <Button size="sm" onClick={() => setImportDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Import
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {statementsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : statements?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nema importiranih izvoda
                </p>
              ) : (
                statements?.map(stmt => (
                  <button
                    key={stmt.id}
                    onClick={() => setSelectedStatementId(stmt.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedStatementId === stmt.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <p className="font-medium text-sm">{stmt.bank_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(stmt.statement_date), 'dd.MM.yyyy')}
                    </p>
                    <p className="text-xs mt-1">
                      Saldo: {formatCurrency(stmt.closing_balance)}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Statement Details */}
          <div className="lg:col-span-3 space-y-6">
            {!selectedStatementId ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Odaberite izvod za pregled</p>
                </CardContent>
              </Card>
            ) : statementLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
              </Card>
            ) : selectedStatement ? (
              <>
                {/* Statement Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedStatement.bank_name}</CardTitle>
                    <CardDescription>
                      {selectedStatement.account_number} • {format(new Date(selectedStatement.statement_date), 'dd.MM.yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Početno stanje</p>
                        <p className="text-lg font-semibold">{formatCurrency(selectedStatement.opening_balance)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Završno stanje</p>
                        <p className="text-lg font-semibold">{formatCurrency(selectedStatement.closing_balance)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Transakcija</p>
                        <p className="text-lg font-semibold">{selectedStatement.lines?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Spareno</p>
                        <p className="text-lg font-semibold text-success">{matchedLines.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Nespareno</p>
                        <p className="text-lg font-semibold text-warning">{unmatchedLines.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Match Suggestions */}
                {suggestions && suggestions.length > 0 && (
                  <Alert>
                    <Wand2 className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Pronađeno {suggestions.length} mogućih podudaranja</span>
                      <div className="flex gap-2">
                        {suggestions.slice(0, 3).map(s => (
                          <Button 
                            key={s.lineId + s.invoiceId}
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAutoMatch(s)}
                            disabled={matchTransaction.isPending}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            {s.invoiceNumber} ({s.matchScore}%)
                          </Button>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Transactions Tabs */}
                <Tabs defaultValue="unmatched">
                  <TabsList>
                    <TabsTrigger value="unmatched" className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Nesparene ({unmatchedLines.length})
                    </TabsTrigger>
                    <TabsTrigger value="matched" className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Sparene ({matchedLines.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="unmatched">
                    <Card>
                      <CardContent className="pt-6">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Datum</TableHead>
                              <TableHead>Opis</TableHead>
                              <TableHead>Partner</TableHead>
                              <TableHead className="text-right">Iznos</TableHead>
                              <TableHead className="text-right">Akcije</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {unmatchedLines.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                  Sve transakcije su sparene
                                </TableCell>
                              </TableRow>
                            ) : (
                              unmatchedLines.map(line => {
                                const lineSuggestions = suggestions?.filter(s => s.lineId === line.id) || [];
                                return (
                                  <TableRow key={line.id}>
                                    <TableCell>{format(new Date(line.transaction_date), 'dd.MM.yyyy')}</TableCell>
                                    <TableCell className="max-w-[250px] truncate">{line.description}</TableCell>
                                    <TableCell>{line.partner_name || '-'}</TableCell>
                                    <TableCell className={`text-right font-medium ${line.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                                      {line.amount >= 0 ? <ArrowDownLeft className="inline h-3 w-3 mr-1" /> : <ArrowUpRight className="inline h-3 w-3 mr-1" />}
                                      {formatCurrency(Math.abs(line.amount))}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {lineSuggestions.length > 0 ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAutoMatch(lineSuggestions[0])}
                                          disabled={matchTransaction.isPending}
                                        >
                                          <Link2 className="h-3 w-3 mr-1" />
                                          {lineSuggestions[0].invoiceNumber}
                                        </Button>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">Nema prijedloga</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="matched">
                    <Card>
                      <CardContent className="pt-6">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Datum</TableHead>
                              <TableHead>Opis</TableHead>
                              <TableHead className="text-right">Iznos</TableHead>
                              <TableHead>Faktura</TableHead>
                              <TableHead className="text-right">Akcije</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {matchedLines.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                  Nema sparenih transakcija
                                </TableCell>
                              </TableRow>
                            ) : (
                              matchedLines.map(line => (
                                <TableRow key={line.id}>
                                  <TableCell>{format(new Date(line.transaction_date), 'dd.MM.yyyy')}</TableCell>
                                  <TableCell className="max-w-[250px] truncate">{line.description}</TableCell>
                                  <TableCell className={`text-right font-medium ${line.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    {formatCurrency(line.amount)}
                                  </TableCell>
                                  <TableCell>
                                    {line.invoices ? (
                                      <NavLink 
                                        to={`/finance/invoices/${line.amount >= 0 ? 'outgoing' : 'incoming'}/${line.matched_invoice_id}`}
                                        className="text-primary hover:underline"
                                      >
                                        {line.invoices.invoice_number}
                                      </NavLink>
                                    ) : '-'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => unmatchTransaction.mutate(line.id)}
                                      disabled={unmatchTransaction.isPending}
                                    >
                                      <Unlink className="h-3 w-3 mr-1" />
                                      Odspari
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

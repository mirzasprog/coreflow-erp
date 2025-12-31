import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  Download, TrendingUp, TrendingDown, Package, MapPin, 
  Layers, DollarSign, AlertTriangle, FileSpreadsheet, FileText
} from "lucide-react";
import {
  useControllingSummary,
  useItemCostAnalysis,
  useLocationCostAnalysis,
  useCategoryMarginAnalysis,
  useCashflowProjections,
  useDeadStockAnalysis,
} from "@/hooks/useControlling";
import { exportToExcel, exportToPrintablePdf } from "@/lib/exporters";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--info))'];

export default function ControllingDashboard() {
  const [deadStockDays, setDeadStockDays] = useState(90);
  
  const { data: summary, isLoading: summaryLoading } = useControllingSummary();
  const { data: itemAnalysis } = useItemCostAnalysis();
  const { data: locationAnalysis } = useLocationCostAnalysis();
  const { data: categoryAnalysis } = useCategoryMarginAnalysis();
  const { data: cashflowProjections } = useCashflowProjections();
  const { data: deadStock } = useDeadStockAnalysis(deadStockDays);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  // Export functions
  const handleExportItemAnalysis = () => {
    if (!itemAnalysis) return;
    const data = itemAnalysis.map(item => ({
      'Šifra': item.itemCode,
      'Naziv': item.itemName,
      'Kategorija': item.categoryName || '-',
      'Nabavna cijena': item.purchasePrice,
      'Prodajna cijena': item.sellingPrice,
      'Marža (€)': item.marginAmount,
      'Marža (%)': item.marginPercent,
      'Zaliha': item.totalStock,
      'Vrijednost zalihe': item.stockValue,
      'Potencijalni prihod': item.potentialRevenue,
    }));
    exportToExcel(data, 'Artikli', 'Analiza_troškova_artikli.xlsx');
  };

  const handleExportLocationAnalysis = () => {
    if (!locationAnalysis) return;
    const data = locationAnalysis.map(loc => ({
      'Šifra': loc.locationCode,
      'Lokacija': loc.locationName,
      'Broj artikala': loc.totalItems,
      'Ukupna zaliha': loc.totalStock,
      'Vrijednost zalihe': loc.stockValue,
      'Potencijalni prihod': loc.potentialRevenue,
      'Prosječna marža (%)': loc.averageMargin,
    }));
    exportToExcel(data, 'Lokacije', 'Analiza_troškova_lokacije.xlsx');
  };

  const handleExportCategoryAnalysis = () => {
    if (!categoryAnalysis) return;
    const data = categoryAnalysis.map(cat => ({
      'Šifra': cat.categoryCode,
      'Kategorija': cat.categoryName,
      'Broj artikala': cat.itemCount,
      'Prosječna nabavna': cat.averagePurchasePrice,
      'Prosječna prodajna': cat.averageSellingPrice,
      'Prosječna marža (%)': cat.averageMarginPercent,
      'Vrijednost zalihe': cat.totalStockValue,
      'Potencijalni prihod': cat.totalPotentialRevenue,
    }));
    exportToExcel(data, 'Kategorije', 'Analiza_marže_kategorije.xlsx');
  };

  const handleExportCashflow = () => {
    if (!cashflowProjections) return;
    const data = cashflowProjections.map(cf => ({
      'Mjesec': cf.month,
      'Očekivani prilivi': cf.expectedInflows,
      'Očekivani odlivi': cf.expectedOutflows,
      'Neto cashflow': cf.netCashflow,
      'Kumulativni saldo': cf.cumulativeBalance,
    }));
    exportToExcel(data, 'Cashflow', 'Cashflow_projekcije.xlsx');
  };

  const handleExportDeadStock = () => {
    if (!deadStock) return;
    const data = deadStock.map(ds => ({
      'Šifra': ds.itemCode,
      'Artikal': ds.itemName,
      'Lokacija': ds.locationName,
      'Količina': ds.quantity,
      'Vrijednost': ds.stockValue,
      'Dana bez kretanja': ds.daysSinceLastMovement,
      'Zadnje kretanje': ds.lastMovementDate || '-',
    }));
    exportToExcel(data, 'DeadStock', 'Dead_stock_analiza.xlsx');
  };

  return (
    <div>
      <Header 
        title="Controlling" 
        subtitle="Financijski kontroling • Cost Analysis & Projections" 
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vrijednost zaliha</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryLoading ? '...' : formatCurrency(summary?.totalStockValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Nabavna vrijednost ukupnih zaliha
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Potencijalni prihod</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {summaryLoading ? '...' : formatCurrency(summary?.totalPotentialRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Prodajna vrijednost zaliha
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bruto marža</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {summaryLoading ? '...' : formatPercent(summary?.averageMarginPercent || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(summary?.grossMargin || 0)} ukupno
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Radni kapital</CardTitle>
              <TrendingDown className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryLoading ? '...' : formatCurrency(summary?.netWorkingCapital || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Potraživanja - Obveze + Zalihe
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different analyses */}
        <Tabs defaultValue="items" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="items" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Artikli</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Lokacije</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Kategorije</span>
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Cashflow</span>
            </TabsTrigger>
            <TabsTrigger value="deadstock" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Dead Stock</span>
            </TabsTrigger>
          </TabsList>

          {/* Items Analysis Tab */}
          <TabsContent value="items" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Trošak po artiklu</CardTitle>
                  <CardDescription>Analiza nabavne cijene, prodajne cijene i marže</CardDescription>
                </div>
                <Button onClick={handleExportItemAnalysis} variant="outline" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Šifra</TableHead>
                        <TableHead>Naziv</TableHead>
                        <TableHead>Kategorija</TableHead>
                        <TableHead className="text-right">Nabavna</TableHead>
                        <TableHead className="text-right">Prodajna</TableHead>
                        <TableHead className="text-right">Marža %</TableHead>
                        <TableHead className="text-right">Zaliha</TableHead>
                        <TableHead className="text-right">Vrijednost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemAnalysis?.slice(0, 50).map((item) => (
                        <TableRow key={item.itemId}>
                          <TableCell className="font-mono">{item.itemCode}</TableCell>
                          <TableCell>{item.itemName}</TableCell>
                          <TableCell>{item.categoryName || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.purchasePrice)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.sellingPrice)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={item.marginPercent >= 10 ? 'default' : 'destructive'}>
                              {formatPercent(item.marginPercent)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.totalStock}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.stockValue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Analysis Tab */}
          <TabsContent value="locations" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Trošak po lokaciji</CardTitle>
                  <CardDescription>Vrijednost zaliha i prosječna marža po lokacijama</CardDescription>
                </div>
                <Button onClick={handleExportLocationAnalysis} variant="outline" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={locationAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="locationName" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="stockValue" name="Vrijednost zalihe" fill="hsl(var(--primary))" />
                        <Bar dataKey="potentialRevenue" name="Potencijalni prihod" fill="hsl(var(--success))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lokacija</TableHead>
                          <TableHead className="text-right">Artikli</TableHead>
                          <TableHead className="text-right">Vrijednost</TableHead>
                          <TableHead className="text-right">Marža</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {locationAnalysis?.map((loc) => (
                          <TableRow key={loc.locationId}>
                            <TableCell className="font-medium">{loc.locationName}</TableCell>
                            <TableCell className="text-right">{loc.totalItems}</TableCell>
                            <TableCell className="text-right">{formatCurrency(loc.stockValue)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="default">
                                {formatPercent(loc.averageMargin)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Analysis Tab */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Marža po kategoriji</CardTitle>
                  <CardDescription>Prosječna marža i vrijednost po kategorijama artikala</CardDescription>
                </div>
                <Button onClick={handleExportCategoryAnalysis} variant="outline" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryAnalysis}
                          dataKey="totalStockValue"
                          nameKey="categoryName"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryAnalysis?.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="rounded-md border max-h-[300px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kategorija</TableHead>
                          <TableHead className="text-right">Artikli</TableHead>
                          <TableHead className="text-right">Prosj. marža</TableHead>
                          <TableHead className="text-right">Vrijednost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryAnalysis?.map((cat) => (
                          <TableRow key={cat.categoryId}>
                            <TableCell className="font-medium">{cat.categoryName}</TableCell>
                            <TableCell className="text-right">{cat.itemCount}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={cat.averageMarginPercent >= 15 ? 'default' : 'destructive'}>
                                {formatPercent(cat.averageMarginPercent)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(cat.totalStockValue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cashflow Projections Tab */}
          <TabsContent value="cashflow" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Cashflow projekcije</CardTitle>
                  <CardDescription>Predviđeni prilivi i odlivi za sljedećih 6 mjeseci</CardDescription>
                </div>
                <Button onClick={handleExportCashflow} variant="outline" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cashflowProjections}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="expectedInflows" 
                        name="Prilivi" 
                        stroke="hsl(var(--success))" 
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expectedOutflows" 
                        name="Odlivi" 
                        stroke="hsl(var(--destructive))" 
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cumulativeBalance" 
                        name="Kumulativni saldo" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mjesec</TableHead>
                        <TableHead className="text-right">Prilivi</TableHead>
                        <TableHead className="text-right">Odlivi</TableHead>
                        <TableHead className="text-right">Neto</TableHead>
                        <TableHead className="text-right">Kumulativ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashflowProjections?.map((cf) => (
                        <TableRow key={cf.month}>
                          <TableCell className="font-medium">{cf.month}</TableCell>
                          <TableCell className="text-right text-success">{formatCurrency(cf.expectedInflows)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatCurrency(cf.expectedOutflows)}</TableCell>
                          <TableCell className="text-right">
                            <span className={cf.netCashflow >= 0 ? 'text-success' : 'text-destructive'}>
                              {formatCurrency(cf.netCashflow)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(cf.cumulativeBalance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dead Stock Tab */}
          <TabsContent value="deadstock" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Dead Stock Analiza
                  </CardTitle>
                  <CardDescription>
                    Artikli bez kretanja duže od {deadStockDays} dana
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={deadStockDays}
                    onChange={(e) => setDeadStockDays(Number(e.target.value))}
                    className="w-20"
                    min={30}
                  />
                  <span className="text-sm text-muted-foreground">dana</span>
                  <Button onClick={handleExportDeadStock} variant="outline" size="sm">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {deadStock && deadStock.length > 0 ? (
                  <>
                    <div className="mb-4 p-4 bg-warning/10 rounded-lg border border-warning/20">
                      <div className="flex items-center gap-4">
                        <AlertTriangle className="h-8 w-8 text-warning" />
                        <div>
                          <p className="font-semibold">
                            {deadStock.length} artikala bez kretanja
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Ukupna vrijednost: {formatCurrency(deadStock.reduce((sum, ds) => sum + ds.stockValue, 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md border max-h-[400px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Šifra</TableHead>
                            <TableHead>Artikal</TableHead>
                            <TableHead>Lokacija</TableHead>
                            <TableHead className="text-right">Količina</TableHead>
                            <TableHead className="text-right">Vrijednost</TableHead>
                            <TableHead className="text-right">Dana</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deadStock.map((ds, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono">{ds.itemCode}</TableCell>
                              <TableCell>{ds.itemName}</TableCell>
                              <TableCell>{ds.locationName}</TableCell>
                              <TableCell className="text-right">{ds.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(ds.stockValue)}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={ds.daysSinceLastMovement > 180 ? 'destructive' : 'secondary'}>
                                  {ds.daysSinceLastMovement}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nema artikala bez kretanja duže od {deadStockDays} dana</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

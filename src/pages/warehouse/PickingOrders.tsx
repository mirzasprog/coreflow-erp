import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import { ArrowLeft, CheckCircle2, Loader2, User, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useEmployees } from '@/hooks/useMasterData';
import { 
  usePickingOrders, 
  useAssignPicker, 
  useUpdatePickingLine, 
  useCompletePickingOrder,
  PickingOrder,
  PickingOrderLine
} from '@/hooks/usePickingOrders';
import { format } from 'date-fns';
import { sortLocationsByRoute } from '@/lib/warehouseWms';

type LineValidation = {
  quantity: string;
  lot: string;
};

export default function PickingOrders() {
  const { data: pickingOrders, isLoading } = usePickingOrders();
  const { data: employees } = useEmployees();
  const assignPicker = useAssignPicker();
  const updateLine = useUpdatePickingLine();
  const completePicking = useCompletePickingOrder();

  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [lineValidation, setLineValidation] = useState<Record<string, LineValidation>>({});

  // Set first order as selected when data loads
  const selectedOrder = pickingOrders?.find((order) => order.id === selectedOrderId) 
    || (pickingOrders && pickingOrders.length > 0 ? pickingOrders[0] : null);

  const sortedLines = useMemo(() => {
    if (!selectedOrder?.lines) return [];
    const linesWithLocation = selectedOrder.lines.map(line => ({
      ...line,
      locationCode: line.bin_location || '',
      expiryDate: line.expiry_date || undefined
    }));
    return sortLocationsByRoute(linesWithLocation);
  }, [selectedOrder]);

  const handlePickerChange = (orderId: string, pickerId: string) => {
    assignPicker.mutate({
      pickingOrderId: orderId,
      pickerId: pickerId === 'unassigned' ? null : pickerId
    });
  };

  const handleLineValidationChange = (lineId: string, field: keyof LineValidation, value: string) => {
    setLineValidation((prev) => ({
      ...prev,
      [lineId]: { ...prev[lineId], [field]: value },
    }));
  };

  const handleLinePick = (line: PickingOrderLine, checked: boolean) => {
    const validation = lineValidation[line.id];
    const pickedQty = validation?.quantity ? parseFloat(validation.quantity) : line.required_quantity;
    
    updateLine.mutate({
      lineId: line.id,
      pickedQuantity: checked ? pickedQty : 0,
      picked: checked
    });
  };

  const isLineValid = (line: PickingOrderLine) => {
    const validation = lineValidation[line.id];
    if (!validation?.quantity) return line.picked;
    
    const qtyMatches = parseFloat(validation.quantity) === line.required_quantity;
    const lotMatches = !line.lot_number || validation.lot?.trim() === line.lot_number;
    return qtyMatches && lotMatches;
  };

  const canComplete = selectedOrder
    ? selectedOrder.lines?.every((line) => line.picked && line.picked_quantity >= line.required_quantity)
    : false;

  const handleComplete = () => {
    if (!selectedOrder) return;
    completePicking.mutate(selectedOrder.id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary">Otvoren</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500">U tijeku</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-500">Završen</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Otkazan</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Header title="Picking Orders" subtitle="Komisioniranje • Nalozi za skupljanje" />

      <div className="p-6 space-y-6">
        <NavLink to="/warehouse" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Natrag na skladište
        </NavLink>

        {(!pickingOrders || pickingOrders.length === 0) ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nema picking naloga</h3>
              <p className="text-muted-foreground mb-4">
                Picking nalozi se automatski kreiraju iz izdatnica robe.
              </p>
              <NavLink to="/warehouse/issues">
                <Button variant="outline">
                  Pregledaj izdatnice
                </Button>
              </NavLink>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Picking nalozi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                {pickingOrders.map((order) => (
                  <button
                    key={order.id}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      order.id === (selectedOrder?.id || selectedOrderId) 
                        ? 'border-module-warehouse bg-module-warehouse/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{order.picking_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.warehouse_documents?.document_number || 'N/A'}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{order.lines?.length || 0} stavki</span>
                      <span>{format(new Date(order.created_at), 'dd.MM.yyyy HH:mm')}</span>
                    </div>
                    {order.employees && (
                      <div className="mt-2 flex items-center gap-1 text-xs">
                        <User className="h-3 w-3" />
                        <span>{order.employees.first_name} {order.employees.last_name}</span>
                      </div>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Picking Interface</CardTitle>
                {selectedOrder && selectedOrder.status !== 'completed' && (
                  <Select
                    value={selectedOrder.picker_id || 'unassigned'}
                    onValueChange={(value) => handlePickerChange(selectedOrder.id, value)}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Dodijeli osobu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Nije dodijeljeno</SelectItem>
                      {employees?.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.first_name} {employee.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardHeader>
              <CardContent>
                {!selectedOrder ? (
                  <div className="text-center text-muted-foreground py-8">
                    Odaberite picking nalog za početak.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sortedLines.length > 0 && (
                      <div className="rounded-lg border p-4">
                        <p className="text-sm font-medium">Optimalna ruta</p>
                        <p className="text-xs text-muted-foreground">
                          {sortedLines.map((line) => line.bin_location || 'N/A').join(' → ')}
                        </p>
                      </div>
                    )}

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Artikal</TableHead>
                          <TableHead>Lokacija</TableHead>
                          <TableHead>Očekivano</TableHead>
                          <TableHead>Potvrdi kol.</TableHead>
                          <TableHead>Potvrdi LOT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedLines.map((line) => {
                          const valid = isLineValid(line);
                          const isCompleted = selectedOrder.status === 'completed';
                          return (
                            <TableRow key={line.id} className={line.picked ? 'bg-emerald-50' : ''}>
                              <TableCell>
                                <Checkbox
                                  checked={line.picked}
                                  disabled={isCompleted}
                                  onCheckedChange={(checked) => handleLinePick(line, Boolean(checked))}
                                />
                              </TableCell>
                              <TableCell>
                                <p className="font-medium">{line.items?.code}</p>
                                <p className="text-xs text-muted-foreground">{line.items?.name}</p>
                              </TableCell>
                              <TableCell>
                                <p className="font-medium">{line.bin_location || '-'}</p>
                                <p className="text-xs text-muted-foreground">{line.zone || '-'}</p>
                              </TableCell>
                              <TableCell>
                                {line.required_quantity}
                                {line.lot_number && (
                                  <p className="text-xs text-muted-foreground">LOT {line.lot_number}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={lineValidation[line.id]?.quantity || (line.picked ? String(line.picked_quantity) : '')}
                                  onChange={(e) => handleLineValidationChange(line.id, 'quantity', e.target.value)}
                                  className="w-24"
                                  placeholder={`${line.required_quantity}`}
                                  disabled={isCompleted}
                                />
                              </TableCell>
                              <TableCell>
                                {line.lot_number ? (
                                  <>
                                    <Input
                                      value={lineValidation[line.id]?.lot || ''}
                                      onChange={(e) => handleLineValidationChange(line.id, 'lot', e.target.value)}
                                      className="w-32"
                                      placeholder={line.lot_number}
                                      disabled={isCompleted}
                                    />
                                    <div className="mt-1 text-xs">
                                      {valid ? (
                                        <span className="text-emerald-600">OK</span>
                                      ) : (
                                        <span className="text-amber-600">Provjeri</span>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {selectedOrder.status !== 'completed' && (
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <p className="text-sm font-medium">Završi picking</p>
                          <p className="text-xs text-muted-foreground">
                            Sve stavke moraju biti označene kao pokupljene.
                          </p>
                        </div>
                        <Button 
                          onClick={handleComplete} 
                          disabled={!canComplete || completePicking.isPending}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Završi
                        </Button>
                      </div>
                    )}

                    {selectedOrder.status === 'completed' && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
                        <p className="font-medium text-emerald-900">Picking završen</p>
                        {selectedOrder.completed_at && (
                          <p className="text-sm text-emerald-700">
                            {format(new Date(selectedOrder.completed_at), 'dd.MM.yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

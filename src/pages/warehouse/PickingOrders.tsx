import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { pickingOrders, sortLocationsByRoute } from '@/lib/warehouseWms';

type LineValidation = {
  quantity: string;
  lot: string;
};

export default function PickingOrders() {
  const { toast } = useToast();
  const { data: employees } = useEmployees();
  const [orders, setOrders] = useState(pickingOrders);
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id ?? '');
  const [checkedLines, setCheckedLines] = useState<Record<string, boolean>>({});
  const [lineValidation, setLineValidation] = useState<Record<string, LineValidation>>({});

  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  const sortedLines = useMemo(() => {
    if (!selectedOrder) return [];
    return sortLocationsByRoute(selectedOrder.lines);
  }, [selectedOrder]);

  const updatePicker = (orderId: string, pickerId: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              pickerId: pickerId === 'unassigned' ? undefined : pickerId,
              status: pickerId === 'unassigned' ? 'open' : 'in_progress',
            }
          : order
      )
    );
  };

  const handleLineCheck = (lineId: string, checked: boolean) => {
    setCheckedLines((prev) => ({ ...prev, [lineId]: checked }));
  };

  const handleLineValidationChange = (lineId: string, field: keyof LineValidation, value: string) => {
    setLineValidation((prev) => ({
      ...prev,
      [lineId]: { ...prev[lineId], [field]: value },
    }));
  };

  const isLineValid = (lineId: string, expectedQty: number, expectedLot: string) => {
    const validation = lineValidation[lineId];
    if (!validation) return false;
    const qtyMatches = Number(validation.quantity) === expectedQty;
    const lotMatches = validation.lot.trim() === expectedLot;
    return qtyMatches && lotMatches;
  };

  const canComplete = selectedOrder
    ? selectedOrder.lines.every((line) => checkedLines[line.id] && isLineValid(line.id, line.quantity, line.lotNumber))
    : false;

  const handleComplete = () => {
    if (!selectedOrder) return;
    setOrders((prev) =>
      prev.map((order) =>
        order.id === selectedOrder.id ? { ...order, status: 'completed' } : order
      )
    );
    toast({
      title: 'Picking completed',
      description: `Otpremnica za ${selectedOrder.reference} je spremna.`,
    });
  };

  return (
    <div>
      <Header title="Picking Orders" subtitle="Komisioniranje • Nalozi za skupljanje" />

      <div className="p-6 space-y-6">
        <NavLink to="/warehouse" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Warehouse
        </NavLink>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Open Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orders.map((order) => (
                <button
                  key={order.id}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    order.id === selectedOrderId ? 'border-module-warehouse bg-module-warehouse/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{order.reference}</p>
                      <p className="text-xs text-muted-foreground">{order.customer}</p>
                    </div>
                    <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{order.lines.length} lines</span>
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Picking Interface</CardTitle>
              {selectedOrder && (
                <Select
                  value={selectedOrder.pickerId || 'unassigned'}
                  onValueChange={(value) => updatePicker(selectedOrder.id, value)}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Assign picker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
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
                <div className="text-center text-muted-foreground">Select a picking order to begin.</div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">Optimal path</p>
                    <p className="text-xs text-muted-foreground">
                      {sortedLines.map((line) => line.locationCode).join(' → ')}
                    </p>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Expected</TableHead>
                        <TableHead>Confirm Qty</TableHead>
                        <TableHead>Confirm LOT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedLines.map((line) => {
                        const valid = isLineValid(line.id, line.quantity, line.lotNumber);
                        return (
                          <TableRow key={line.id}>
                            <TableCell>
                              <Checkbox
                                checked={checkedLines[line.id] || false}
                                onCheckedChange={(checked) => handleLineCheck(line.id, Boolean(checked))}
                              />
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{line.itemCode}</p>
                              <p className="text-xs text-muted-foreground">{line.itemName}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{line.locationCode}</p>
                              <p className="text-xs text-muted-foreground">{line.zone}</p>
                            </TableCell>
                            <TableCell>
                              {line.quantity} {line.unit}
                              <p className="text-xs text-muted-foreground">LOT {line.lotNumber}</p>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={lineValidation[line.id]?.quantity || ''}
                                onChange={(event) =>
                                  handleLineValidationChange(line.id, 'quantity', event.target.value)
                                }
                                className="w-24"
                                placeholder={`${line.quantity}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={lineValidation[line.id]?.lot || ''}
                                onChange={(event) =>
                                  handleLineValidationChange(line.id, 'lot', event.target.value)
                                }
                                className="w-32"
                                placeholder={line.lotNumber}
                              />
                              <div className="mt-1 text-xs">
                                {valid ? (
                                  <span className="text-emerald-600">Match</span>
                                ) : (
                                  <span className="text-amber-600">Needs verification</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium">Completion check</p>
                      <p className="text-xs text-muted-foreground">
                        All lines must be checked and validated.
                      </p>
                    </div>
                    <Button onClick={handleComplete} disabled={!canComplete}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Complete Picking
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

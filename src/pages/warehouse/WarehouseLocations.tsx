import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NavLink } from '@/components/NavLink';
import { ArrowLeft, Printer, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { warehouseBinLocations } from '@/lib/warehouseWms';

const zones = Array.from(new Set(warehouseBinLocations.map((loc) => loc.zone)));
const temperatures = Array.from(new Set(warehouseBinLocations.map((loc) => loc.temperature)));
const storageTypes = Array.from(new Set(warehouseBinLocations.map((loc) => loc.storageType)));

export default function WarehouseLocations() {
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [tempFilter, setTempFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [labelsOpen, setLabelsOpen] = useState(false);

  const filteredLocations = useMemo(() => {
    return warehouseBinLocations.filter((loc) => {
      const matchesSearch =
        loc.code.toLowerCase().includes(search.toLowerCase()) ||
        loc.description.toLowerCase().includes(search.toLowerCase());
      const matchesZone = zoneFilter === 'all' || loc.zone === zoneFilter;
      const matchesTemp = tempFilter === 'all' || loc.temperature === tempFilter;
      const matchesType = typeFilter === 'all' || loc.storageType === typeFilter;
      return matchesSearch && matchesZone && matchesTemp && matchesType;
    });
  }, [search, zoneFilter, tempFilter, typeFilter]);

  return (
    <div>
      <Header title="Warehouse Locations" subtitle="Lokacije • Upravljanje skladišnim pozicijama" />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <NavLink to="/warehouse" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Warehouse
          </NavLink>
          <Button onClick={() => setLabelsOpen(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Print Labels
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <Input
              placeholder="Search by code or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All zones</SelectItem>
                {zones.map((zone) => (
                  <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tempFilter} onValueChange={setTempFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Temperature" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All temperatures</SelectItem>
                {temperatures.map((temp) => (
                  <SelectItem key={temp} value={temp}>{temp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Storage type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {storageTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location Registry</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Aisle-Rack-Pos</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Temperature</TableHead>
                  <TableHead>Storage Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No locations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLocations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.code}</TableCell>
                      <TableCell>{location.description}</TableCell>
                      <TableCell>
                        {location.aisle}-{location.rack}-{location.position}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{location.zone}</Badge>
                      </TableCell>
                      <TableCell>{location.temperature}</TableCell>
                      <TableCell>{location.storageType}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={labelsOpen} onOpenChange={setLabelsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Location Labels</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLocations.map((location) => (
              <div key={location.id} className="rounded-lg border p-4 text-center">
                <QrCode className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm font-semibold">{location.code}</p>
                <p className="text-xs text-muted-foreground">{location.zone} • {location.temperature}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

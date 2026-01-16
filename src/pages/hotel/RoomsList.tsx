import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, BedDouble, Settings } from "lucide-react";
import { useRooms, useRoomTypes, useCreateRoom, useCreateRoomType, useUpdateRoom } from "@/hooks/useHotel";
import { Skeleton } from "@/components/ui/skeleton";

const statusLabels: Record<string, string> = {
  available: "Slobodno",
  occupied: "Zauzeto",
  maintenance: "Održavanje",
  cleaning: "Čišćenje",
};

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  occupied: "bg-red-100 text-red-800",
  maintenance: "bg-yellow-100 text-yellow-800",
  cleaning: "bg-blue-100 text-blue-800",
};

export default function RoomsList() {
  const { data: rooms, isLoading: roomsLoading } = useRooms();
  const { data: roomTypes, isLoading: typesLoading } = useRoomTypes();
  const createRoom = useCreateRoom();
  const createRoomType = useCreateRoomType();
  const updateRoom = useUpdateRoom();

  const [newRoom, setNewRoom] = useState({ room_number: "", room_type_id: "", floor: 1 });
  const [newType, setNewType] = useState({ name: "", base_price: 0, max_occupancy: 2, description: "" });
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);

  const handleCreateRoom = async () => {
    await createRoom.mutateAsync({
      room_number: newRoom.room_number,
      room_type_id: newRoom.room_type_id || null,
      floor: newRoom.floor,
      status: "available",
      notes: null,
    });
    setNewRoom({ room_number: "", room_type_id: "", floor: 1 });
    setRoomDialogOpen(false);
  };

  const handleCreateType = async () => {
    await createRoomType.mutateAsync({
      name: newType.name,
      base_price: newType.base_price,
      max_occupancy: newType.max_occupancy,
      description: newType.description || null,
      amenities: null,
    });
    setNewType({ name: "", base_price: 0, max_occupancy: 2, description: "" });
    setTypeDialogOpen(false);
  };

  const handleStatusChange = (roomId: string, status: string) => {
    updateRoom.mutate({ id: roomId, status: status as any });
  };

  const isLoading = roomsLoading || typesLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BedDouble className="h-8 w-8" />
            Sobe
          </h1>
          <p className="text-muted-foreground">Upravljanje sobama i tipovima soba</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Novi tip sobe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novi tip sobe</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Naziv</Label>
                  <Input 
                    value={newType.name} 
                    onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                    placeholder="npr. Dvokrevetna soba"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cijena (€)</Label>
                    <Input 
                      type="number"
                      value={newType.base_price} 
                      onChange={(e) => setNewType({ ...newType, base_price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Max. osoba</Label>
                    <Input 
                      type="number"
                      value={newType.max_occupancy} 
                      onChange={(e) => setNewType({ ...newType, max_occupancy: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Opis</Label>
                  <Input 
                    value={newType.description} 
                    onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreateType} disabled={!newType.name || createRoomType.isPending}>
                  Spremi
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova soba
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova soba</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Broj sobe</Label>
                  <Input 
                    value={newRoom.room_number} 
                    onChange={(e) => setNewRoom({ ...newRoom, room_number: e.target.value })}
                    placeholder="npr. 101"
                  />
                </div>
                <div>
                  <Label>Tip sobe</Label>
                  <Select value={newRoom.room_type_id} onValueChange={(v) => setNewRoom({ ...newRoom, room_type_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Odaberi tip" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kat</Label>
                  <Input 
                    type="number"
                    value={newRoom.floor} 
                    onChange={(e) => setNewRoom({ ...newRoom, floor: Number(e.target.value) })}
                  />
                </div>
                <Button onClick={handleCreateRoom} disabled={!newRoom.room_number || createRoom.isPending}>
                  Spremi
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Room Types */}
      <Card>
        <CardHeader>
          <CardTitle>Tipovi soba</CardTitle>
        </CardHeader>
        <CardContent>
          {typesLoading ? (
            <Skeleton className="h-20" />
          ) : roomTypes?.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nema definiranih tipova soba</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {roomTypes?.map((type) => (
                <div key={type.id} className="border rounded-lg p-3 bg-card">
                  <div className="font-medium">{type.name}</div>
                  <div className="text-sm text-muted-foreground">
                    €{type.base_price}/noć • Max {type.max_occupancy} osoba
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rooms Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sve sobe ({rooms?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {roomsLoading ? (
            <Skeleton className="h-48" />
          ) : rooms?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nema soba. Dodajte prvu sobu.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Broj sobe</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Kat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms?.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.room_number}</TableCell>
                    <TableCell>{room.room_type?.name || "-"}</TableCell>
                    <TableCell>{room.floor || "-"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[room.status]}>
                        {statusLabels[room.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={room.status} onValueChange={(v) => handleStatusChange(room.id, v)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Slobodno</SelectItem>
                          <SelectItem value="occupied">Zauzeto</SelectItem>
                          <SelectItem value="maintenance">Održavanje</SelectItem>
                          <SelectItem value="cleaning">Čišćenje</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

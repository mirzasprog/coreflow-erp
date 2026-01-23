import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users, Search } from "lucide-react";
import { useHotelGuests, useCreateGuest } from "@/hooks/useHotel";
import { Skeleton } from "@/components/ui/skeleton";

export default function GuestsList() {
  const { data: guests, isLoading } = useHotelGuests();
  const createGuest = useCreateGuest();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newGuest, setNewGuest] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    nationality: "",
    id_document_type: "",
    id_document_number: "",
  });

  const handleCreate = async () => {
    await createGuest.mutateAsync({
      first_name: newGuest.first_name,
      last_name: newGuest.last_name,
      email: newGuest.email || null,
      phone: newGuest.phone || null,
      nationality: newGuest.nationality || null,
      id_document_type: newGuest.id_document_type || null,
      id_document_number: newGuest.id_document_number || null,
      address: null,
      notes: null,
    });
    setNewGuest({ first_name: "", last_name: "", email: "", phone: "", nationality: "", id_document_type: "", id_document_number: "" });
    setDialogOpen(false);
  };

  const filteredGuests = guests?.filter(guest => {
    const search = searchTerm.toLowerCase();
    return (
      guest.first_name.toLowerCase().includes(search) ||
      guest.last_name.toLowerCase().includes(search) ||
      guest.email?.toLowerCase().includes(search) ||
      guest.phone?.includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Gosti
          </h1>
          <p className="text-muted-foreground">Baza podataka o gostima</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novi gost
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novi gost</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ime *</Label>
                  <Input 
                    value={newGuest.first_name} 
                    onChange={(e) => setNewGuest({ ...newGuest, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Prezime *</Label>
                  <Input 
                    value={newGuest.last_name} 
                    onChange={(e) => setNewGuest({ ...newGuest, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={newGuest.email} 
                    onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input 
                    value={newGuest.phone} 
                    onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Nacionalnost</Label>
                <Input 
                  value={newGuest.nationality} 
                  onChange={(e) => setNewGuest({ ...newGuest, nationality: e.target.value })}
                  placeholder="npr. Hrvatska"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tip dokumenta</Label>
                  <Input 
                    value={newGuest.id_document_type} 
                    onChange={(e) => setNewGuest({ ...newGuest, id_document_type: e.target.value })}
                    placeholder="Osobna iskaznica / Putovnica"
                  />
                </div>
                <div>
                  <Label>Broj dokumenta</Label>
                  <Input 
                    value={newGuest.id_document_number} 
                    onChange={(e) => setNewGuest({ ...newGuest, id_document_number: e.target.value })}
                  />
                </div>
              </div>
              <Button 
                onClick={handleCreate} 
                disabled={!newGuest.first_name || !newGuest.last_name || createGuest.isPending}
                className="w-full"
              >
                Spremi gosta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Svi gosti ({guests?.length || 0})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Pretraži goste..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48" />
          ) : filteredGuests?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchTerm ? "Nema rezultata pretrage" : "Nema gostiju. Dodajte prvog gosta."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ime i prezime</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Nacionalnost</TableHead>
                  <TableHead>Dokument</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests?.map((guest) => (
                  <TableRow key={guest.id}>
                    <TableCell className="font-medium">
                      {guest.first_name} {guest.last_name}
                    </TableCell>
                    <TableCell>{guest.email || "-"}</TableCell>
                    <TableCell>{guest.phone || "-"}</TableCell>
                    <TableCell>{guest.nationality || "-"}</TableCell>
                    <TableCell>
                      {guest.id_document_type && guest.id_document_number 
                        ? `${guest.id_document_type}: ${guest.id_document_number}`
                        : "-"
                      }
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

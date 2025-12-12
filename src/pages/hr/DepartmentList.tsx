import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useDepartments, useCreateDepartment, useUpdateDepartment } from "@/hooks/useHR";
import { ArrowLeft, Plus, Edit, Building } from "lucide-react";

export default function DepartmentList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: departments, isLoading } = useDepartments();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const handleSave = async () => {
    if (!code || !name) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    try {
      if (editingId) {
        await updateDepartment.mutateAsync({ id: editingId, code, name });
        toast({ title: "Department updated" });
      } else {
        await createDepartment.mutateAsync({ code, name });
        toast({ title: "Department created" });
      }
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (dept: any) => {
    setEditingId(dept.id);
    setCode(dept.code);
    setName(dept.name);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setCode("");
    setName("");
  };

  return (
    <div>
      <Header title="Departments" subtitle="Odjeli • Organization Structure" />

      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/hr")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to HR
        </Button>

        <div className="module-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">All Departments</h3>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : !departments?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              No departments created yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        {dept.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={dept.active ? "default" : "secondary"}>
                        {dept.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(dept)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Department" : "New Department"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                placeholder="IT"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Information Technology"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createDepartment.isPending || updateDepartment.isPending}>
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

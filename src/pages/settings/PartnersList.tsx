import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Search, Plus, Pencil, Users, Building, Truck } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Partner {
  id: string;
  code: string;
  name: string;
  type: 'supplier' | 'customer' | 'both' | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  payment_terms_days: number | null;
  active: boolean | null;
}

function usePartnersList() {
  return useQuery({
    queryKey: ['partners-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('code');
      
      if (error) throw error;
      return data as Partner[];
    }
  });
}

export default function PartnersList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: partners, isLoading } = usePartnersList();
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editPartner, setEditPartner] = useState<Partner | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'both' as 'supplier' | 'customer' | 'both',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    email: '',
    phone: '',
    tax_id: '',
    payment_terms_days: 30,
    active: true
  });

  const filteredPartners = partners?.filter(partner => {
    const matchesSearch = 
      partner.code.toLowerCase().includes(search.toLowerCase()) ||
      partner.name.toLowerCase().includes(search.toLowerCase()) ||
      partner.email?.toLowerCase().includes(search.toLowerCase()) ||
      partner.tax_id?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || partner.type === typeFilter || partner.type === 'both';
    return matchesSearch && matchesType;
  });

  // Stats
  const suppliersCount = partners?.filter(p => p.type === 'supplier' || p.type === 'both').length || 0;
  const customersCount = partners?.filter(p => p.type === 'customer' || p.type === 'both').length || 0;
  const activeCount = partners?.filter(p => p.active).length || 0;

  const openEditDialog = (partner: Partner) => {
    setEditPartner(partner);
    setFormData({
      code: partner.code,
      name: partner.name,
      type: partner.type || 'both',
      address: partner.address || '',
      city: partner.city || '',
      postal_code: partner.postal_code || '',
      country: partner.country || '',
      email: partner.email || '',
      phone: partner.phone || '',
      tax_id: partner.tax_id || '',
      payment_terms_days: partner.payment_terms_days || 30,
      active: partner.active ?? true
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditPartner(null);
    setFormData({
      code: '',
      name: '',
      type: 'both',
      address: '',
      city: '',
      postal_code: '',
      country: '',
      email: '',
      phone: '',
      tax_id: '',
      payment_terms_days: 30,
      active: true
    });
    setIsDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        code: formData.code,
        name: formData.name,
        type: formData.type,
        address: formData.address || null,
        city: formData.city || null,
        postal_code: formData.postal_code || null,
        country: formData.country || null,
        email: formData.email || null,
        phone: formData.phone || null,
        tax_id: formData.tax_id || null,
        payment_terms_days: formData.payment_terms_days,
        active: formData.active,
        updated_at: new Date().toISOString()
      };

      if (editPartner) {
        const { error } = await supabase
          .from('partners')
          .update(data)
          .eq('id', editPartner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('partners')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners-list'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast({
        title: editPartner ? 'Partner Updated' : 'Partner Created',
        description: `Partner "${formData.name}" has been ${editPartner ? 'updated' : 'created'} successfully`
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const getTypeBadge = (type: string | null) => {
    switch (type) {
      case 'supplier':
        return <Badge className="bg-module-warehouse">Supplier</Badge>;
      case 'customer':
        return <Badge className="bg-module-finance">Customer</Badge>;
      case 'both':
        return <Badge variant="secondary">Both</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div>
      <Header title="Partners" subtitle="Poslovni partneri • Suppliers & Customers" />

      <div className="p-6">
        <div className="mb-4">
          <NavLink to="/settings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Settings
          </NavLink>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Suppliers</CardTitle>
              <Truck className="h-4 w-4 text-module-warehouse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{suppliersCount}</div>
              <p className="text-xs text-muted-foreground">Active suppliers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle>
              <Building className="h-4 w-4 text-module-finance" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customersCount}</div>
              <p className="text-xs text-muted-foreground">Active customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Active</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCount}</div>
              <p className="text-xs text-muted-foreground">Active partners</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Business Partners
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search partners..."
                    className="w-64 pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="supplier">Suppliers</SelectItem>
                    <SelectItem value="customer">Customers</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Partner
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading partners...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Tax ID</TableHead>
                    <TableHead className="text-right">Payment Terms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                        No partners found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPartners?.map((partner) => (
                      <TableRow key={partner.id}>
                        <TableCell className="font-medium">{partner.code}</TableCell>
                        <TableCell>{partner.name}</TableCell>
                        <TableCell>{getTypeBadge(partner.type)}</TableCell>
                        <TableCell>{partner.city || '-'}</TableCell>
                        <TableCell>{partner.email || '-'}</TableCell>
                        <TableCell>{partner.phone || '-'}</TableCell>
                        <TableCell>{partner.tax_id || '-'}</TableCell>
                        <TableCell className="text-right">{partner.payment_terms_days || 30} days</TableCell>
                        <TableCell>
                          <Badge variant={partner.active ? 'default' : 'secondary'}>
                            {partner.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditDialog(partner)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit/Create Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editPartner ? 'Edit Partner' : 'New Partner'}</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="terms">Terms</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">Partner Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g., SUP-001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Partner Type *</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: 'supplier' | 'customer' | 'both') => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="both">Both (Supplier & Customer)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <Label htmlFor="tax_id">Tax ID / VAT Number</Label>
                  <Input
                    id="tax_id"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    placeholder="e.g., BA123456789"
                  />
                </div>

                <div>
                  <Label htmlFor="active">Status</Label>
                  <Select 
                    value={formData.active ? 'true' : 'false'} 
                    onValueChange={(value) => setFormData({ ...formData, active: value === 'true' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="address">Street Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street name and number"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      placeholder="71000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Sarajevo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Bosnia and Herzegovina"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@company.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+387 33 123 456"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="terms" className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="payment_terms_days">Payment Terms (Days)</Label>
                  <Input
                    id="payment_terms_days"
                    type="number"
                    min="0"
                    value={formData.payment_terms_days}
                    onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 0 })}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Number of days for invoice due date calculation
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4">
                  <h4 className="font-medium">Payment Terms Info</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Payment terms define the number of days after invoice date when payment is due.
                    Common values are 15, 30, 45, or 60 days.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !formData.code || !formData.name}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Partner'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

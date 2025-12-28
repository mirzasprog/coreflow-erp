import { useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Plus, 
  Pencil, 
  ArrowLeft,
  FileSpreadsheet,
  FileImage,
  File,
  Loader2,
  Search
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CATEGORIES = [
  'Pravilnici',
  'Procedure',
  'Upute za rad',
  'Sigurnost na radu',
  'Kvaliteta',
  'HR politike',
  'Skladište',
  'Financije',
  'Opći dokumenti'
];

interface CompanyDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string[] | null;
  file_url: string | null;
  file_type: string | null;
  original_filename: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

function useCompanyDocuments() {
  return useQuery({
    queryKey: ['company-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_documents')
        .select('*')
        .order('category')
        .order('title');
      if (error) throw error;
      return data as CompanyDocument[];
    }
  });
}

export default function CompanyDocuments() {
  const queryClient = useQueryClient();
  const { data: documents, isLoading } = useCompanyDocuments();
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editDoc, setEditDoc] = useState<CompanyDocument | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Opći dokumenti',
    content: '',
    keywords: ''
  });

  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.content.toLowerCase().includes(search.toLowerCase()) ||
      doc.keywords?.some(k => k.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        title: formData.title,
        category: formData.category,
        content: formData.content,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        updated_at: new Date().toISOString()
      };

      if (editDoc) {
        const { error } = await supabase
          .from('company_documents')
          .update(data)
          .eq('id', editDoc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_documents')
          .insert({ ...data, active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-documents'] });
      toast.success(editDoc ? 'Dokument ažuriran' : 'Dokument kreiran');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Greška: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_documents')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-documents'] });
      toast.success('Dokument obrisan');
    },
    onError: (error: Error) => {
      toast.error(`Greška: ${error.message}`);
    }
  });

  const resetForm = () => {
    setEditDoc(null);
    setFormData({
      title: '',
      category: 'Opći dokumenti',
      content: '',
      keywords: ''
    });
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (doc: CompanyDocument) => {
    setEditDoc(doc);
    setFormData({
      title: doc.title,
      category: doc.category,
      content: doc.content,
      keywords: doc.keywords?.join(', ') || ''
    });
    setIsDialogOpen(true);
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'image/jpeg',
      'image/png',
      'text/plain',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Nepodržani format datoteke. Podržani: PDF, Word, Excel, slike, TXT, CSV');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Datoteka je prevelika. Maksimalna veličina: 10MB');
      return;
    }

    setIsUploading(true);

    try {
      // Sanitize filename: remove special characters, spaces, and diacritics
      const sanitizedName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
        .replace(/_+/g, '_'); // Remove consecutive underscores
      
      const fileName = `${Date.now()}-${sanitizedName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-docs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Parse the document using edge function
      const { data, error } = await supabase.functions.invoke('parse-document', {
        body: {
          filePath: fileName,
          title: file.name.replace(/\.[^/.]+$/, ''),
          category: formData.category || 'Opći dokumenti',
          keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean)
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      queryClient.invalidateQueries({ queryKey: ['company-documents'] });
      toast.success(`Dokument "${file.name}" uspješno učitan i obrađen`);
      
      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Greška pri uploadu: ${error instanceof Error ? error.message : 'Nepoznata greška'}`);
    } finally {
      setIsUploading(false);
    }
  }, [formData.category, formData.keywords, queryClient]);

  const getFileIcon = (fileType: string | null) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <FileImage className="h-4 w-4 text-purple-500" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div>
      <Header 
        title="Pravilnici i Procedure" 
        subtitle="Upravljanje internim dokumentima za AI asistenta" 
      />

      <div className="p-6">
        <div className="mb-4">
          <NavLink to="/settings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Natrag na Postavke
          </NavLink>
        </div>

        {/* Upload Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Učitaj dokument
            </CardTitle>
            <CardDescription>
              Učitajte PDF, Word, Excel ili sliku. Sadržaj će biti automatski ekstrahiran i dostupan AI asistentu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Kategorija za upload</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({...formData, category: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ključne riječi (opciono)</Label>
                <Input
                  placeholder="npr: skladište, prijem, roba"
                  value={formData.keywords}
                  onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                />
              </div>
              <div className="flex items-end">
                <div className="w-full">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-muted-foreground/50 p-3 hover:bg-muted/50 transition-colors">
                      {isUploading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Obrađujem...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5" />
                          <span>Odaberi datoteku</span>
                        </>
                      )}
                    </div>
                  </Label>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.jpg,.jpeg,.png,.txt,.csv"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Podržani formati: PDF, Word (.docx, .doc), Excel (.xlsx, .xls), slike (JPG, PNG), TXT, CSV. Maks. 10MB.
            </p>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dokumenti ({documents?.length || 0})
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Pretraži..."
                    className="w-48 pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Kategorija" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Sve kategorije</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ručni unos
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Učitavam...</div>
            ) : filteredDocuments?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nema dokumenata. Učitajte dokument ili dodajte ručno.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naslov</TableHead>
                    <TableHead>Kategorija</TableHead>
                    <TableHead>Ključne riječi</TableHead>
                    <TableHead>Izvor</TableHead>
                    <TableHead>Sadržaj</TableHead>
                    <TableHead className="text-right">Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments?.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {doc.file_type ? getFileIcon(doc.file_type) : <FileText className="h-4 w-4" />}
                          {doc.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{doc.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {doc.keywords?.slice(0, 3).map((kw, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                          ))}
                          {doc.keywords && doc.keywords.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{doc.keywords.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.original_filename ? (
                          <span className="text-xs text-muted-foreground">{doc.original_filename}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Ručni unos</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {doc.content.length > 100 
                            ? `${doc.content.substring(0, 100)}...` 
                            : doc.content}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(doc)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              if (confirm('Jeste li sigurni da želite obrisati ovaj dokument?')) {
                                deleteMutation.mutate(doc.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDoc ? 'Uredi dokument' : 'Novi dokument'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="title">Naslov *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="npr: Procedura za prijem robe"
              />
            </div>
            <div>
              <Label htmlFor="category">Kategorija *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({...formData, category: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="keywords">Ključne riječi (odvojene zarezom)</Label>
              <Input
                id="keywords"
                value={formData.keywords}
                onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                placeholder="npr: skladište, prijem, roba, dobavljač"
              />
            </div>
            <div>
              <Label htmlFor="content">Sadržaj *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="Unesite sadržaj pravilnika ili procedure..."
                className="min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Odustani
            </Button>
            <Button 
              onClick={() => saveMutation.mutate()} 
              disabled={!formData.title || !formData.content || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Spremam...
                </>
              ) : (
                'Spremi'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

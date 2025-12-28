import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { hr } from 'date-fns/locale';
import { MessageSquare, AlertTriangle, CheckCircle, Plus, Eye, Trash2 } from 'lucide-react';

interface ChatHistory {
  id: string;
  question: string;
  answer: string;
  was_helpful: boolean | null;
  has_knowledge_gap: boolean;
  suggested_answer: string | null;
  resolved: boolean;
  created_at: string;
}

export default function ChatbotHistory() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'gaps' | 'resolved'>('all');
  const [selectedChat, setSelectedChat] = useState<ChatHistory | null>(null);
  const [isAddingToKnowledge, setIsAddingToKnowledge] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocKeywords, setNewDocKeywords] = useState('');

  const { data: history, isLoading } = useQuery({
    queryKey: ['chatbot-history', filter],
    queryFn: async () => {
      let query = supabase
        .from('chatbot_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (filter === 'gaps') {
        query = query.eq('has_knowledge_gap', true).eq('resolved', false);
      } else if (filter === 'resolved') {
        query = query.eq('resolved', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ChatHistory[];
    }
  });

  const markResolvedMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('chatbot_history')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-history'] });
      toast.success('Označeno kao riješeno');
    },
    onError: () => {
      toast.error('Greška pri označavanju');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('chatbot_history')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-history'] });
      toast.success('Obrisano');
    },
    onError: () => {
      toast.error('Greška pri brisanju');
    }
  });

  const addToKnowledgeMutation = useMutation({
    mutationFn: async () => {
      const keywords = newDocKeywords.split(',').map(k => k.trim()).filter(Boolean);
      
      const { error } = await supabase
        .from('company_documents')
        .insert({
          title: newDocTitle,
          category: newDocCategory,
          content: newDocContent,
          keywords: keywords,
          active: true
        });
      
      if (error) throw error;

      // Mark the chat as resolved
      if (selectedChat) {
        await supabase
          .from('chatbot_history')
          .update({ 
            resolved: true, 
            resolved_at: new Date().toISOString(),
            suggested_answer: newDocContent 
          })
          .eq('id', selectedChat.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-history'] });
      queryClient.invalidateQueries({ queryKey: ['company-documents'] });
      toast.success('Dokument dodan u bazu znanja');
      setIsAddingToKnowledge(false);
      setSelectedChat(null);
      resetForm();
    },
    onError: (error) => {
      console.error('Error adding to knowledge:', error);
      toast.error('Greška pri dodavanju dokumenta');
    }
  });

  const resetForm = () => {
    setNewDocTitle('');
    setNewDocCategory('');
    setNewDocContent('');
    setNewDocKeywords('');
  };

  const openAddToKnowledge = (chat: ChatHistory) => {
    setSelectedChat(chat);
    setNewDocTitle(`Odgovor na: ${chat.question.substring(0, 50)}...`);
    setNewDocKeywords(chat.question.split(' ').filter(w => w.length > 3).join(', '));
    setIsAddingToKnowledge(true);
  };

  const gapsCount = history?.filter(h => h.has_knowledge_gap && !h.resolved).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Povijest Chatbota
          </h1>
          <p className="text-muted-foreground">
            Pregled pitanja i odgovora AI asistenta
          </p>
        </div>
        {gapsCount > 0 && (
          <Badge variant="destructive" className="text-sm">
            <AlertTriangle className="h-4 w-4 mr-1" />
            {gapsCount} neodgovorenih pitanja
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pitanja i odgovori</CardTitle>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sva pitanja</SelectItem>
                <SelectItem value="gaps">Nedostaje odgovor</SelectItem>
                <SelectItem value="resolved">Riješeno</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CardDescription>
            Pitanja koja zahtijevaju dodavanje dokumentacije označena su oznakom
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Učitavam...</div>
          ) : history?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nema povijesti</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Pitanje</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history?.map((chat) => (
                  <TableRow key={chat.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(chat.created_at), 'dd.MM.yyyy HH:mm', { locale: hr })}
                    </TableCell>
                    <TableCell className="max-w-md truncate">{chat.question}</TableCell>
                    <TableCell>
                      {chat.resolved ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Riješeno
                        </Badge>
                      ) : chat.has_knowledge_gap ? (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Nedostaje
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Odgovoreno</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedChat(chat)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {chat.has_knowledge_gap && !chat.resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAddToKnowledge(chat)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Dodaj
                          </Button>
                        )}
                        {!chat.resolved && !chat.has_knowledge_gap && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markResolvedMutation.mutate(chat.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(chat.id)}
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

      {/* View Chat Dialog */}
      <Dialog open={!!selectedChat && !isAddingToKnowledge} onOpenChange={() => setSelectedChat(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalji razgovora</DialogTitle>
            <DialogDescription>
              {selectedChat && format(new Date(selectedChat.created_at), 'dd.MM.yyyy HH:mm', { locale: hr })}
            </DialogDescription>
          </DialogHeader>
          {selectedChat && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Pitanje:</Label>
                <div className="mt-1 p-3 bg-primary/10 rounded-lg">
                  {selectedChat.question}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Odgovor:</Label>
                <div className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedChat.answer}
                </div>
              </div>
              {selectedChat.has_knowledge_gap && !selectedChat.resolved && (
                <div className="flex justify-end">
                  <Button onClick={() => openAddToKnowledge(selectedChat)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj u bazu znanja
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add to Knowledge Dialog */}
      <Dialog open={isAddingToKnowledge} onOpenChange={setIsAddingToKnowledge}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dodaj u bazu znanja</DialogTitle>
            <DialogDescription>
              Kreiraj dokument za odgovor na pitanje: "{selectedChat?.question.substring(0, 100)}..."
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="doc-title">Naslov dokumenta</Label>
              <Input
                id="doc-title"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="npr. Uputa za promjenu računa na Office 365"
              />
            </div>
            <div>
              <Label htmlFor="doc-category">Kategorija</Label>
              <Select value={newDocCategory} onValueChange={setNewDocCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Odaberi kategoriju" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IT upute">IT upute</SelectItem>
                  <SelectItem value="HR procedure">HR procedure</SelectItem>
                  <SelectItem value="Skladište">Skladište</SelectItem>
                  <SelectItem value="Financije">Financije</SelectItem>
                  <SelectItem value="Opće">Opće</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="doc-keywords">Ključne riječi (odvojene zarezom)</Label>
              <Input
                id="doc-keywords"
                value={newDocKeywords}
                onChange={(e) => setNewDocKeywords(e.target.value)}
                placeholder="office, 365, račun, korisnik"
              />
            </div>
            <div>
              <Label htmlFor="doc-content">Sadržaj dokumenta</Label>
              <Textarea
                id="doc-content"
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
                placeholder="Unesite detaljan sadržaj dokumenta koji će AI koristiti za odgovaranje..."
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingToKnowledge(false)}>
              Odustani
            </Button>
            <Button 
              onClick={() => addToKnowledgeMutation.mutate()}
              disabled={!newDocTitle || !newDocCategory || !newDocContent}
            >
              Spremi dokument
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

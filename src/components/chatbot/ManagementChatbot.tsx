import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, Loader2, Bot, User, Download, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { ChatChart } from './ChatChart';
import { 
  parseChartData, 
  parseExportData, 
  exportChatToExcel, 
  exportChatToPdf, 
  exportToWord,
  ChartData,
  ExportData
} from './ChatExportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  charts?: ChartData[];
  exportData?: ExportData[];
}

export function ManagementChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Pozdrav! Ja sam vaš AI asistent za upravljanje. Mogu vam pomoći s informacijama o:\n\n• Isteku robe i LOT brojevi\n• Aktivnim narudžbama\n• Stanju zaliha\n• Prodaji i analizi\n• Internim pravilnicima i procedurama\n• Uputama za korištenje ERP-a\n\n📊 Mogu kreirati grafikone za vizualni prikaz!\n📥 Možete exportirati analize u Excel, PDF ili Word!\n\nKako vam mogu pomoći?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('management-chat', {
        body: { message: userMessage, userId: user?.id }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        toast.error(data.error);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.error 
        }]);
      } else {
        const rawReply = data.reply || 'Sorry, I cannot answer that question.';
        
        // Parse charts and export data from the response
        const { text: textAfterCharts, charts } = parseChartData(rawReply);
        const { text: finalText, exports } = parseExportData(textAfterCharts);
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: finalText,
          charts: charts.length > 0 ? charts : undefined,
          exportData: exports.length > 0 ? exports : undefined
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Error sending message');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'An error occurred. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleExport = (format: 'excel' | 'pdf' | 'word', msg: Message) => {
    const title = 'AI Analiza';
    
    if (msg.exportData && msg.exportData.length > 0) {
      const exportData = msg.exportData[0];
      
      switch (format) {
        case 'excel':
          exportChatToExcel(exportData);
          toast.success('Excel datoteka preuzeta!');
          break;
        case 'pdf':
          exportChatToPdf(exportData.title, msg.content, exportData);
          break;
        case 'word':
          exportToWord(exportData.title, msg.content, exportData);
          toast.success('Word datoteka preuzeta!');
          break;
      }
    } else {
      // Export just the text content
      switch (format) {
        case 'excel':
          const rows = msg.content.split('\n').filter(line => line.trim());
          exportChatToExcel({
            title,
            columns: ['Sadržaj'],
            rows: rows.map(line => [line])
          });
          toast.success('Excel datoteka preuzeta!');
          break;
        case 'pdf':
          exportChatToPdf(title, msg.content);
          break;
        case 'word':
          exportToWord(title, msg.content);
          toast.success('Word datoteka preuzeta!');
          break;
      }
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[420px] h-[550px] shadow-xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Asistent
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i}>
                <div
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Render charts */}
                {msg.charts && msg.charts.length > 0 && (
                  <div className="ml-10 mt-2">
                    {msg.charts.map((chart, idx) => (
                      <ChatChart key={idx} chart={chart} />
                    ))}
                  </div>
                )}
                
                {/* Export buttons for assistant messages with substantial content */}
                {msg.role === 'assistant' && msg.content.length > 100 && i > 0 && (
                  <div className="ml-10 mt-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => handleExport('excel', msg)}>
                          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                          Excel (.xlsx)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('pdf', msg)}>
                          <FileText className="h-4 w-4 mr-2 text-red-600" />
                          PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('word', msg)}>
                          <FileType className="h-4 w-4 mr-2 text-blue-600" />
                          Word (.doc)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Postavite pitanje... (bilo koji jezik)"
              disabled={isLoading}
            />
            <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

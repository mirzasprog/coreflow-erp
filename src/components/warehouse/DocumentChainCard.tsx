import { FileText, Package, ClipboardList, Receipt, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NavLink } from '@/components/NavLink';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

interface DocumentLink {
  id: string;
  number: string;
  type: 'purchase_order' | 'goods_receipt' | 'goods_issue' | 'picking_order' | 'invoice';
  status: string;
  date?: string;
}

interface DocumentChainCardProps {
  documents: DocumentLink[];
  title?: string;
  className?: string;
}

const documentConfig = {
  purchase_order: {
    icon: FileText,
    label: 'Narudžbenica',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    getLink: (id: string) => `/warehouse/purchase-orders/${id}`
  },
  goods_receipt: {
    icon: Package,
    label: 'Primka',
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    getLink: (id: string) => `/warehouse/receipts/${id}`
  },
  goods_issue: {
    icon: Package,
    label: 'Izdatnica',
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    getLink: (id: string) => `/warehouse/issues/${id}`
  },
  picking_order: {
    icon: ClipboardList,
    label: 'Picking nalog',
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    getLink: () => '/warehouse/picking'
  },
  invoice: {
    icon: Receipt,
    label: 'Faktura',
    color: 'text-module-finance',
    bgColor: 'bg-module-finance/10',
    getLink: (id: string, isIncoming?: boolean) => 
      isIncoming ? `/finance/invoices/incoming/${id}` : `/finance/invoices/outgoing/${id}`
  }
};

const getStatusTone = (status: string) => {
  if (status === 'draft' || status === 'open') return 'draft';
  if (status === 'ordered' || status === 'in_progress') return 'approved';
  if (status === 'posted' || status === 'received' || status === 'completed') return 'posted';
  if (status === 'paid' || status === 'cancelled' || status === 'closed') return 'closed';
  return 'draft';
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    draft: 'Nacrt',
    open: 'Otvoren',
    ordered: 'Naručeno',
    in_progress: 'U tijeku',
    posted: 'Proknjiženo',
    received: 'Primljeno',
    completed: 'Završeno',
    paid: 'Plaćeno',
    cancelled: 'Otkazano',
    closed: 'Zatvoreno'
  };
  return labels[status] || status;
};

export function DocumentChainCard({ documents, title = 'Lanac dokumenata', className }: DocumentChainCardProps) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRight className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 flex-wrap">
          {documents.map((doc, index) => {
            const config = documentConfig[doc.type];
            const Icon = config.icon;
            const isLast = index === documents.length - 1;

            return (
              <div key={doc.id} className="flex items-center gap-2">
                <NavLink
                  to={config.getLink(doc.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-muted/50',
                    config.bgColor
                  )}
                >
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <div>
                    <p className="text-xs font-medium">{config.label}</p>
                    <p className="text-[10px] text-muted-foreground">{doc.number}</p>
                  </div>
                  <StatusBadge
                    tone={getStatusTone(doc.status)}
                    label={getStatusLabel(doc.status)}
                    className="text-[10px] px-1.5 py-0.5 ml-1"
                  />
                </NavLink>
                {!isLast && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

import { CheckCircle, Circle, Clock, FileText, Package, Send, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineStep {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'upcoming';
  date?: string;
  icon: React.ElementType;
}

interface DocumentTimelineProps {
  currentStatus: string;
  documentType: 'purchase_order' | 'goods_issue' | 'goods_receipt';
  dates?: {
    created?: string;
    ordered?: string;
    received?: string;
    invoiced?: string;
    posted?: string;
  };
}

export function DocumentTimeline({ currentStatus, documentType, dates }: DocumentTimelineProps) {
  const getSteps = (): TimelineStep[] => {
    if (documentType === 'purchase_order') {
      const statusOrder = ['draft', 'ordered', 'received', 'invoiced'];
      const currentIndex = statusOrder.indexOf(currentStatus);
      
      return [
        {
          id: 'draft',
          label: 'Nacrt',
          status: currentIndex > 0 ? 'completed' : currentIndex === 0 ? 'current' : 'upcoming',
          date: dates?.created,
          icon: FileText
        },
        {
          id: 'ordered',
          label: 'Naručeno',
          status: currentIndex > 1 ? 'completed' : currentIndex === 1 ? 'current' : 'upcoming',
          date: dates?.ordered,
          icon: Send
        },
        {
          id: 'received',
          label: 'Primljeno',
          status: currentIndex > 2 ? 'completed' : currentIndex === 2 ? 'current' : 'upcoming',
          date: dates?.received,
          icon: Package
        },
        {
          id: 'invoiced',
          label: 'Fakturirano',
          status: currentIndex >= 3 ? 'completed' : 'upcoming',
          date: dates?.invoiced,
          icon: FileText
        }
      ];
    }
    
    if (documentType === 'goods_issue') {
      const statusOrder = ['draft', 'posted', 'picked', 'delivered'];
      const currentIndex = statusOrder.indexOf(currentStatus);
      
      return [
        {
          id: 'draft',
          label: 'Nacrt',
          status: currentIndex > 0 ? 'completed' : currentIndex === 0 ? 'current' : 'upcoming',
          date: dates?.created,
          icon: FileText
        },
        {
          id: 'posted',
          label: 'Proknjiženo',
          status: currentIndex > 1 ? 'completed' : currentIndex === 1 ? 'current' : 'upcoming',
          date: dates?.posted,
          icon: CheckCircle
        },
        {
          id: 'picked',
          label: 'Komisionirano',
          status: currentIndex > 2 ? 'completed' : currentIndex === 2 ? 'current' : 'upcoming',
          icon: Package
        },
        {
          id: 'delivered',
          label: 'Isporučeno',
          status: currentIndex >= 3 ? 'completed' : 'upcoming',
          icon: Truck
        }
      ];
    }
    
    // goods_receipt
    const statusOrder = ['draft', 'posted'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    return [
      {
        id: 'draft',
        label: 'Nacrt',
        status: currentIndex > 0 ? 'completed' : currentIndex === 0 ? 'current' : 'upcoming',
        date: dates?.created,
        icon: FileText
      },
      {
        id: 'posted',
        label: 'Proknjiženo',
        status: currentIndex >= 1 ? 'completed' : 'upcoming',
        date: dates?.posted,
        icon: CheckCircle
      }
    ];
  };

  const steps = getSteps();

  return (
    <div className="flex items-center justify-between w-full py-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isLast = index === steps.length - 1;
        
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                  step.status === 'completed' && 'bg-green-600 border-green-600 text-white',
                  step.status === 'current' && 'bg-primary border-primary text-primary-foreground',
                  step.status === 'upcoming' && 'bg-muted border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {step.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : step.status === 'current' ? (
                  <Icon className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium text-center',
                  step.status === 'completed' && 'text-green-600',
                  step.status === 'current' && 'text-primary',
                  step.status === 'upcoming' && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
              {step.date && (
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(step.date).toLocaleDateString('hr-HR')}
                </span>
              )}
            </div>
            {!isLast && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2',
                  step.status === 'completed' ? 'bg-green-600' : 'bg-muted-foreground/30'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

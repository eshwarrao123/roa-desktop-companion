import React from 'react';
import { ToolActivity } from '@shared/types/ai';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface ToolActionReceiptProps {
  activity: ToolActivity;
}

export const ToolActionReceipt: React.FC<ToolActionReceiptProps> = ({ activity }) => {
  const isCompleted = activity.status === 'completed';
  const isRunning = activity.status === 'running';

  return (
    <div className="flex items-start gap-2 py-2 border-t border-roa-divider">
      {isRunning && <Loader2 className="w-3.5 h-3.5 text-roa-primary-sage animate-spin mt-0.5 flex-shrink-0" />}
      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-roa-primary-sage mt-0.5 flex-shrink-0" />}
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-roa-text-secondary">
          {activity.label}
        </p>
        {activity.details && (
          <p className="text-xs text-roa-text-muted mt-0.5">
            {activity.details}
          </p>
        )}
      </div>
    </div>
  );
};

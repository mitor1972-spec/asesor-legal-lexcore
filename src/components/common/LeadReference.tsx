import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface LeadReferenceProps {
  leadId: string;
  conversationId?: number | null;
  chatwootAlias?: string | null;
  variant?: 'full' | 'compact' | 'inline';
}

export function LeadReference({ 
  leadId, 
  conversationId, 
  chatwootAlias, 
  variant = 'compact' 
}: LeadReferenceProps) {
  const [copied, setCopied] = useState(false);
  
  const shortId = leadId.substring(0, 8);
  
  const handleCopy = () => {
    const refText = conversationId 
      ? `Lead: ${shortId} | Conv: ${conversationId}${chatwootAlias ? ` | Alias: ${chatwootAlias}` : ''}`
      : `Lead: ${shortId}`;
    
    navigator.clipboard.writeText(refText);
    setCopied(true);
    toast.success('Referencia copiada');
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'inline') {
    return (
      <span className="text-xs font-mono text-muted-foreground">
        #{shortId}
        {conversationId && <span className="ml-1">| C:{conversationId}</span>}
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <button 
        onClick={handleCopy}
        className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        title="Copiar referencia"
      >
        <span className="bg-muted px-1.5 py-0.5 rounded">#{shortId}</span>
        {conversationId && (
          <span className="bg-muted/50 px-1.5 py-0.5 rounded">C:{conversationId}</span>
        )}
        {copied ? (
          <Check className="h-3 w-3 text-success" />
        ) : (
          <Copy className="h-3 w-3 opacity-50" />
        )}
      </button>
    );
  }

  // Full variant
  return (
    <div className="flex flex-col gap-1 text-xs font-mono">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">ID Lead:</span>
        <Badge variant="outline" className="font-mono">{shortId}</Badge>
      </div>
      {conversationId && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Conversación:</span>
          <Badge variant="secondary" className="font-mono">{conversationId}</Badge>
        </div>
      )}
      {chatwootAlias && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Alias:</span>
          <Badge variant="outline" className="font-mono text-xs">{chatwootAlias}</Badge>
        </div>
      )}
      <button 
        onClick={handleCopy}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mt-1"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-success" />
            <span>Copiado</span>
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            <span>Copiar referencia</span>
          </>
        )}
      </button>
    </div>
  );
}

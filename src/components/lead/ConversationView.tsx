import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, User, Bot } from 'lucide-react';

interface ConversationViewProps {
  leadText: string;
}

export function ConversationView({ leadText }: ConversationViewProps) {
  // Try to parse the conversation into messages
  const parseMessages = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const messages: { role: 'user' | 'agent' | 'system'; content: string }[] = [];
    
    let currentMessage = '';
    let currentRole: 'user' | 'agent' | 'system' = 'system';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Common patterns for user messages
      if (
        lowerLine.startsWith('cliente:') ||
        lowerLine.startsWith('usuario:') ||
        lowerLine.startsWith('user:') ||
        lowerLine.startsWith('c:') ||
        lowerLine.includes('[cliente]') ||
        lowerLine.includes('[usuario]')
      ) {
        if (currentMessage.trim()) {
          messages.push({ role: currentRole, content: currentMessage.trim() });
        }
        currentRole = 'user';
        currentMessage = line.replace(/^(cliente|usuario|user|c):\s*/i, '').replace(/\[(cliente|usuario)\]\s*/i, '');
      }
      // Common patterns for agent messages
      else if (
        lowerLine.startsWith('agente:') ||
        lowerLine.startsWith('operador:') ||
        lowerLine.startsWith('asistente:') ||
        lowerLine.startsWith('agent:') ||
        lowerLine.startsWith('a:') ||
        lowerLine.includes('[agente]') ||
        lowerLine.includes('[asistente]')
      ) {
        if (currentMessage.trim()) {
          messages.push({ role: currentRole, content: currentMessage.trim() });
        }
        currentRole = 'agent';
        currentMessage = line.replace(/^(agente|operador|asistente|agent|a):\s*/i, '').replace(/\[(agente|asistente)\]\s*/i, '');
      }
      else {
        currentMessage += (currentMessage ? '\n' : '') + line;
      }
    }

    // Add last message
    if (currentMessage.trim()) {
      messages.push({ role: currentRole, content: currentMessage.trim() });
    }

    // If no clear structure was found, return the whole text as a single system message
    if (messages.length === 0 || (messages.length === 1 && messages[0].role === 'system')) {
      return [{ role: 'system' as const, content: text }];
    }

    return messages;
  };

  const messages = parseMessages(leadText);
  const hasStructuredConversation = messages.some(m => m.role !== 'system');

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversación Original
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {hasStructuredConversation ? (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-start' : 'justify-start'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-primary/10 text-primary' 
                      : message.role === 'agent'
                      ? 'bg-blue-500/10 text-blue-600'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : message.role === 'agent' ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </div>
                  <div className={`flex-1 rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary/5 border border-primary/10'
                      : message.role === 'agent'
                      ? 'bg-blue-500/5 border border-blue-500/10'
                      : 'bg-muted'
                  }`}>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {message.role === 'user' ? 'Cliente' : message.role === 'agent' ? 'Agente' : 'Mensaje'}
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {leadText}
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLawfirmProfile } from '@/hooks/useLawfirmProfile';
import { Bot, Send, Sparkles, FileText, ArrowRight, Loader2, User, CheckCircle2 } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';

const LEGAL_AREAS = [
  'Derecho de Familia', 'Derecho Penal', 'Derecho Laboral', 'Accidentes de Tráfico',
  'Derecho Civil', 'Derecho Inmobiliario', 'Herencias y Sucesiones', 'Derecho Mercantil',
  'Extranjería', 'Derecho Administrativo', 'Negligencias Médicas', 'Derecho Bancario',
  'Propiedad Intelectual', 'Derecho Tecnológico', 'Derecho Tributario', 'Seguros',
  'Consumidores', 'Derecho Ambiental', 'Urbanismo',
];

const PROVINCES = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Málaga', 'Zaragoza', 'Bilbao',
  'Alicante', 'Murcia', 'Las Palmas', 'A Coruña', 'Granada', 'Salamanca',
  'Toda España',
];

type Msg = { role: 'user' | 'assistant'; content: string };

function ChatAssistant() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content: '¡Hola! 👋 Soy tu asesor comercial de LexMarket. Estoy aquí para ayudarte a encontrar la mejor estrategia de captación de clientes para tu despacho.\n\nCuéntame un poco sobre tu despacho: ¿en qué áreas del derecho trabajáis? ¿En qué provincias operáis? ¿Tenéis algún presupuesto en mente?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSendSummary, setShowSendSummary] = useState(false);
  const [summarySent, setSummarySent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthContext();
  const { data: lawfirm } = useLawfirmProfile();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Show "send summary" after 4+ exchanges
  useEffect(() => {
    const userMsgCount = messages.filter((m) => m.role === 'user').length;
    if (userMsgCount >= 3) setShowSendSummary(true);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/commercial-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Error del asistente');
      }

      if (!resp.body) throw new Error('No stream');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && prev.length > 1 && prev[prev.length - 2]?.role === 'user' && prev[prev.length - 2]?.content === userMsg.content) {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al conectar con el asistente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSummary = async () => {
    if (!lawfirm) return;
    try {
      const conversationText = messages
        .map((m) => `${m.role === 'user' ? 'ABOGADO' : 'ASISTENTE'}: ${m.content}`)
        .join('\n\n');

      const { error } = await supabase.from('commercial_requests').insert({
        lawfirm_id: lawfirm.id,
        request_type: 'ai_assistant',
        conversation_summary: conversationText,
        conversation_messages: messages,
      } as any);

      if (error) throw error;
      setSummarySent(true);
      toast.success('¡Resumen enviado! Nuestro equipo comercial te contactará pronto.');
    } catch (e: any) {
      toast.error('Error al enviar el resumen');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <ScrollArea ref={scrollRef} className="flex-1 pr-4">
        <div className="space-y-4 pb-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lawfirm-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-lawfirm-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-lawfirm-primary text-white rounded-br-md'
                    : 'bg-muted rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lawfirm-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-lawfirm-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {showSendSummary && !summarySent && (
        <div className="py-2 px-4 bg-lawfirm-primary/5 border border-lawfirm-primary/20 rounded-lg mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-lawfirm-primary" />
            <span>¿Quieres que nuestro equipo te contacte con una propuesta personalizada?</span>
          </div>
          <Button size="sm" onClick={handleSendSummary}>
            <Send className="h-3 w-3 mr-1" />
            Enviar resumen
          </Button>
        </div>
      )}

      {summarySent && (
        <div className="py-2 px-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg mb-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
          <CheckCircle2 className="h-4 w-4" />
          Resumen enviado. Nuestro equipo comercial te contactará pronto.
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Escribe tu mensaje..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function DelegateStrategyForm() {
  const { user } = useAuthContext();
  const { data: lawfirm } = useLawfirmProfile();
  const [strategyMode, setStrategyMode] = useState('advertising_plus_contacts');
  const [provinces, setProvinces] = useState<string[]>([]);
  const [legalAreas, setLegalAreas] = useState<string[]>([]);
  const [otherSpecialty, setOtherSpecialty] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!lawfirm) return;
    if (provinces.length === 0 || legalAreas.length === 0 || !budget) {
      toast.error('Rellena al menos provincias, áreas legales y presupuesto');
      return;
    }
    setLoading(true);
    try {
      const specialtiesSuggested = otherSpecialty
        ? otherSpecialty.split(',').map((s) => s.trim()).filter(Boolean)
        : null;

      const { error } = await supabase.from('commercial_requests').insert({
        lawfirm_id: lawfirm.id,
        request_type: 'delegate_strategy',
        strategy_mode: strategyMode,
        provinces,
        legal_areas: legalAreas,
        specialties_suggested: specialtiesSuggested,
        monthly_budget: parseFloat(budget),
        conversation_summary: notes || null,
      } as any);

      if (error) throw error;
      setSubmitted(true);
      toast.success('¡Solicitud enviada! Te contactaremos con tu estrategia personalizada.');
    } catch (e: any) {
      toast.error('Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-display font-bold">¡Solicitud recibida!</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Nuestro equipo comercial revisará tus necesidades y te contactará con una estrategia
            personalizada para maximizar tu presupuesto de {budget}€/mes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-lawfirm-primary" />
          Dejadnos crear vuestra estrategia
        </CardTitle>
        <CardDescription>
          Rellena este formulario y nuestro equipo diseñará la mejor estrategia para maximizar tu inversión.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strategy mode */}
        <div className="space-y-2">
          <Label className="font-medium">¿Qué tipo de estrategia te interesa?</Label>
          <Select value={strategyMode} onValueChange={setStrategyMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="advertising_only">Solo publicidad y visibilidad</SelectItem>
              <SelectItem value="advertising_plus_contacts">Publicidad + compra de contactos</SelectItem>
              <SelectItem value="contacts_only">Solo compra de contactos / comisión</SelectItem>
              <SelectItem value="full_360">Estrategia 360° (todo incluido)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Provinces */}
        <div className="space-y-2">
          <Label className="font-medium">Provincias donde operáis *</Label>
          <MultiSelect
            options={PROVINCES}
            selected={provinces}
            onChange={setProvinces}
            placeholder="Selecciona provincias..."
          />
        </div>

        {/* Legal areas */}
        <div className="space-y-2">
          <Label className="font-medium">Áreas del derecho *</Label>
          <MultiSelect
            options={LEGAL_AREAS}
            selected={legalAreas}
            onChange={setLegalAreas}
            placeholder="Selecciona áreas legales..."
          />
        </div>

        {/* Other specialties */}
        <div className="space-y-2">
          <Label className="font-medium">¿Alguna especialidad no listada?</Label>
          <Input
            value={otherSpecialty}
            onChange={(e) => setOtherSpecialty(e.target.value)}
            placeholder="Ej: Derecho espacial, Criptomonedas... (separar con comas)"
          />
          <p className="text-xs text-muted-foreground">
            Si tu especialidad no aparece arriba, indícala aquí y la valoraremos.
          </p>
        </div>

        {/* Budget */}
        <div className="space-y-2">
          <Label className="font-medium">Presupuesto mensual (€) *</Label>
          <Input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Ej: 500"
            min={50}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="font-medium">Notas adicionales</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cualquier información adicional que nos ayude a diseñar tu estrategia..."
            rows={3}
          />
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full" size="lg">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Enviar solicitud
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LawfirmCommercialAssistant() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Bot className="h-6 w-6 text-lawfirm-primary" />
          Asesor Comercial IA
        </h1>
        <p className="text-muted-foreground">
          Tu asistente personal para diseñar la mejor estrategia de captación de clientes
        </p>
      </div>

      <Tabs defaultValue="assistant" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="assistant" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Asistente IA
          </TabsTrigger>
          <TabsTrigger value="delegate" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Crear mi estrategia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <ChatAssistant />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delegate" className="mt-4">
          <DelegateStrategyForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

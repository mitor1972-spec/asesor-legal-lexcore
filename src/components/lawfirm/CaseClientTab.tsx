import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, MapPin, User, Hash, Edit2, Save, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  leadId: string;
  lawfirmId: string;
  fields: Record<string, unknown>;
  contactedAt?: string | null;
}

interface ClientData {
  nombre: string;
  apellidos: string;
  dni_nie_cif: string;
  telefono: string;
  telefono_secundario: string;
  email: string;
  direccion: string;
  codigo_postal: string;
  localidad: string;
  provincia: string;
  preferencia_contacto: string;
  horario_preferido: string;
  observaciones_internas: string;
  estado_contacto: string;
}

const STATUS_LABELS: Record<string, string> = {
  no_contactado: 'No contactado',
  contactado: 'Contactado',
  pendiente_documentacion: 'Pendiente documentación',
  documentacion_recibida: 'Documentación recibida',
  pendiente_hoja_encargo: 'Pendiente hoja de encargo',
  hoja_enviada: 'Hoja enviada',
  hoja_firmada: 'Hoja firmada',
  pendiente_pago: 'Pendiente pago',
  en_estudio: 'En estudio',
  en_tramitacion: 'En tramitación',
  cerrado_ganado: 'Cerrado ganado',
  cerrado_perdido: 'Cerrado perdido',
};

const PREFERENCE_LABELS: Record<string, string> = {
  telefono: 'Teléfono',
  email: 'Email',
  whatsapp: 'WhatsApp',
  cualquiera: 'Cualquiera',
};

function buildInitialData(fields: Record<string, unknown>): ClientData {
  const f = fields || {};
  return {
    nombre: (f.nombre as string) || '',
    apellidos: (f.apellidos as string) || '',
    dni_nie_cif: (f.dni_nie_cif as string) || (f.dni as string) || (f.nie as string) || (f.cif as string) || '',
    telefono: (f.telefono as string) || '',
    telefono_secundario: (f.telefono_secundario as string) || '',
    email: (f.email as string) || '',
    direccion: (f.direccion as string) || '',
    codigo_postal: (f.codigo_postal as string) || '',
    localidad: (f.localidad as string) || (f.ciudad as string) || '',
    provincia: (f.provincia as string) || '',
    preferencia_contacto: (f.preferencia_contacto as string) || 'cualquiera',
    horario_preferido: (f.horario_preferido as string) || '',
    observaciones_internas: (f.observaciones_internas as string) || '',
    estado_contacto: (f.estado_contacto as string) || 'no_contactado',
  };
}

export function CaseClientTab({ leadId, lawfirmId, fields, contactedAt }: Props) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<ClientData>(buildInitialData(fields));
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setData(buildInitialData(fields));
    setHasChanges(false);
  }, [fields]);

  const update = (k: keyof ClientData, v: string) => {
    setData(prev => ({ ...prev, [k]: v }));
    setHasChanges(true);
  };

  const save = useMutation({
    mutationFn: async (next: ClientData) => {
      const previousStatus = (fields?.estado_contacto as string) || 'no_contactado';
      const fullName = `${next.nombre} ${next.apellidos}`.trim();

      const { error } = await supabase
        .from('leads')
        .update({
          structured_fields: {
            ...(fields || {}),
            ...next,
            nombre_completo: fullName || null,
            updated_at: new Date().toISOString(),
          } as any,
        })
        .eq('id', leadId);
      if (error) throw error;

      // Timeline event for status change
      if (previousStatus !== next.estado_contacto) {
        await supabase.from('case_timeline_events').insert({
          lead_id: leadId,
          lawfirm_id: lawfirmId,
          event_type: 'contact_status_changed',
          title: 'Estado de contacto actualizado',
          description: `${STATUS_LABELS[previousStatus] || previousStatus} → ${STATUS_LABELS[next.estado_contacto] || next.estado_contacto}`,
          metadata: { from: previousStatus, to: next.estado_contacto },
        });
      }

      // General edit event
      await supabase.from('case_timeline_events').insert({
        lead_id: leadId,
        lawfirm_id: lawfirmId,
        event_type: 'client_data_updated',
        title: 'Datos del cliente actualizados',
      });
    },
    onSuccess: () => {
      toast.success('Datos guardados');
      setIsEditing(false);
      setHasChanges(false);
      qc.invalidateQueries({ queryKey: ['lawfirm-case'] });
      qc.invalidateQueries({ queryKey: ['case-timeline', leadId] });
    },
    onError: (e: any) => toast.error(e.message || 'Error al guardar'),
  });

  const cancel = () => {
    setData(buildInitialData(fields));
    setHasChanges(false);
    setIsEditing(false);
  };

  const fullName = [data.nombre, data.apellidos].filter(Boolean).join(' ').trim();
  const location = [data.localidad, data.provincia].filter(Boolean).join(', ');

  return (
    <div className="space-y-3">
      {/* Header with edit / save buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <User className="h-4 w-4" />Datos del cliente
        </h3>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button size="sm" variant="ghost" onClick={cancel} disabled={save.isPending}>
                <X className="h-3.5 w-3.5 mr-1" />Cancelar
              </Button>
              <Button size="sm" onClick={() => save.mutate(data)} disabled={!hasChanges || save.isPending}>
                {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Guardar
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-3.5 w-3.5 mr-1" />Editar
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {/* Personal data */}
        <Card className="shadow-soft">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm">Datos personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 py-2 px-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nombre" value={data.nombre} editing={isEditing} onChange={v => update('nombre', v)} />
              <Field label="Apellidos" value={data.apellidos} editing={isEditing} onChange={v => update('apellidos', v)} />
            </div>
            <Field label="DNI / NIE / CIF" value={data.dni_nie_cif} editing={isEditing}
              onChange={v => update('dni_nie_cif', v)} placeholder="12345678A" icon={<Hash className="h-3.5 w-3.5" />} />
            {!isEditing && fullName && (
              <p className="text-xs text-muted-foreground pt-1">Nombre completo: <strong>{fullName}</strong></p>
            )}
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="shadow-soft">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm">Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 py-2 px-3 text-sm">
            <Field label="Teléfono principal" value={data.telefono} editing={isEditing}
              onChange={v => update('telefono', v)} type="tel" icon={<Phone className="h-3.5 w-3.5" />}
              actionHref={!isEditing && data.telefono ? `tel:${data.telefono}` : undefined} actionIcon={<Phone className="h-3 w-3" />} />
            <Field label="Teléfono secundario" value={data.telefono_secundario} editing={isEditing}
              onChange={v => update('telefono_secundario', v)} type="tel" />
            <Field label="Email" value={data.email} editing={isEditing}
              onChange={v => update('email', v)} type="email" icon={<Mail className="h-3.5 w-3.5" />}
              actionHref={!isEditing && data.email ? `mailto:${data.email}` : undefined} actionIcon={<Mail className="h-3 w-3" />} />
            <div>
              <Label className="text-xs">Preferencia de contacto</Label>
              {isEditing ? (
                <Select value={data.preferencia_contacto} onValueChange={v => update('preferencia_contacto', v)}>
                  <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PREFERENCE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{PREFERENCE_LABELS[data.preferencia_contacto] || '—'}</p>
              )}
            </div>
            <Field label="Horario preferido" value={data.horario_preferido} editing={isEditing}
              onChange={v => update('horario_preferido', v)} placeholder="Ej: tardes a partir de las 17h" />
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="shadow-soft">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm">Dirección</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 py-2 px-3 text-sm">
            <Field label="Dirección" value={data.direccion} editing={isEditing}
              onChange={v => update('direccion', v)} icon={<MapPin className="h-3.5 w-3.5" />} />
            <div className="grid grid-cols-3 gap-2">
              <Field label="C.P." value={data.codigo_postal} editing={isEditing}
                onChange={v => update('codigo_postal', v.slice(0, 5))} maxLength={5} />
              <Field label="Localidad" value={data.localidad} editing={isEditing} onChange={v => update('localidad', v)} />
              <Field label="Provincia" value={data.provincia} editing={isEditing} onChange={v => update('provincia', v)} />
            </div>
            {!isEditing && location && (
              <p className="text-xs text-muted-foreground">Ubicación: <strong>{location}</strong></p>
            )}
          </CardContent>
        </Card>

        {/* Status & notes */}
        <Card className="shadow-soft">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm">Estado del caso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 py-2 px-3 text-sm">
            <div>
              <Label className="text-xs">Estado de contacto</Label>
              {isEditing ? (
                <Select value={data.estado_contacto} onValueChange={v => update('estado_contacto', v)}>
                  <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1">
                  {data.estado_contacto === 'no_contactado' ? (
                    <Badge variant="outline" className="text-amber-700 border-amber-300">
                      <AlertCircle className="h-3 w-3 mr-1" />{STATUS_LABELS[data.estado_contacto]}
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />{STATUS_LABELS[data.estado_contacto] || data.estado_contacto}
                    </Badge>
                  )}
                </div>
              )}
              {contactedAt && !isEditing && (
                <p className="text-xs text-muted-foreground mt-1">
                  Primer contacto: {new Date(contactedAt).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Observaciones internas</Label>
              {isEditing ? (
                <Textarea
                  rows={4}
                  className="mt-1 text-sm"
                  placeholder="Notas internas sobre el cliente..."
                  value={data.observaciones_internas}
                  onChange={e => update('observaciones_internas', e.target.value)}
                />
              ) : (
                <p className="text-sm mt-1 whitespace-pre-wrap p-2 bg-muted/50 rounded text-xs min-h-[60px]">
                  {data.observaciones_internas || <span className="text-muted-foreground">Sin observaciones</span>}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label, value, editing, onChange, type = 'text', placeholder, maxLength, icon, actionHref, actionIcon,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  icon?: React.ReactNode;
  actionHref?: string;
  actionIcon?: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs flex items-center gap-1">
        {icon}{label}
      </Label>
      {editing ? (
        <Input
          className="h-8 mt-1 text-sm"
          type={type}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
        />
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm">{value || <span className="text-muted-foreground">—</span>}</span>
          {actionHref && (
            <a href={actionHref} className="text-primary hover:opacity-80">{actionIcon}</a>
          )}
        </div>
      )}
    </div>
  );
}

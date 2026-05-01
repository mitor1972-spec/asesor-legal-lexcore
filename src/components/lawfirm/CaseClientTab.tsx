import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MapPin, User, Hash, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  fields: Record<string, unknown>;
  contactedAt?: string | null;
}

/**
 * Pestaña Cliente — vista consolidada y de solo lectura de los datos del cliente.
 * La edición avanzada (preferencias de contacto, observaciones, estado de contacto)
 * se incorporará en una segunda fase junto con la persistencia de campos extendidos.
 */
export function CaseClientTab({ fields, contactedAt }: Props) {
  const f = fields || {};
  const fullName = [f.nombre, f.apellidos].filter(Boolean).join(' ').trim() || '—';
  const location = [f.ciudad, f.provincia].filter(Boolean).join(', ');

  return (
    <div className="grid md:grid-cols-2 gap-3">
      <Card className="shadow-soft">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2"><User className="h-3.5 w-3.5" />Datos del cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm py-2 px-3">
          <p><strong>Nombre completo:</strong> {fullName}</p>
          {(f.dni || f.nie || f.cif) && (
            <p className="flex items-center gap-2"><Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <strong>Documento:</strong> {(f.dni || f.nie || f.cif) as string}
            </p>
          )}
          <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <strong>Teléfono:</strong> {(f.telefono as string) || '—'}
          </p>
          <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <strong>Email:</strong> {(f.email as string) || '—'}
          </p>
          <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <strong>Ubicación:</strong> {location || '—'}
          </p>
          {f.direccion ? <p><strong>Dirección:</strong> {f.direccion as string}</p> : null}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm">Estado de contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm py-2 px-3">
          {contactedAt ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              Contactado · {new Date(contactedAt).toLocaleDateString('es-ES')}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-700 border-amber-300">
              <AlertCircle className="h-3 w-3 mr-1" />No contactado
            </Badge>
          )}
          {f.notas_cliente ? (
            <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
              <p className="font-medium mb-1">Notas del cliente:</p>
              <p>{f.notas_cliente as string}</p>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground pt-2">
            La edición avanzada del cliente (preferencias de contacto, observaciones internas, gestión completa
            del estado) llegará en la siguiente fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

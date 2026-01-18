import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLawfirmCases } from '@/hooks/useLawfirmCases';
import { LeadTemperature } from '@/components/lead/LeadTemperature';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Briefcase, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const statusLabels: Record<string, string> = {
  received: 'Recibido',
  reviewing: 'Revisando',
  contacted: 'Contactado',
  in_progress: 'En curso',
  won: 'Ganado',
  lost: 'Perdido',
  rejected: 'Rechazado',
  archived: 'Archivado',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  received: 'default',
  reviewing: 'secondary',
  contacted: 'secondary',
  in_progress: 'default',
  won: 'default',
  lost: 'destructive',
  rejected: 'destructive',
  archived: 'outline',
};

export default function LawfirmCases() {
  const { data: cases = [], isLoading } = useLawfirmCases();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Filter cases
  const filteredCases = cases.filter(caseItem => {
    const fields = caseItem.lead?.structured_fields as Record<string, string> | null;
    const searchLower = searchQuery.toLowerCase();
    
    const matchesSearch = !searchQuery || 
      fields?.nombre?.toLowerCase().includes(searchLower) ||
      fields?.area_legal?.toLowerCase().includes(searchLower) ||
      fields?.provincia?.toLowerCase().includes(searchLower) ||
      caseItem.lead?.case_summary?.toLowerCase().includes(searchLower);

    const matchesTab = activeTab === 'all' ||
      (activeTab === 'new' && caseItem.firm_status === 'received') ||
      (activeTab === 'in_progress' && ['reviewing', 'contacted', 'in_progress'].includes(caseItem.firm_status)) ||
      (activeTab === 'closed' && ['won', 'lost', 'rejected', 'archived'].includes(caseItem.firm_status));

    return matchesSearch && matchesTab;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            Mis Casos
          </h1>
          <p className="text-muted-foreground">
            {cases.length} casos asignados a tu despacho
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar casos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Todos ({cases.length})
          </TabsTrigger>
          <TabsTrigger value="new">
            Nuevos ({cases.filter(c => c.firm_status === 'received').length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            En curso ({cases.filter(c => ['reviewing', 'contacted', 'in_progress'].includes(c.firm_status)).length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Cerrados ({cases.filter(c => ['won', 'lost', 'rejected', 'archived'].includes(c.firm_status)).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredCases.length === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No se encontraron casos</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredCases.map((caseItem) => {
                const fields = caseItem.lead?.structured_fields as Record<string, string> | null;
                const score = caseItem.lead?.score_final || 0;

                return (
                  <Card key={caseItem.id} className="shadow-soft hover:shadow-medium transition-shadow">
                    <CardContent className="p-4">
                      <Link
                        to={`/despacho/casos/${caseItem.id}`}
                        className="flex flex-col sm:flex-row sm:items-center gap-4"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <LeadTemperature score={score} variant="mini" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">
                                {fields?.nombre || 'Cliente'} — {fields?.area_legal || 'Caso legal'}
                              </h3>
                              <Badge variant={statusVariants[caseItem.firm_status] || 'secondary'}>
                                {statusLabels[caseItem.firm_status] || caseItem.firm_status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {fields?.provincia || 'España'} • {caseItem.lead?.source_channel || 'Web'} • 
                              Recibido {format(new Date(caseItem.assigned_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                            </p>
                            {caseItem.assigned_lawyer && (
                              <p className="text-sm text-muted-foreground">
                                Abogado: {caseItem.assigned_lawyer.full_name || caseItem.assigned_lawyer.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

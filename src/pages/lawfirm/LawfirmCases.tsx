import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLawfirmCases } from '@/hooks/useLawfirmCases';
import { useLawfirmBranches, useLawfirmTeam } from '@/hooks/useLawfirmProfile';
import { LeadTemperature } from '@/components/lead/LeadTemperature';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Briefcase, ArrowRight, Plus, ChevronDown, Building2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { NewCaseDialog } from '@/components/lawfirm/NewCaseDialog';

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
  const { data: branches = [] } = useLawfirmBranches();
  const { data: team = [] } = useLawfirmTeam();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all');
  const [showNewCase, setShowNewCase] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');

  // Sync tab from URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['all', 'new', 'in_progress', 'closed'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

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

  // Group cases by branch and lawyer
  const groupedByBranch = filteredCases.reduce((acc, c) => {
    const branchId = (c as any).branch_id || 'sin_sede';
    if (!acc[branchId]) acc[branchId] = [];
    acc[branchId].push(c);
    return acc;
  }, {} as Record<string, typeof filteredCases>);

  // Further group by lawyer within each branch
  const groupedByBranchAndLawyer = Object.entries(groupedByBranch).map(([branchId, branchCases]) => {
    const branch = branches.find(b => b.id === branchId);
    const byLawyer = branchCases.reduce((acc, c) => {
      const lawyerId = c.assigned_lawyer_id || 'sin_asignar';
      if (!acc[lawyerId]) acc[lawyerId] = [];
      acc[lawyerId].push(c);
      return acc;
    }, {} as Record<string, typeof branchCases>);

    return {
      branchId,
      branchName: branch?.name || 'Sin sede asignada',
      branchProvince: branch?.province,
      caseCount: branchCases.length,
      lawyers: Object.entries(byLawyer).map(([lawyerId, lawyerCases]) => {
        const lawyer = team.find(t => t.id === lawyerId);
        return {
          lawyerId,
          lawyerName: lawyer?.full_name || lawyer?.email || 'Sin asignar',
          cases: lawyerCases
        };
      })
    };
  });

  const renderCaseRow = (caseItem: typeof cases[0]) => {
    const fields = caseItem.lead?.structured_fields as Record<string, string> | null;
    const score = caseItem.lead?.score_final || 0;

    return (
      <Link
        key={caseItem.id}
        to={`/despacho/casos/${caseItem.id}`}
        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
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
              Recibido {format(new Date(caseItem.assigned_at), "dd MMM yyyy", { locale: es })}
            </p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </Link>
    );
  };

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
        <div className="flex gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar casos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button 
            variant={viewMode === 'grouped' ? 'secondary' : 'outline'} 
            size="icon"
            onClick={() => setViewMode(viewMode === 'grouped' ? 'list' : 'grouped')}
            title={viewMode === 'grouped' ? 'Vista lista' : 'Vista agrupada'}
          >
            <Building2 className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowNewCase(true)}>
            <Plus className="mr-2 h-4 w-4" />Nuevo Caso
          </Button>
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
          ) : viewMode === 'list' ? (
            // Simple list view
            <div className="space-y-3">
              {filteredCases.map((caseItem) => (
                <Card key={caseItem.id} className="shadow-soft hover:shadow-medium transition-shadow">
                  <CardContent className="p-0">
                    {renderCaseRow(caseItem)}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Grouped view by branch and lawyer
            <div className="space-y-4">
              {groupedByBranchAndLawyer.map(({ branchId, branchName, branchProvince, caseCount, lawyers }) => (
                <Collapsible key={branchId} defaultOpen className="border rounded-lg bg-card">
                  <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-lawfirm-primary" />
                      <div className="text-left">
                        <span className="font-semibold">{branchName}</span>
                        {branchProvince && (
                          <span className="text-sm text-muted-foreground ml-2">({branchProvince})</span>
                        )}
                      </div>
                      <Badge variant="secondary">{caseCount} casos</Badge>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      {lawyers.map(({ lawyerId, lawyerName, cases: lawyerCases }) => (
                        <Collapsible key={lawyerId} defaultOpen>
                          <CollapsibleTrigger className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-md border-l-2 border-lawfirm-primary/30">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{lawyerName}</span>
                              <Badge variant="outline" className="text-xs">{lawyerCases.length}</Badge>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 space-y-2 pl-6">
                              {lawyerCases.map(renderCaseRow)}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NewCaseDialog open={showNewCase} onOpenChange={setShowNewCase} />
    </div>
  );
}

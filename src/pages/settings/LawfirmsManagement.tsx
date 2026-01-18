import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Search, Pencil, Eye, Power } from 'lucide-react';
import { useLawfirms, useUpdateLawfirm } from '@/hooks/useLawfirms';
import { LawfirmFormDialog } from '@/components/lawfirm/LawfirmFormDialog';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function LawfirmsManagement() {
  const { data: lawfirms, isLoading } = useLawfirms();
  const updateLawfirm = useUpdateLawfirm();
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();
  
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredLawfirms = lawfirms?.filter(lf => {
    const searchLower = search.toLowerCase();
    return !search || 
      lf.name.toLowerCase().includes(searchLower) ||
      lf.cif?.toLowerCase().includes(searchLower) ||
      lf.city?.toLowerCase().includes(searchLower);
  }) || [];

  const handleToggleActive = async (id: string, currentStatus: boolean | null) => {
    try {
      await updateLawfirm.mutateAsync({ id, is_active: !currentStatus });
      toast.success(currentStatus ? 'Despacho desactivado' : 'Despacho activado');
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleViewAs = (lawfirm: { id: string; name: string }) => {
    startImpersonation(lawfirm as any);
    navigate('/despacho/dashboard');
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  // Count leads per lawfirm - we'll need to fetch this separately
  const getLeadCount = (lawfirmId: string) => {
    // This would ideally come from a separate query
    return 0;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Gestión de Despachos
          </h1>
          <p className="text-muted-foreground">
            {lawfirms?.length || 0} despachos registrados
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Button onClick={() => setShowForm(true)} className="gradient-brand">
            <Plus className="mr-2 h-4 w-4" />Nuevo Despacho
          </Button>
        </div>
      </div>

      <Card className="shadow-soft overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>CIF</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Áreas</TableHead>
              <TableHead className="text-center">Leads</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Cargando...</TableCell>
              </TableRow>
            ) : filteredLawfirms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay despachos registrados
                </TableCell>
              </TableRow>
            ) : (
              filteredLawfirms.map(lf => (
                <TableRow key={lf.id}>
                  <TableCell className="font-medium">{lf.name}</TableCell>
                  <TableCell className="font-mono text-sm">{lf.cif || '-'}</TableCell>
                  <TableCell>
                    {lf.city && lf.province ? `${lf.city}, ${lf.province}` : lf.city || lf.province || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {lf.areas_accepted?.slice(0, 2).map(area => (
                        <Badge key={area} variant="outline" className="text-xs truncate max-w-[90px]">
                          {area.replace('Derecho ', '')}
                        </Badge>
                      ))}
                      {(lf.areas_accepted?.length || 0) > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(lf.areas_accepted?.length || 0) - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{getLeadCount(lf.id)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={lf.is_active ? 'default' : 'destructive'}
                      className={lf.is_active ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
                    >
                      {lf.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(lf.id)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleViewAs(lf)} title="Ver como despacho">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleToggleActive(lf.id, lf.is_active)}
                        title={lf.is_active ? 'Desactivar' : 'Activar'}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <LawfirmFormDialog
        open={showForm}
        onOpenChange={handleCloseForm}
        lawfirmId={editingId}
      />
    </div>
  );
}

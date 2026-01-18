import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExportLead {
  id: string;
  created_at: string;
  source_channel: string | null;
  status_internal: string | null;
  score_final: number | null;
  price_final: number | null;
  structured_fields: Record<string, unknown> | null;
  lead_assignments?: {
    lawfirm_id: string | null;
    assigned_at: string | null;
    firm_status: string | null;
    contacted_at: string | null;
    result_notes: string | null;
    lawfirms?: { name: string } | null;
  }[];
}

export function exportLeadsToExcel(leads: ExportLead[], filename?: string) {
  const data = leads.map(lead => {
    const fields = lead.structured_fields || {};
    const assignment = lead.lead_assignments?.[0];
    
    return {
      'ID': lead.id,
      'Fecha Creación': format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: es }),
      'Nombre': fields.nombre || '',
      'Apellidos': fields.apellidos || '',
      'Teléfono': fields.telefono || '',
      'Email': fields.email || '',
      'Ciudad': fields.ciudad || '',
      'Provincia': fields.provincia || '',
      'Área Legal': fields.area_legal || '',
      'Subárea': fields.subarea || '',
      'Canal': lead.source_channel || '',
      'Score': lead.score_final ?? '',
      'Precio (€)': lead.price_final ?? '',
      'Estado': lead.status_internal || '',
      'Despacho Asignado': assignment?.lawfirms?.name || '',
      'Fecha Asignación': assignment?.assigned_at ? format(new Date(assignment.assigned_at), 'dd/MM/yyyy HH:mm', { locale: es }) : '',
      'Estado en Despacho': assignment?.firm_status || '',
      'Fecha Contacto': assignment?.contacted_at ? format(new Date(assignment.contacted_at), 'dd/MM/yyyy HH:mm', { locale: es }) : '',
      'Notas Resultado': assignment?.result_notes || '',
      'Cuantía': fields.cuantia || '',
      'Urgencia': fields.urgencia_aplica ? 'Sí' : 'No',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  const colWidths = [
    { wch: 36 }, // ID
    { wch: 18 }, // Fecha
    { wch: 15 }, // Nombre
    { wch: 15 }, // Apellidos
    { wch: 12 }, // Teléfono
    { wch: 25 }, // Email
    { wch: 15 }, // Ciudad
    { wch: 15 }, // Provincia
    { wch: 18 }, // Área
    { wch: 18 }, // Subárea
    { wch: 12 }, // Canal
    { wch: 8 },  // Score
    { wch: 10 }, // Precio
    { wch: 12 }, // Estado
    { wch: 20 }, // Despacho
    { wch: 18 }, // Fecha Asignación
    { wch: 15 }, // Estado Despacho
    { wch: 18 }, // Fecha Contacto
    { wch: 30 }, // Notas
    { wch: 12 }, // Cuantía
    { wch: 8 },  // Urgencia
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
  
  const defaultFilename = `leads_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
  XLSX.writeFile(workbook, filename || defaultFilename);
}

export function exportReportToExcel(
  data: Record<string, unknown>[],
  sheetName: string,
  filename: string
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

/**
 * Fallback orientation data for the marketplace lead preview modal.
 * Used when the lead does not have AI-generated `legal_orientation` data
 * inside `structured_fields`. Keys match the area_legal slugs we store.
 */

function normalizeArea(area?: string | null): string {
  if (!area) return '';
  return area
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

const LEGISLATION: Record<string, string> = {
  derecho_consumidores: 'Real Decreto Legislativo 1/2007 (TRLGDCU), Ley 7/2017 de resolución alternativa de litigios en materia de consumo.',
  derecho_consumo: 'Real Decreto Legislativo 1/2007 (TRLGDCU), Ley 7/2017 de resolución alternativa de litigios en materia de consumo.',
  derecho_laboral: 'Real Decreto Legislativo 2/2015 (Estatuto de los Trabajadores), Ley 36/2011 reguladora de la jurisdicción social.',
  laboral: 'Real Decreto Legislativo 2/2015 (Estatuto de los Trabajadores), Ley 36/2011 reguladora de la jurisdicción social.',
  derecho_familia: 'Código Civil (arts. 42-107 y 142-153), Ley 15/2015 de Jurisdicción Voluntaria.',
  familia: 'Código Civil (arts. 42-107 y 142-153), Ley 15/2015 de Jurisdicción Voluntaria.',
  derecho_penal: 'Ley Orgánica 10/1995 (Código Penal), Real Decreto de 14 de septiembre de 1882 (LECrim).',
  penal: 'Ley Orgánica 10/1995 (Código Penal), Real Decreto de 14 de septiembre de 1882 (LECrim).',
  derecho_civil: 'Código Civil, Ley 1/2000 de Enjuiciamiento Civil.',
  civil: 'Código Civil, Ley 1/2000 de Enjuiciamiento Civil.',
  derecho_administrativo: 'Ley 39/2015 del Procedimiento Administrativo Común, Ley 29/1998 reguladora de la Jurisdicción Contencioso-Administrativa.',
  administrativo: 'Ley 39/2015 del Procedimiento Administrativo Común, Ley 29/1998 reguladora de la Jurisdicción Contencioso-Administrativa.',
  accidentes_trafico: 'Ley 35/2015 (sistema de valoración de daños — Baremo), Real Decreto Legislativo 8/2004 (LRCSCVM).',
  derecho_bancario: 'Ley 16/2011 de Crédito al Consumo, jurisprudencia TJUE y TS sobre cláusulas abusivas (Directiva 93/13/CEE).',
  bancario: 'Ley 16/2011 de Crédito al Consumo, jurisprudencia TJUE y TS sobre cláusulas abusivas (Directiva 93/13/CEE).',
  derecho_inmobiliario: 'Ley 29/1994 de Arrendamientos Urbanos, Ley 49/1960 de Propiedad Horizontal.',
  inmobiliario: 'Ley 29/1994 de Arrendamientos Urbanos, Ley 49/1960 de Propiedad Horizontal.',
  herencias: 'Código Civil (Libro III, arts. 657 y ss.), normativa autonómica aplicable y Reglamento (UE) 650/2012.',
  sucesiones: 'Código Civil (Libro III, arts. 657 y ss.), normativa autonómica aplicable y Reglamento (UE) 650/2012.',
  extranjeria: 'Ley Orgánica 4/2000 sobre derechos y libertades de los extranjeros, RD 557/2011 (Reglamento).',
  derecho_mercantil: 'Real Decreto Legislativo 1/2010 (Ley de Sociedades de Capital), Código de Comercio.',
  mercantil: 'Real Decreto Legislativo 1/2010 (Ley de Sociedades de Capital), Código de Comercio.',
};

const DOCUMENTS: Record<string, string[]> = {
  derecho_consumidores: [
    'Contrato o factura del producto/servicio',
    'Reclamaciones previas presentadas (hoja de reclamaciones, burofax, email)',
    'Comunicaciones con la empresa',
    'DNI del reclamante',
  ],
  derecho_consumo: [
    'Contrato o factura del producto/servicio',
    'Reclamaciones previas presentadas',
    'Comunicaciones con la empresa',
    'DNI del reclamante',
  ],
  derecho_laboral: [
    'Contrato de trabajo y anexos',
    'Últimas 6-12 nóminas',
    'Vida laboral actualizada',
    'Carta de despido o comunicación recibida',
    'Comunicaciones con la empresa',
  ],
  laboral: [
    'Contrato de trabajo y anexos',
    'Últimas 6-12 nóminas',
    'Vida laboral actualizada',
    'Carta de despido o comunicación recibida',
  ],
  accidentes_trafico: [
    'Parte amistoso o atestado policial',
    'Informes médicos, urgencias y partes de baja',
    'Facturas de gastos derivados',
    'Documentación del vehículo y póliza de seguro',
  ],
  derecho_familia: [
    'Libro de familia',
    'Certificado de matrimonio o convivencia',
    'Documentación económica (nóminas, declaraciones de renta)',
    'Escrituras de bienes comunes',
  ],
  familia: [
    'Libro de familia',
    'Certificado de matrimonio o convivencia',
    'Documentación económica (nóminas, declaraciones de renta)',
  ],
  derecho_penal: [
    'Denuncia o atestado policial',
    'Citación judicial recibida',
    'Documentación médica si hay lesiones',
    'Cualquier prueba documental, testifical o pericial',
    'DNI',
  ],
  penal: [
    'Denuncia o atestado policial',
    'Citación judicial recibida',
    'Documentación médica si hay lesiones',
    'Pruebas documentales o testificales disponibles',
  ],
  derecho_bancario: [
    'Contrato del préstamo / hipoteca / tarjeta',
    'Cuadro de amortización',
    'Recibos de pagos realizados',
    'Comunicaciones con la entidad',
  ],
  bancario: [
    'Contrato del préstamo / hipoteca / tarjeta',
    'Cuadro de amortización',
    'Recibos de pagos realizados',
  ],
  derecho_inmobiliario: [
    'Contrato de arrendamiento o escrituras',
    'Recibos de alquiler / IBI',
    'Comunicaciones con la otra parte',
    'Acta de la comunidad si aplica',
  ],
  herencias: [
    'Certificado de defunción y de últimas voluntades',
    'Testamento o declaración de herederos',
    'Escrituras y documentación de los bienes',
    'DNI de los herederos',
  ],
  derecho_administrativo: [
    'Resolución o acto administrativo recurrido',
    'Notificaciones recibidas',
    'Documentación presentada en el expediente',
  ],
};

const RISKS: Record<string, string[]> = {
  derecho_consumidores: [
    'Verificar plazos de garantía y prescripción',
    'Comprobar si existe arbitraje de consumo previo',
    'Evaluar solvencia de la empresa reclamada',
  ],
  derecho_consumo: [
    'Verificar plazos de garantía y prescripción',
    'Comprobar si existe arbitraje de consumo previo',
  ],
  derecho_laboral: [
    'Plazo de caducidad: 20 días hábiles para impugnar despido',
    'Verificar convenio colectivo aplicable',
    'Comprobar antigüedad real y categoría profesional',
  ],
  laboral: [
    'Plazo de caducidad: 20 días hábiles para impugnar despido',
    'Verificar convenio colectivo aplicable',
  ],
  accidentes_trafico: [
    'Prescripción: 1 año desde el alta médica definitiva',
    'Verificar cobertura del seguro contrario',
    'Distinguir secuelas definitivas vs. provisionales',
  ],
  derecho_familia: [
    'Situación patrimonial de ambas partes',
    'Custodia, régimen de visitas y plan de parentalidad',
    'Pensiones compensatorias y de alimentos',
  ],
  familia: [
    'Situación patrimonial de ambas partes',
    'Custodia y régimen de visitas',
    'Pensiones compensatorias y de alimentos',
  ],
  derecho_penal: [
    'Atender plazos de citación judicial — riesgo de juicio en ausencia',
    'Valorar medidas cautelares y posible orden de protección',
    'Casos con menores: extremar confidencialidad y diligencia',
  ],
  penal: [
    'Atender plazos de citación judicial',
    'Valorar medidas cautelares y posible orden de protección',
  ],
  derecho_bancario: [
    'Prescripción de la acción de nulidad / restitución',
    'Comprobar si hay reclamación extrajudicial previa obligatoria',
    'Riesgo de costas en caso de allanamiento parcial',
  ],
  bancario: [
    'Prescripción de la acción de nulidad / restitución',
    'Comprobar reclamación extrajudicial previa',
  ],
  derecho_inmobiliario: [
    'Plazos de desahucio y enervación',
    'Verificar inscripción registral y cargas',
  ],
  herencias: [
    'Plazo de 6 meses para liquidar Impuesto de Sucesiones',
    'Aceptación a beneficio de inventario si hay deudas',
    'Computar legítimas y mejoras',
  ],
  derecho_administrativo: [
    'Plazos breves de recurso (1 mes recurso de reposición, 2 meses contencioso)',
    'Verificar agotamiento de la vía administrativa',
  ],
};

export interface LegalOrientation {
  legislation?: string;
  documents?: string[];
  risks?: string[];
  deadlines?: string;
  strategy?: string;
}

export function getDefaultLegislation(areaLegal?: string | null): string {
  const key = normalizeArea(areaLegal);
  return LEGISLATION[key] || 'Legislación específica según el caso concreto. El abogado deberá identificar la normativa aplicable tras revisar la documentación.';
}

export function getDefaultDocuments(areaLegal?: string | null, _specialty?: string | null): string[] {
  const key = normalizeArea(areaLegal);
  return (
    DOCUMENTS[key] || [
      'DNI del cliente',
      'Documentación relevante del caso',
      'Comunicaciones previas con la otra parte',
      'Pruebas documentales disponibles',
    ]
  );
}

export function getDefaultRisks(areaLegal?: string | null): string[] {
  const key = normalizeArea(areaLegal);
  return (
    RISKS[key] || [
      'Verificar plazos de prescripción aplicables',
      'Evaluar viabilidad económica del procedimiento',
      'Confirmar disponibilidad de la documentación necesaria',
    ]
  );
}

/**
 * Build a basic orientation object from a lead. Prefers AI-generated data
 * if present in structured_fields.legal_orientation / orientacion_legal.
 */
export function buildLegalOrientation(
  areaLegal?: string | null,
  fields?: Record<string, unknown> | null,
): LegalOrientation {
  const ai = (fields?.legal_orientation || fields?.orientacion_legal) as
    | LegalOrientation
    | undefined;

  const strategyFromFields =
    (fields?.estrategia_inicial as string | undefined) ||
    (fields?.orientacion_abogado as string | undefined);
  const deadlinesFromFields =
    (fields?.fechas_limite as string | undefined) ||
    (fields?.plazos as string | undefined);

  return {
    legislation: ai?.legislation || getDefaultLegislation(areaLegal),
    documents: ai?.documents && ai.documents.length > 0 ? ai.documents : getDefaultDocuments(areaLegal),
    risks: ai?.risks && ai.risks.length > 0 ? ai.risks : getDefaultRisks(areaLegal),
    deadlines: ai?.deadlines || deadlinesFromFields,
    strategy: ai?.strategy || strategyFromFields,
  };
}

export const AREAS_LEGALES = [
  "Derecho Civil",
  "Derecho de Familia",
  "Derecho Canónico",
  "Derecho Municipal",
  "Derecho de Extranjería",
  "Derecho Notarial",
  "Derecho de Consumidores",
  "Derecho Inmobiliario",
  "Derecho Médico",
  "Derecho de Seguros",
  "Derecho Concursal",
  "Derecho Militar",
  "Derecho Sanitario",
  "Derecho de Vivienda",
  "Derecho Bancario",
  "Derecho de Propiedad Industrial",
  "Derecho de Animales",
  "Derecho de Transporte",
  "Derecho Bursátil",
  "Derecho de Propiedad Intelectual",
  "Derecho Deportivo",
  "Derecho Marítimo",
  "Derecho Mercado de Valores",
  "Derecho de Protección de Datos",
  "Derecho de Aguas",
  "Derecho Aeronáutico",
  "Mediación y arbitraje",
  "Derecho de Nuevas Tecnologías",
  "Derecho Alimentario",
  "Derecho del Medio Ambiente",
  "Derecho Urbanístico",
  "Derecho Fiscal",
  "Derecho Penal",
  "Derecho Administrativo",
  "Derecho Laboral",
  "Derecho Procesal",
  "Derecho Mercantil",
  "Derecho Comunitario",
  "Derecho Societario",
  "Derecho Constitucional",
  "Derecho Tributario",
  "Derecho Internacional"
] as const;

export const PROVINCIAS_ESPANA = [
  "A Coruña",
  "Álava",
  "Albacete",
  "Alicante",
  "Almería",
  "Asturias",
  "Ávila",
  "Badajoz",
  "Barcelona",
  "Burgos",
  "Cáceres",
  "Cádiz",
  "Cantabria",
  "Castellón",
  "Ciudad Real",
  "Córdoba",
  "Cuenca",
  "Girona",
  "Granada",
  "Guadalajara",
  "Guipúzcoa",
  "Huelva",
  "Huesca",
  "Islas Baleares",
  "Jaén",
  "La Rioja",
  "Las Palmas",
  "León",
  "Lleida",
  "Lugo",
  "Madrid",
  "Málaga",
  "Murcia",
  "Navarra",
  "Ourense",
  "Palencia",
  "Pontevedra",
  "Salamanca",
  "Santa Cruz de Tenerife",
  "Segovia",
  "Sevilla",
  "Soria",
  "Tarragona",
  "Teruel",
  "Toledo",
  "Valencia",
  "Valladolid",
  "Vizcaya",
  "Zamora",
  "Zaragoza"
] as const;

export const SOURCE_CHANNELS = [
  "Teléfono",
  "Web chat",
  "WhatsApp",
  "Email"
] as const;

export const LEAD_STATUSES = [
  "Pendiente",
  "Enviado",
  "Aceptado"
] as const;

export const URGENCY_LEVELS = [
  "Alta",
  "Media",
  "Baja"
] as const;

export type AreaLegal = typeof AREAS_LEGALES[number];
export type Provincia = typeof PROVINCIAS_ESPANA[number];
export type SourceChannel = typeof SOURCE_CHANNELS[number];
export type LeadStatus = typeof LEAD_STATUSES[number];
export type UrgencyLevel = typeof URGENCY_LEVELS[number];

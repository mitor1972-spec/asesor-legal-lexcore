// Mapping of Spanish cities to their provinces
// This covers the most common cities that might be mentioned without province

export const cityToProvince: Record<string, string> = {
  // Cataluña
  'salou': 'Tarragona',
  'cambrils': 'Tarragona',
  'reus': 'Tarragona',
  'tarragona': 'Tarragona',
  'tortosa': 'Tarragona',
  'valls': 'Tarragona',
  'barcelona': 'Barcelona',
  'hospitalet': 'Barcelona',
  'l\'hospitalet': 'Barcelona',
  'badalona': 'Barcelona',
  'sabadell': 'Barcelona',
  'terrassa': 'Barcelona',
  'mataro': 'Barcelona',
  'mataró': 'Barcelona',
  'sant cugat': 'Barcelona',
  'granollers': 'Barcelona',
  'manresa': 'Barcelona',
  'girona': 'Girona',
  'figueres': 'Girona',
  'lloret de mar': 'Girona',
  'blanes': 'Girona',
  'olot': 'Girona',
  'lleida': 'Lleida',
  'lérida': 'Lleida',
  'balaguer': 'Lleida',
  
  // Comunidad Valenciana
  'valencia': 'Valencia',
  'valència': 'Valencia',
  'gandia': 'Valencia',
  'sagunto': 'Valencia',
  'torrent': 'Valencia',
  'paterna': 'Valencia',
  'alzira': 'Valencia',
  'alicante': 'Alicante',
  'elche': 'Alicante',
  'benidorm': 'Alicante',
  'orihuela': 'Alicante',
  'torrevieja': 'Alicante',
  'denia': 'Alicante',
  'alcoy': 'Alicante',
  'castellon': 'Castellón',
  'castellón': 'Castellón',
  'vinaros': 'Castellón',
  'benicarló': 'Castellón',
  
  // Andalucía
  'sevilla': 'Sevilla',
  'dos hermanas': 'Sevilla',
  'utrera': 'Sevilla',
  'malaga': 'Málaga',
  'málaga': 'Málaga',
  'marbella': 'Málaga',
  'fuengirola': 'Málaga',
  'torremolinos': 'Málaga',
  'estepona': 'Málaga',
  'velez-malaga': 'Málaga',
  'granada': 'Granada',
  'motril': 'Granada',
  'cordoba': 'Córdoba',
  'córdoba': 'Córdoba',
  'lucena': 'Córdoba',
  'cadiz': 'Cádiz',
  'cádiz': 'Cádiz',
  'jerez': 'Cádiz',
  'jerez de la frontera': 'Cádiz',
  'algeciras': 'Cádiz',
  'san fernando': 'Cádiz',
  'el puerto de santa maria': 'Cádiz',
  'chiclana': 'Cádiz',
  'almeria': 'Almería',
  'almería': 'Almería',
  'roquetas de mar': 'Almería',
  'el ejido': 'Almería',
  'jaen': 'Jaén',
  'jaén': 'Jaén',
  'linares': 'Jaén',
  'huelva': 'Huelva',
  
  // Madrid
  'madrid': 'Madrid',
  'alcala de henares': 'Madrid',
  'alcalá de henares': 'Madrid',
  'mostoles': 'Madrid',
  'móstoles': 'Madrid',
  'fuenlabrada': 'Madrid',
  'leganes': 'Madrid',
  'leganés': 'Madrid',
  'getafe': 'Madrid',
  'alcorcon': 'Madrid',
  'alcorcón': 'Madrid',
  'torrejon de ardoz': 'Madrid',
  'torrejón de ardoz': 'Madrid',
  'parla': 'Madrid',
  'alcobendas': 'Madrid',
  'las rozas': 'Madrid',
  'pozuelo': 'Madrid',
  'coslada': 'Madrid',
  'rivas': 'Madrid',
  'majadahonda': 'Madrid',
  
  // País Vasco
  'bilbao': 'Vizcaya',
  'barakaldo': 'Vizcaya',
  'getxo': 'Vizcaya',
  'san sebastian': 'Guipúzcoa',
  'san sebastián': 'Guipúzcoa',
  'donostia': 'Guipúzcoa',
  'irún': 'Guipúzcoa',
  'irun': 'Guipúzcoa',
  'vitoria': 'Álava',
  'vitoria-gasteiz': 'Álava',
  
  // Galicia
  'vigo': 'Pontevedra',
  'pontevedra': 'Pontevedra',
  'a coruña': 'A Coruña',
  'la coruña': 'A Coruña',
  'santiago de compostela': 'A Coruña',
  'santiago': 'A Coruña',
  'ferrol': 'A Coruña',
  'lugo': 'Lugo',
  'ourense': 'Ourense',
  'orense': 'Ourense',
  
  // Aragón
  'zaragoza': 'Zaragoza',
  'huesca': 'Huesca',
  'teruel': 'Teruel',
  
  // Castilla y León
  'valladolid': 'Valladolid',
  'burgos': 'Burgos',
  'salamanca': 'Salamanca',
  'leon': 'León',
  'león': 'León',
  'palencia': 'Palencia',
  'zamora': 'Zamora',
  'avila': 'Ávila',
  'ávila': 'Ávila',
  'segovia': 'Segovia',
  'soria': 'Soria',
  
  // Castilla-La Mancha
  'toledo': 'Toledo',
  'talavera': 'Toledo',
  'talavera de la reina': 'Toledo',
  'albacete': 'Albacete',
  'ciudad real': 'Ciudad Real',
  'guadalajara': 'Guadalajara',
  'cuenca': 'Cuenca',
  
  // Murcia
  'murcia': 'Murcia',
  'cartagena': 'Murcia',
  'lorca': 'Murcia',
  'molina de segura': 'Murcia',
  
  // Baleares
  'palma': 'Islas Baleares',
  'palma de mallorca': 'Islas Baleares',
  'ibiza': 'Islas Baleares',
  'mahon': 'Islas Baleares',
  'mahón': 'Islas Baleares',
  'manacor': 'Islas Baleares',
  
  // Canarias
  'las palmas': 'Las Palmas',
  'las palmas de gran canaria': 'Las Palmas',
  'telde': 'Las Palmas',
  'santa cruz de tenerife': 'Santa Cruz de Tenerife',
  'la laguna': 'Santa Cruz de Tenerife',
  'san cristobal de la laguna': 'Santa Cruz de Tenerife',
  'arona': 'Santa Cruz de Tenerife',
  
  // Navarra
  'pamplona': 'Navarra',
  'tudela': 'Navarra',
  
  // La Rioja
  'logroño': 'La Rioja',
  'logrono': 'La Rioja',
  
  // Cantabria
  'santander': 'Cantabria',
  'torrelavega': 'Cantabria',
  
  // Asturias
  'oviedo': 'Asturias',
  'gijon': 'Asturias',
  'gijón': 'Asturias',
  'aviles': 'Asturias',
  'avilés': 'Asturias',
  
  // Extremadura
  'badajoz': 'Badajoz',
  'merida': 'Badajoz',
  'mérida': 'Badajoz',
  'caceres': 'Cáceres',
  'cáceres': 'Cáceres',
  'plasencia': 'Cáceres',
  
  // Ceuta y Melilla
  'ceuta': 'Ceuta',
  'melilla': 'Melilla',
};

/**
 * Get province from city name
 * @param city - City name (case insensitive)
 * @returns Province name or null if not found
 */
export function getProvinceFromCity(city: string | null | undefined): string | null {
  if (!city) return null;
  const normalizedCity = city.toLowerCase().trim();
  return cityToProvince[normalizedCity] || null;
}

/**
 * Get formatted location string (City, Province)
 * @param city - City name
 * @param province - Province name (optional, will be auto-detected if missing)
 * @returns Formatted location or null if no data
 */
export function formatLocation(city: string | null | undefined, province: string | null | undefined): string {
  if (!city && !province) return '';
  
  // If we have province but not city
  if (!city && province) return province;
  
  // If we have city but not province, try to detect it
  const detectedProvince = province || getProvinceFromCity(city);
  
  if (city && detectedProvince && city.toLowerCase() !== detectedProvince.toLowerCase()) {
    return `${city}, ${detectedProvince}`;
  }
  
  return city || detectedProvince || '';
}

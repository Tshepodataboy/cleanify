export type SouthAfricanProvince =
  | 'Gauteng'
  | 'Western Cape'
  | 'KwaZulu-Natal'
  | 'Eastern Cape'
  | 'Free State'
  | 'Limpopo'
  | 'Mpumalanga'
  | 'North West'
  | 'Northern Cape';

export interface ProvinceMeta {
  id: SouthAfricanProvince;
  name: SouthAfricanProvince;
  shortCode: string;
  center: { lat: number; lng: number; zoom: number };
  keywords: string[];
}

export interface CityMeta {
  name: string;
  province: SouthAfricanProvince;
  aliases: string[];
  center: { lat: number; lng: number; zoom: number };
}

export interface InferredSouthAfricanLocation {
  province: SouthAfricanProvince;
  city: string;
  suburb: string;
}

export const SA_PROVINCES: ProvinceMeta[] = [
  {
    id: 'Gauteng',
    name: 'Gauteng',
    shortCode: 'GP',
    center: { lat: -26.05, lng: 28.08, zoom: 9 },
    keywords: [
      'gauteng',
      'johannesburg',
      'joburg',
      'jhb',
      'pretoria',
      'tshwane',
      'emmarentia',
      'braamfontein',
      'sunnyside',
      'sandton',
      'soweto',
      'centurion',
      'midrand',
      'randburg',
      'roodepoort',
      'ekurhuleni',
      'benoni',
      'boksburg',
      'germiston',
      'kempton park',
      'alberton',
      'vereeniging',
      'vanderbijlpark',
      'krugersdorp',
      'alexandra',
      'rosebank',
      'melville',
      'hatfield',
      'brooklyn',
      'menlyn',
      'fourways',
    ],
  },
  {
    id: 'Western Cape',
    name: 'Western Cape',
    shortCode: 'WC',
    center: { lat: -33.75, lng: 19.15, zoom: 8 },
    keywords: [
      'western cape',
      'cape town',
      'kaapstad',
      'mouille point',
      'sea point',
      'green point',
      'woodstock',
      'observatory',
      'rondebosch',
      'claremont',
      'khayelitsha',
      'mitchells plain',
      'gugulethu',
      'langa',
      'stellenbosch',
      'paarl',
      'somerset west',
      'strand',
      'muizenberg',
      'hout bay',
      'camps bay',
      'blouberg',
      'bellville',
      'durbanville',
      'hermanus',
      'george',
      'knysna',
      'mossel bay',
      'worcester',
      'oudtshoorn',
      'saldanha',
      'liesbeek',
    ],
  },
  {
    id: 'KwaZulu-Natal',
    name: 'KwaZulu-Natal',
    shortCode: 'KZN',
    center: { lat: -29.35, lng: 30.75, zoom: 8 },
    keywords: [
      'kwazulu-natal',
      'kwazulu natal',
      'kzn',
      'durban',
      'ethekwini',
      'blue lagoon',
      'umngeni',
      'umhlanga',
      'amanzimtoti',
      'berea',
      'morningside',
      'glenwood',
      'pinetown',
      'westville',
      'pietermaritzburg',
      'ballito',
      'richards bay',
      'empangeni',
      'newcastle',
      'ladysmith',
      'port shepstone',
      'margate',
      'stanger',
      'kwadukuza',
      'umlazi',
    ],
  },
  {
    id: 'Eastern Cape',
    name: 'Eastern Cape',
    shortCode: 'EC',
    center: { lat: -32.6, lng: 26.5, zoom: 7 },
    keywords: [
      'eastern cape',
      'gqeberha',
      'port elizabeth',
      'nelson mandela bay',
      'east london',
      'buffalo city',
      'makhanda',
      'grahamstown',
      'mthatha',
      'kariega',
      'uitenhage',
      'jeffreys bay',
      'komani',
      'queenstown',
      'qonce',
      'bhisho',
      'graaff-reinet',
      'port alfred',
      'st francis',
    ],
  },
  {
    id: 'Free State',
    name: 'Free State',
    shortCode: 'FS',
    center: { lat: -28.85, lng: 26.75, zoom: 7 },
    keywords: [
      'free state',
      'bloemfontein',
      'mangaung',
      'welkom',
      'bethlehem',
      'kroonstad',
      'sasolburg',
      'parys',
      'phuthaditjhaba',
      'harrismith',
      'virginia',
      'odendaalsrus',
      'ficksburg',
    ],
  },
  {
    id: 'Limpopo',
    name: 'Limpopo',
    shortCode: 'LP',
    center: { lat: -23.9, lng: 29.45, zoom: 7 },
    keywords: [
      'limpopo',
      'polokwane',
      'pietersburg',
      'tzaneen',
      'mokopane',
      'phalaborwa',
      'thohoyandou',
      'bela-bela',
      'makhado',
      'louis trichardt',
      'lephalale',
      'musina',
      'modimolle',
      'giyani',
      'lebowakgomo',
    ],
  },
  {
    id: 'Mpumalanga',
    name: 'Mpumalanga',
    shortCode: 'MP',
    center: { lat: -25.7, lng: 30.35, zoom: 8 },
    keywords: [
      'mpumalanga',
      'mbombela',
      'nelspruit',
      'emalahleni',
      'witbank',
      'middelburg',
      'secunda',
      'ermelo',
      'barberton',
      'white river',
      'standerton',
      'sabie',
      'hazyview',
      'lydenburg',
      'mashishing',
    ],
  },
  {
    id: 'North West',
    name: 'North West',
    shortCode: 'NW',
    center: { lat: -26.25, lng: 25.85, zoom: 7 },
    keywords: [
      'north west',
      'rustenburg',
      'mahikeng',
      'mafikeng',
      'potchefstroom',
      'klerksdorp',
      'brits',
      'hartbeespoort',
      'vryburg',
      'lichtenburg',
      'zeerust',
      'orkney',
      'stilfontein',
      'mmabatho',
    ],
  },
  {
    id: 'Northern Cape',
    name: 'Northern Cape',
    shortCode: 'NC',
    center: { lat: -29.0, lng: 22.0, zoom: 6 },
    keywords: [
      'northern cape',
      'kimberley',
      'upington',
      'springbok',
      'kuruman',
      'de aar',
      'kathu',
      'colesberg',
      'prieska',
      'calvinia',
      'postmasburg',
      'port nolloth',
    ],
  },
];

export const SA_CITIES: CityMeta[] = [
  // Gauteng
  {
    name: 'Johannesburg',
    province: 'Gauteng',
    aliases: ['johannesburg', 'city of johannesburg', 'joburg', 'jhb'],
    center: { lat: -26.2041, lng: 28.0473, zoom: 12 },
  },
  {
    name: 'Pretoria',
    province: 'Gauteng',
    aliases: ['pretoria', 'tshwane', 'city of tshwane'],
    center: { lat: -25.7479, lng: 28.2293, zoom: 12 },
  },
  {
    name: 'Sandton',
    province: 'Gauteng',
    aliases: ['sandton'],
    center: { lat: -26.1076, lng: 28.0567, zoom: 13 },
  },
  {
    name: 'Soweto',
    province: 'Gauteng',
    aliases: ['soweto'],
    center: { lat: -26.2485, lng: 27.854, zoom: 12 },
  },
  {
    name: 'Centurion',
    province: 'Gauteng',
    aliases: ['centurion'],
    center: { lat: -25.8603, lng: 28.1894, zoom: 12 },
  },
  {
    name: 'Ekurhuleni',
    province: 'Gauteng',
    aliases: ['ekurhuleni', 'benoni', 'boksburg', 'germiston', 'kempton park', 'alberton'],
    center: { lat: -26.1885, lng: 28.2738, zoom: 11 },
  },
  // Western Cape
  {
    name: 'Cape Town',
    province: 'Western Cape',
    aliases: ['cape town', 'city of cape town', 'kaapstad'],
    center: { lat: -33.9249, lng: 18.4241, zoom: 12 },
  },
  {
    name: 'Stellenbosch',
    province: 'Western Cape',
    aliases: ['stellenbosch'],
    center: { lat: -33.9321, lng: 18.8602, zoom: 13 },
  },
  {
    name: 'Paarl',
    province: 'Western Cape',
    aliases: ['paarl'],
    center: { lat: -33.7342, lng: 18.9621, zoom: 13 },
  },
  {
    name: 'George',
    province: 'Western Cape',
    aliases: ['george'],
    center: { lat: -33.963, lng: 22.4617, zoom: 12 },
  },
  // KwaZulu-Natal
  {
    name: 'Durban',
    province: 'KwaZulu-Natal',
    aliases: ['durban', 'ethekwini'],
    center: { lat: -29.8587, lng: 31.0218, zoom: 12 },
  },
  {
    name: 'Pietermaritzburg',
    province: 'KwaZulu-Natal',
    aliases: ['pietermaritzburg', 'msunduzi'],
    center: { lat: -29.6006, lng: 30.3794, zoom: 12 },
  },
  {
    name: 'Umhlanga',
    province: 'KwaZulu-Natal',
    aliases: ['umhlanga'],
    center: { lat: -29.7253, lng: 31.0858, zoom: 13 },
  },
  {
    name: 'Richards Bay',
    province: 'KwaZulu-Natal',
    aliases: ['richards bay'],
    center: { lat: -28.7807, lng: 32.0383, zoom: 12 },
  },
  // Eastern Cape
  {
    name: 'Gqeberha',
    province: 'Eastern Cape',
    aliases: ['gqeberha', 'port elizabeth', 'nelson mandela bay'],
    center: { lat: -33.9608, lng: 25.6022, zoom: 12 },
  },
  {
    name: 'East London',
    province: 'Eastern Cape',
    aliases: ['east london', 'buffalo city'],
    center: { lat: -33.0153, lng: 27.9116, zoom: 12 },
  },
  {
    name: 'Makhanda',
    province: 'Eastern Cape',
    aliases: ['makhanda', 'grahamstown'],
    center: { lat: -33.3108, lng: 26.5256, zoom: 13 },
  },
  // Free State
  {
    name: 'Bloemfontein',
    province: 'Free State',
    aliases: ['bloemfontein', 'mangaung'],
    center: { lat: -29.0852, lng: 26.1596, zoom: 12 },
  },
  {
    name: 'Welkom',
    province: 'Free State',
    aliases: ['welkom'],
    center: { lat: -27.9774, lng: 26.7351, zoom: 12 },
  },
  // Limpopo
  {
    name: 'Polokwane',
    province: 'Limpopo',
    aliases: ['polokwane', 'pietersburg'],
    center: { lat: -23.9045, lng: 29.4689, zoom: 12 },
  },
  {
    name: 'Tzaneen',
    province: 'Limpopo',
    aliases: ['tzaneen'],
    center: { lat: -23.8332, lng: 30.1635, zoom: 12 },
  },
  // Mpumalanga
  {
    name: 'Mbombela',
    province: 'Mpumalanga',
    aliases: ['mbombela', 'nelspruit'],
    center: { lat: -25.4753, lng: 30.9694, zoom: 12 },
  },
  {
    name: 'eMalahleni',
    province: 'Mpumalanga',
    aliases: ['emalahleni', 'witbank'],
    center: { lat: -25.8728, lng: 29.2553, zoom: 12 },
  },
  // North West
  {
    name: 'Rustenburg',
    province: 'North West',
    aliases: ['rustenburg'],
    center: { lat: -25.6676, lng: 27.2421, zoom: 12 },
  },
  {
    name: 'Mahikeng',
    province: 'North West',
    aliases: ['mahikeng', 'mafikeng'],
    center: { lat: -25.8652, lng: 25.6442, zoom: 12 },
  },
  {
    name: 'Potchefstroom',
    province: 'North West',
    aliases: ['potchefstroom'],
    center: { lat: -26.7167, lng: 27.1, zoom: 12 },
  },
  // Northern Cape
  {
    name: 'Kimberley',
    province: 'Northern Cape',
    aliases: ['kimberley'],
    center: { lat: -28.7282, lng: 24.7499, zoom: 12 },
  },
  {
    name: 'Upington',
    province: 'Northern Cape',
    aliases: ['upington'],
    center: { lat: -28.4478, lng: 21.2561, zoom: 12 },
  },
];

export const SA_NATIONAL_CENTER = { lat: -29.0, lng: 24.8, zoom: 6 };

export function inferSouthAfricanProvince(input: {
  lat?: number;
  lng?: number;
  address?: string;
  neighborhood?: string;
  locationName?: string;
  title?: string;
}): SouthAfricanProvince {
  const combined = [input.address, input.neighborhood, input.locationName, input.title]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const province of SA_PROVINCES) {
    if (combined.includes(province.name.toLowerCase())) {
      return province.id;
    }
  }

  for (const province of SA_PROVINCES) {
    for (const keyword of province.keywords) {
      if (combined.includes(keyword)) {
        return province.id;
      }
    }
  }

  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    let bestProvince: SouthAfricanProvince = 'Gauteng';
    let bestDist = Infinity;
    for (const province of SA_PROVINCES) {
      const dLat = lat - province.center.lat;
      const dLng = lng - province.center.lng;
      const distSq = dLat * dLat + dLng * dLng;
      if (distSq < bestDist) {
        bestDist = distSq;
        bestProvince = province.id;
      }
    }
    return bestProvince;
  }

  return 'Gauteng';
}

export function inferSouthAfricanLocation(input: {
  lat?: number;
  lng?: number;
  address?: string;
  neighborhood?: string;
  locationName?: string;
  title?: string;
}): InferredSouthAfricanLocation {
  const province = inferSouthAfricanProvince(input);
  const labelSource = (input.neighborhood || input.locationName || '').trim();
  const addressSource = (input.address || '').trim();
  const combinedLower = `${labelSource} ${addressSource}`.toLowerCase();

  // 1. Resolve City
  let city = '';
  for (const c of SA_CITIES) {
    if (c.aliases.some((alias) => combinedLower.includes(alias))) {
      city = c.name;
      break;
    }
  }

  const labelParts = labelSource
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (!city && labelParts.length >= 2) {
    const candidate = labelParts[labelParts.length - 1];
    if (candidate.toLowerCase() !== province.toLowerCase()) {
      city = candidate;
    }
  }

  if (!city) {
    const provCities = SA_CITIES.filter((c) => c.province === province);
    const lat = Number(input.lat);
    const lng = Number(input.lng);
    if (provCities.length > 0 && Number.isFinite(lat) && Number.isFinite(lng)) {
      let bestCity = provCities[0];
      let bestDist = Infinity;
      for (const c of provCities) {
        const dLat = lat - c.center.lat;
        const dLng = lng - c.center.lng;
        const distSq = dLat * dLat + dLng * dLng;
        if (distSq < bestDist) {
          bestDist = distSq;
          bestCity = c;
        }
      }
      city = bestCity.name;
    } else if (provCities.length > 0) {
      city = provCities[0].name;
    } else {
      city = province;
    }
  }

  // 2. Resolve Suburb
  let suburb = '';
  if (labelParts.length >= 2) {
    suburb = labelParts[0];
  } else if (labelParts.length === 1) {
    const single = labelParts[0];
    if (
      single.toLowerCase() !== city.toLowerCase() &&
      single.toLowerCase() !== province.toLowerCase()
    ) {
      suburb = single;
    }
  }

  if (!suburb && addressSource) {
    const addrParts = addressSource
      .split(',')
      .map((p) => p.trim())
      .filter((p) => {
        const lower = p.toLowerCase();
        if (!p) return false;
        if (lower === 'south africa') return false;
        if (lower === province.toLowerCase()) return false;
        if (lower === city.toLowerCase()) return false;
        if (/^\d{4}$/.test(p)) return false;
        if (lower.includes('metropolitan municipality')) return false;
        if (lower.includes('local municipality')) return false;
        return true;
      });
    // Pick the first part that doesn't look like a numbered street address if available
    const nonStreet = addrParts.find(
      (part) => !/^\d+\s/.test(part) && !/\b(rd|road|st|street|ave|avenue|dr|drive|blvd|ln|lane|way)\b/i.test(part)
    );
    suburb = nonStreet || addrParts[0] || '';
  }

  if (!suburb) {
    suburb = city;
  }

  return { province, city, suburb };
}

export function getProvinceMeta(province: SouthAfricanProvince): ProvinceMeta {
  return SA_PROVINCES.find((p) => p.id === province) || SA_PROVINCES[0];
}

export function getCityCenter(cityName: string): { lat: number; lng: number; zoom: number } | null {
  const match = SA_CITIES.find((c) => c.name.toLowerCase() === cityName.trim().toLowerCase());
  return match ? match.center : null;
}

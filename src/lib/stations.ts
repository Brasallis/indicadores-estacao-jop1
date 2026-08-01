export const STATIONS = [
  { id: 'brasilandia', name: 'Brasilândia', code: 'BRA', status: 'Futura' },
  { id: 'maristela', name: 'Maristela', code: 'MAR', status: 'Futura' },
  { id: 'itaberaba', name: 'Itaberaba-Hospital Vila Penteado', code: 'ITA', status: 'Futura' },
  { id: 'joao-paulo-1', name: 'João Paulo I', code: 'JOP', status: 'Em operação' },
  { id: 'freguesia', name: 'Freguesia do Ó', code: 'FRE', status: 'Em operação' },
  { id: 'santa-marina', name: 'Santa Marina', code: 'STM', status: 'Em operação' },
  { id: 'agua-branca', name: 'Água Branca', code: 'AGB', status: 'Em operação' },
  { id: 'sesc-pompeia', name: 'SESC-Pompeia', code: 'SES', status: 'Em operação' },
  { id: 'perdizes', name: 'Perdizes', code: 'PER', status: 'Em operação' },
  { id: 'puc', name: 'PUC-Cardoso de Almeida', code: 'PUC', status: 'Futura' },
  { id: 'faap-pacaembu', name: 'FAAP-Pacaembu', code: 'FAA', status: 'Futura' },
  { id: 'mackenzie', name: 'Higienópolis-Mackenzie', code: 'MAC', status: 'Futura' },
  { id: '14-bis', name: '14 Bis', code: '14B', status: 'Futura' },
  { id: 'bela-vista', name: 'Bela Vista / Saracura', code: 'BVI', status: 'Futura' },
  { id: 'sao-joaquim', name: 'São Joaquim', code: 'SAJ', status: 'Futura' },
];

export function getStationById(id: string) {
  return STATIONS.find(s => s.id === id) || { id, name: id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' '), code: 'UNK', status: 'Desconhecido' };
}

export function generateInitialReadings(stationCode: string, count: number = 11) {
  return Array.from({ length: count }, (_, i) => ({
    turnstileId: `${stationCode}_${String(i + 1).padStart(2, '0')}${i === 0 ? ' PNE' : ''}`,
    entryStart: '',
    exitStart: '',
    entryEnd: '',
    exitEnd: '',
    isOutOfOrder: false
  }));
}

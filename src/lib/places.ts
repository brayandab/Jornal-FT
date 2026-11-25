/**
 * Divisiones y ciudades por país para elegir de una lista en vez de escribir. Son datos por región (sin reglas
 * por país en los componentes): `parent` es el campo de la división (departamento, estado, prefectura) y
 * `child` el de la ciudad o municipio, ambos con el nombre del campo del addressSchema del perfil regional.
 * Las listas incluyen las capitales y los municipios principales, no todos; siempre se puede elegir «Otro»
 * y escribirlo. Un país sin datos aquí sigue con campos de texto.
 */

export interface Division {
  /** Lo que se guarda en la dirección (por ejemplo «Cundinamarca» o «SP»). */
  value: string;
  label: string;
  cities: string[];
}

export interface PlaceData {
  parent: string;
  child: string;
  divisions: Division[];
  /** Colombia: la dirección se arma con tipo de vía + números («Calle 26 # 68-35»). */
  streetTypes?: string[];
  streetField?: string;
}

const named = (entries: [string, string[]][]): Division[] =>
  entries.map(([label, cities]) => ({ value: label, label, cities }));

const coded = (entries: [string, string, string[]][]): Division[] =>
  entries.map(([value, label, cities]) => ({ value, label: `${label} (${value})`, cities }));

const CO: PlaceData = {
  parent: 'department',
  child: 'city',
  streetField: 'street_address',
  streetTypes: ['Calle', 'Carrera', 'Avenida', 'Avenida Calle', 'Avenida Carrera', 'Diagonal', 'Transversal', 'Autopista', 'Kilómetro'],
  divisions: named([
    ['Amazonas', ['Leticia', 'Puerto Nariño']],
    ['Antioquia', ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Sabaneta', 'La Estrella', 'Caldas', 'Copacabana', 'Girardota',
      'Barbosa', 'Rionegro', 'La Ceja', 'Marinilla', 'El Carmen de Viboral', 'Guarne', 'Apartadó', 'Turbo', 'Caucasia',
      'Santa Fe de Antioquia']],
    ['Arauca', ['Arauca', 'Saravena', 'Tame', 'Arauquita']],
    ['Atlántico', ['Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia', 'Galapa', 'Sabanalarga', 'Baranoa']],
    ['Bogotá D.C.', ['Bogotá']],
    ['Bolívar', ['Cartagena de Indias', 'Magangué', 'Turbaco', 'Arjona', 'El Carmen de Bolívar']],
    ['Boyacá', ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa', 'Villa de Leyva', 'Puerto Boyacá']],
    ['Caldas', ['Manizales', 'Villamaría', 'Chinchiná', 'La Dorada', 'Riosucio']],
    ['Caquetá', ['Florencia', 'San Vicente del Caguán']],
    ['Casanare', ['Yopal', 'Aguazul', 'Villanueva', 'Paz de Ariporo']],
    ['Cauca', ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Patía']],
    ['Cesar', ['Valledupar', 'Aguachica', 'Agustín Codazzi', 'Bosconia']],
    ['Chocó', ['Quibdó', 'Istmina', 'Bahía Solano']],
    ['Córdoba', ['Montería', 'Cereté', 'Sahagún', 'Lorica', 'Montelíbano']],
    ['Cundinamarca', ['Bogotá', 'Soacha', 'Chía', 'Zipaquirá', 'Facatativá', 'Fusagasugá', 'Mosquera', 'Madrid', 'Funza',
      'Cajicá', 'Girardot', 'Tocancipá', 'Sopó', 'La Calera', 'Cota', 'Tenjo', 'Tabio', 'Sibaté', 'Gachancipá']],
    ['Guainía', ['Inírida']],
    ['Guaviare', ['San José del Guaviare']],
    ['Huila', ['Neiva', 'Pitalito', 'Garzón', 'La Plata']],
    ['La Guajira', ['Riohacha', 'Maicao', 'Uribia', 'Fonseca']],
    ['Magdalena', ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco']],
    ['Meta', ['Villavicencio', 'Acacías', 'Granada', 'Puerto López', 'Restrepo']],
    ['Nariño', ['Pasto', 'Ipiales', 'Tumaco', 'Túquerres']],
    ['Norte de Santander', ['Cúcuta', 'Villa del Rosario', 'Los Patios', 'Ocaña', 'Pamplona']],
    ['Putumayo', ['Mocoa', 'Puerto Asís', 'Orito']],
    ['Quindío', ['Armenia', 'Calarcá', 'Montenegro', 'La Tebaida', 'Quimbaya', 'Circasia']],
    ['Risaralda', ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia']],
    ['San Andrés y Providencia', ['San Andrés', 'Providencia']],
    ['Santander', ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil', 'Socorro']],
    ['Sucre', ['Sincelejo', 'Corozal', 'Sampués', 'Tolú']],
    ['Tolima', ['Ibagué', 'Espinal', 'Melgar', 'Honda', 'Mariquita', 'Líbano']],
    ['Valle del Cauca', ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Buga', 'Cartago', 'Jamundí', 'Yumbo', 'Candelaria']],
    ['Vaupés', ['Mitú']],
    ['Vichada', ['Puerto Carreño']],
  ]),
};

const BR: PlaceData = {
  parent: 'state',
  child: 'city',
  divisions: coded([
    ['AC', 'Acre', ['Rio Branco', 'Cruzeiro do Sul']],
    ['AL', 'Alagoas', ['Maceió', 'Arapiraca']],
    ['AP', 'Amapá', ['Macapá', 'Santana']],
    ['AM', 'Amazonas', ['Manaus', 'Parintins', 'Itacoatiara']],
    ['BA', 'Bahia', ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Ilhéus']],
    ['CE', 'Ceará', ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Sobral']],
    ['DF', 'Distrito Federal', ['Brasília']],
    ['ES', 'Espírito Santo', ['Vitória', 'Vila Velha', 'Serra', 'Cariacica']],
    ['GO', 'Goiás', ['Goiânia', 'Aparecida de Goiânia', 'Anápolis']],
    ['MA', 'Maranhão', ['São Luís', 'Imperatriz']],
    ['MT', 'Mato Grosso', ['Cuiabá', 'Várzea Grande', 'Rondonópolis']],
    ['MS', 'Mato Grosso do Sul', ['Campo Grande', 'Dourados']],
    ['MG', 'Minas Gerais', ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros']],
    ['PA', 'Pará', ['Belém', 'Ananindeua', 'Santarém', 'Marabá']],
    ['PB', 'Paraíba', ['João Pessoa', 'Campina Grande']],
    ['PR', 'Paraná', ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'Foz do Iguaçu']],
    ['PE', 'Pernambuco', ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina']],
    ['PI', 'Piauí', ['Teresina', 'Parnaíba']],
    ['RJ', 'Rio de Janeiro', ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Campos dos Goytacazes']],
    ['RN', 'Rio Grande do Norte', ['Natal', 'Mossoró']],
    ['RS', 'Rio Grande do Sul', ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria']],
    ['RO', 'Rondônia', ['Porto Velho', 'Ji-Paraná']],
    ['RR', 'Roraima', ['Boa Vista']],
    ['SC', 'Santa Catarina', ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Chapecó']],
    ['SP', 'São Paulo', ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André', 'Osasco',
      'Ribeirão Preto', 'Sorocaba', 'Santos']],
    ['SE', 'Sergipe', ['Aracaju', 'Nossa Senhora do Socorro']],
    ['TO', 'Tocantins', ['Palmas', 'Araguaína']],
  ]),
};

export const PLACES: Record<string, PlaceData> = { co: CO, br: BR };

export function placesOf(region: string | null | undefined): PlaceData | undefined {
  return region ? PLACES[region] : undefined;
}

/** Valor especial del desplegable para escribir una opción que no está en la lista. */
export const OTHER = '__other__';

/** «Calle 26 # 68-35» → partes; vacío si no sigue ese formato (se deja escribir libre). */
export function parseStreet(text: string, types: string[]): { type: string; main: string; cross: string; plate: string } | null {
  const sorted = [...types].sort((a, b) => b.length - a.length);
  const type = sorted.find((t) => text.startsWith(`${t} `));
  if (!type) return null;
  const m = /^(\S+)\s*#\s*(\S+?)\s*-\s*(\S+)$/.exec(text.slice(type.length).trim());
  return m ? { type, main: m[1], cross: m[2], plate: m[3] } : null;
}

export function formatStreet(p: { type: string; main: string; cross: string; plate: string }): string {
  if (!p.type || !p.main) return '';
  return `${p.type} ${p.main.trim()} # ${p.cross.trim()}-${p.plate.trim()}`;
}

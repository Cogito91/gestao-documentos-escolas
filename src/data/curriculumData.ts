import curriculumJson from './curriculumByDiscipline.json';

export interface MatrixItem {
  id: number;
  tipoColeta: string;
  segmento: string;
  ano: string;
  bimestre: string;
  componente: string;
  unidadeTematica: string;
  codigo: string;
  objeto: string;
  objetoItems: string[];
  habilidade: string;
}

// A escola atende exclusivamente do 6º ao 9º ano (Ensino Fundamental Anos Finais)
const VALID_ANOS = new Set(['6 ANO', '7 ANO', '8 ANO', '9 ANO']);

const rawData = curriculumJson as unknown as Record<string, MatrixItem[]>;

// Filtra todas as disciplinas apenas para o 6º ao 9º ano
export const curriculumByDiscipline: Record<string, MatrixItem[]> = Object.fromEntries(
  Object.entries(rawData).map(([disc, items]) => [
    disc,
    items.filter((item) => VALID_ANOS.has(item.ano)),
  ])
);

export const allDisciplinesList: string[] = [
  'LÍNGUA PORTUGUESA',
  'MATEMÁTICA',
  'CIÊNCIAS',
  'HISTÓRIA',
  'GEOGRAFIA',
  'LÍNGUA INGLESA',
  'ARTE',
  'EDUCAÇÃO FÍSICA',
  'ENSINO RELIGIOSO',
  'LETRAM. MATEMÁTICO',
  'LETRAM. CIENTÍFICO',
  'LETRAM. HUMANIDADE E CIDADANIA',
];

export const curriculumMatrix: MatrixItem[] = Object.values(curriculumByDiscipline).flat();

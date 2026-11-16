export interface RawCurriculumRow {
  id: number;
  tipoColeta: string;
  segmento: string;
  ano: string;
  anoRaw: string;
  bimestre: string;
  bimestreRaw: string;
  componente: string;
  unidadeTematica: string;
  codigo: string;
  objeto: string;
  objetoItems: string[];
  habilidade: string;
}

// Utilitário para dividir os sub-itens do objeto de conhecimento
export function splitObjetoItems(rawText: string): string[] {
  if (!rawText) return [];

  // Se contiver bullets (● ou •)
  if (rawText.includes('●') || rawText.includes('•')) {
    const parts = rawText
      .split(/[●•]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length > 0) return parts;
  }

  // Se contiver quebras de linha
  if (rawText.includes('\n')) {
    const parts = rawText
      .split('\n')
      .map((p) => p.trim().replace(/^[-*•●]\s*/, ''))
      .filter((p) => p.length > 0);
    if (parts.length > 1) return parts;
  }

  return [rawText.trim()];
}

// Utilitário para parsear linhas CSV com aspas e quebras de linha mantendo a ordem original
export function parseCurriculumCsv(csvText: string): RawCurriculumRow[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      currentCell = '';
      if (currentRow.some((c) => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c !== '')) {
      rows.push(currentRow);
    }
  }

  const result: RawCurriculumRow[] = [];
  let sequenceId = 1;

  for (const row of rows) {
    // Procura colunas do cabeçalho SEMED:
    // [5] TIPO DE COLETA, [6] SEGMENTO, [7] ANO DE ENSINO, [8] BIM, [9] COMPONENTE CURRICULAR, [10] UNIDADES TEMÁTICAS, [11] ALFA-NUMÉRICO, [12] OBJETOS DE CONHECIMENTO, [13] HABILIDADES CEM
    if (row.length < 13) continue;

    const tipoColetaRaw = row[5] || 'CURRICULO';
    const segmentoRaw = row[6] || 'ANOS FINAIS';
    const anoRaw = row[7] || '';
    const bimRaw = row[8] || '';
    const componenteRaw = row[9] || '';
    const unidadeRaw = row[10] || '';
    const codigoRaw = row[11] || '';
    const objetoRaw = row[12] || '';
    const habilidadeRaw = row[13] || '';

    // Ignora linhas de cabeçalho ou sem código
    if (!codigoRaw || codigoRaw === 'ALFA-NUMÉRICO' || !componenteRaw || componenteRaw === 'COMPONENTE CURRICULAR') {
      continue;
    }

    // Normalização amigável de Ano
    let ano = anoRaw;
    if (anoRaw.includes('1 ANO') || anoRaw === '1º') ano = '1º Ano';
    else if (anoRaw.includes('2 ANO') || anoRaw === '2º') ano = '2º Ano';
    else if (anoRaw.includes('3 ANO') || anoRaw === '3º') ano = '3º Ano';
    else if (anoRaw.includes('4 ANO') || anoRaw === '4º') ano = '4º Ano';
    else if (anoRaw.includes('5 ANO') || anoRaw === '5º') ano = '5º Ano';
    else if (anoRaw.includes('6 ANO') || anoRaw === '6º') ano = '6º Ano';
    else if (anoRaw.includes('7 ANO') || anoRaw === '7º') ano = '7º Ano';
    else if (anoRaw.includes('8 ANO') || anoRaw === '8º') ano = '8º Ano';
    else if (anoRaw.includes('9 ANO') || anoRaw === '9º') ano = '9º Ano';

    // Normalização de Bimestre
    let bimestre = bimRaw;
    if (bimRaw.includes('1 BIM') || bimRaw === '1') bimestre = '1º Bimestre';
    else if (bimRaw.includes('2 BIM') || bimRaw === '2') bimestre = '2º Bimestre';
    else if (bimRaw.includes('3 BIM') || bimRaw === '3') bimestre = '3º Bimestre';
    else if (bimRaw.includes('4 BIM') || bimRaw === '4') bimestre = '4º Bimestre';

    // Normalização de Componente Curricular
    let componente = componenteRaw.toUpperCase().trim();
    if (componente.includes('PORTUGUESA') || componente.includes('PORTUGUES')) {
      componente = 'LÍNGUA PORTUGUESA';
    } else if (componente.includes('MATEMATICA') || componente.includes('MATEMÁTICA') || componente.includes('MATEMATICO')) {
      componente = 'MATEMÁTICA';
    } else if (componente.includes('CIENCIAS') || componente.includes('CIÊNCIAS') || componente.includes('CIENTIFICO')) {
      componente = 'CIÊNCIAS';
    } else if (componente.includes('HISTORIA') || componente.includes('HISTÓRIA')) {
      componente = 'HISTÓRIA';
    } else if (componente.includes('GEOGRAFIA')) {
      componente = 'GEOGRAFIA';
    } else if (componente.includes('INGLESA') || componente.includes('INGLES') || componente.includes('INGLÊS')) {
      componente = 'LÍNGUA INGLESA';
    } else if (componente.includes('EDUCACAO FISICA') || componente.includes('EDUCAÇÃO FÍSICA')) {
      componente = 'EDUCAÇÃO FÍSICA';
    } else if (componente.includes('ARTE') || componente.includes('ARTES')) {
      componente = 'ARTE';
    } else if (componente.includes('RELIGIOSO') || componente.includes('RELIGIOSA')) {
      componente = 'ENSINO RELIGIOSO';
    }

    const cleanObjeto = objetoRaw.trim() || 'Objeto de conhecimento';
    const objetoItems = splitObjetoItems(cleanObjeto);

    result.push({
      id: sequenceId++,
      tipoColeta: tipoColetaRaw.trim().toUpperCase() || 'CURRÍCULO',
      segmento: segmentoRaw.trim().toUpperCase() || 'ANOS FINAIS',
      ano,
      anoRaw: anoRaw.trim(),
      bimestre,
      bimestreRaw: bimRaw.trim(),
      componente,
      unidadeTematica: unidadeRaw || '-',
      codigo: codigoRaw.trim(),
      objeto: cleanObjeto,
      objetoItems,
      habilidade: habilidadeRaw.trim() || cleanObjeto,
    });
  }

  return result;
}

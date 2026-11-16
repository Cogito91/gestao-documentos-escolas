export const monthsList = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function formatDeadlineLabel(cat: { deadline_day?: number | null; deadline_month?: number | null; deadline_date?: string | null }): string {
  if (cat.deadline_date) {
    try {
      const parts = cat.deadline_date.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const monthIdx = parseInt(parts[1], 10) - 1;
        return `Prazo Final: ${day} de ${monthsList[monthIdx] || ''}`;
      }
    } catch {}
  }

  if (cat.deadline_day && cat.deadline_month) {
    return `Prazo Final: ${cat.deadline_day} de ${monthsList[cat.deadline_month - 1]}`;
  }

  if (cat.deadline_day) {
    const currentMonth = new Date().getMonth();
    return `Prazo Final: ${cat.deadline_day} de ${monthsList[currentMonth]}`;
  }

  return 'Prazo Final a definir';
}

export const EVIDENCE_REQ_TAG = '[EXIGE_EVIDENCIA]';

export function encodeCategoryDescription(
  description?: string | null,
  requiresEvidence?: boolean,
  bimestre?: string | null
): string | null {
  const clean = (description || '')
    .replace(/\[EXIGE_EVIDENCIA\]/g, '')
    .replace(/\[BIMESTRE:[^\]]+\]/g, '')
    .trim();

  const tags: string[] = [];
  if (bimestre && bimestre !== '1º Bimestre') {
    tags.push(`[BIMESTRE:${bimestre}]`);
  }
  if (requiresEvidence) {
    tags.push(EVIDENCE_REQ_TAG);
  }

  if (tags.length === 0) return clean || null;
  return clean ? `${tags.join(' ')} ${clean}` : tags.join(' ');
}

export function normalizeCategory<
  T extends { description?: string | null; requires_evidence?: boolean; bimestre?: string | null }
>(cat: T): T {
  const hasTag = Boolean(cat.description && cat.description.includes(EVIDENCE_REQ_TAG));
  const bimMatch = cat.description?.match(/\[BIMESTRE:([^\]]+)\]/);
  const extractedBimestre = bimMatch ? bimMatch[1].trim() : null;

  const cleanDescription = cat.description
    ? cat.description
        .replace(/\[EXIGE_EVIDENCIA\]/g, '')
        .replace(/\[BIMESTRE:[^\]]+\]/g, '')
        .trim() || null
    : null;

  return {
    ...cat,
    bimestre: cat.bimestre || extractedBimestre || '1º Bimestre',
    requires_evidence: Boolean(cat.requires_evidence || hasTag),
    description: cleanDescription,
  };
}

export function encodeDocumentDescription(
  description?: string,
  evidences?: Array<{ name: string; url: string }>
): string | undefined {
  const clean = (description || '').trim();
  if (evidences && evidences.length > 0) {
    const tag = `[EVIDENCIAS:${JSON.stringify(evidences)}]`;
    return clean ? `${clean}\n${tag}` : tag;
  }
  return clean || undefined;
}

export function formatAbsenceDateLabel(value: string): string {
  const formatIso = (iso: string) => {
    const p = iso.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
  };
  if (value.includes('..')) {
    const [start, end] = value.split('..');
    return `De ${formatIso(start)} até ${formatIso(end)}`;
  }
  return formatIso(value);
}

export function encodeSpecialDocumentDescription(
  description: string,
  meta: {
    kind: 'emergencial' | 'atestado' | 'ocorrencia';
    absenceDates: string[];
    targetClasses?: string;
    certificateType?: string;
    studentName?: string;
    actionTaken?: string;
    occurrenceDate?: string;
    occurrenceTimeSlot?: string;
  }
): string {
  const payload = {
    kind: meta.kind,
    dates: meta.absenceDates,
    ...(meta.targetClasses ? { classes: meta.targetClasses } : {}),
    ...(meta.certificateType ? { certType: meta.certificateType } : {}),
    ...(meta.studentName ? { student: meta.studentName } : {}),
    ...(meta.actionTaken ? { action: meta.actionTaken } : {}),
    ...(meta.occurrenceDate ? { occDate: meta.occurrenceDate } : {}),
    ...(meta.occurrenceTimeSlot ? { occTimeSlot: meta.occurrenceTimeSlot } : {}),
  };
  const tag = `[TIPO_ESPECIAL:${JSON.stringify(payload)}]`;
  const clean = (description || '').trim();
  return clean ? `${tag}\n${clean}` : tag;
}

export function normalizeDocument<
  T extends {
    description?: string | null;
    evidence_files?: Array<{ name: string; url: string }>;
    special_kind?: 'regular' | 'emergencial' | 'atestado' | 'ocorrencia';
    absence_dates?: string[];
    target_classes?: string;
    certificate_type?: string;
    student_name?: string;
    action_taken?: string;
    occurrence_date?: string;
    occurrence_time_slot?: string;
    category?: { description?: string | null; requires_evidence?: boolean } | null;
  }
>(doc: T): T {
  let evidenceFiles = doc.evidence_files || [];
  let cleanDescription = doc.description ?? null;
  let specialKind: 'regular' | 'emergencial' | 'atestado' | 'ocorrencia' = doc.special_kind || 'regular';
  let absenceDates: string[] = doc.absence_dates || [];
  let targetClasses = doc.target_classes;
  let certificateType = doc.certificate_type;
  let studentName = doc.student_name;
  let actionTaken = doc.action_taken;
  let occurrenceDate = doc.occurrence_date;
  let occurrenceTimeSlot = doc.occurrence_time_slot;

  if (cleanDescription) {
    const specialMatch = cleanDescription.match(/^\[TIPO_ESPECIAL:([^\n]+)\]\n?/);
    if (specialMatch) {
      try {
        const parsed = JSON.parse(specialMatch[1]);
        if (parsed.kind === 'emergencial' || parsed.kind === 'atestado' || parsed.kind === 'ocorrencia') {
          specialKind = parsed.kind;
        }
        if (Array.isArray(parsed.dates)) {
          absenceDates = parsed.dates;
        }
        if (parsed.classes) targetClasses = parsed.classes;
        if (parsed.certType) certificateType = parsed.certType;
        if (parsed.student) studentName = parsed.student;
        if (parsed.action) actionTaken = parsed.action;
        if (parsed.occDate) occurrenceDate = parsed.occDate;
        if (parsed.occTimeSlot) occurrenceTimeSlot = parsed.occTimeSlot;
      } catch {
        // Ignora caso JSON inválido
      }
      cleanDescription = cleanDescription.replace(/^\[TIPO_ESPECIAL:[^\n]+\]\n?/, '').trim() || null;
    }
  }

  if (cleanDescription) {
    const match = cleanDescription.match(/\n?\[EVIDENCIAS:([\s\S]*?)\]$/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed)) {
          evidenceFiles = parsed;
        }
      } catch {
        // Ignora caso JSON inválido
      }
      cleanDescription = cleanDescription.replace(/\n?\[EVIDENCIAS:[\s\S]*?\]$/, '').trim() || null;
    }
  }

  return {
    ...doc,
    description: cleanDescription,
    evidence_files: evidenceFiles,
    special_kind: specialKind,
    absence_dates: absenceDates,
    target_classes: targetClasses,
    certificate_type: certificateType,
    student_name: studentName,
    action_taken: actionTaken,
    occurrence_date: occurrenceDate,
    occurrence_time_slot: occurrenceTimeSlot,
    category: doc.category ? normalizeCategory(doc.category) : doc.category,
  };
}

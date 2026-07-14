import {
  GEMINI_MODELS,
  INTERPRETATION_CATEGORIES,
  INTERPRETATION_ERROR_CODES,
  INTERPRETATION_STATUSES,
  INTERPRETATION_TYPES,
  INTERPRETATION_URGENCIES,
  type InterpretationPayload,
  type InterpretationItem,
  type ThoughtInterpretation,
} from '../types/interpretation';
import {
  ARNA_TIME_ZONE,
  formatDateInTimeZone,
} from '../context/temporal-context';

const payloadFields = [
  'type',
  'category',
  'urgency',
  'dueDate',
  'summary',
  'items',
  'confidence',
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isOneOf<T extends readonly string[]>(
  value: unknown,
  values: T,
): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);

  return (
    new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) ===
    value
  );
}

function isIsoDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function normalizeStoredDueDate(value: unknown): string | null | undefined {
  if (value === null || isIsoDate(value)) {
    return value;
  }

  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    return undefined;
  }

  return formatDateInTimeZone(new Date(value), ARNA_TIME_ZONE);
}

function validateInterpretationItem(
  value: unknown,
): InterpretationItem | null {
  if (!isObject(value)) {
    return null;
  }

  const keys = Object.keys(value);

  if (
    keys.length !== 2 ||
    !keys.includes('title') ||
    !keys.includes('quantity') ||
    typeof value.title !== 'string' ||
    !(
      value.quantity === null ||
      (typeof value.quantity === 'number' && Number.isFinite(value.quantity))
    )
  ) {
    return null;
  }

  return {
    title: value.title,
    quantity: value.quantity,
  };
}

function validateInterpretationItems(
  value: unknown,
): InterpretationItem[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value.map(validateInterpretationItem);

  return items.every((item) => item !== null)
    ? (items as InterpretationItem[])
    : null;
}

export function validateInterpretationPayload(
  value: unknown,
): InterpretationPayload | null {
  if (!isObject(value)) {
    return null;
  }

  const keys = Object.keys(value);

  const items = validateInterpretationItems(value.items);

  if (
    keys.length !== payloadFields.length ||
    !payloadFields.every((field) => keys.includes(field))
  ) {
    return null;
  }

  if (
    !isOneOf(value.type, INTERPRETATION_TYPES) ||
    !isOneOf(value.category, INTERPRETATION_CATEGORIES) ||
    !isOneOf(value.urgency, INTERPRETATION_URGENCIES) ||
    !(value.dueDate === null || isIsoDate(value.dueDate)) ||
    typeof value.summary !== 'string' ||
    items === null ||
    typeof value.confidence !== 'number' ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1
  ) {
    return null;
  }

  return {
    type: value.type,
    category: value.category,
    urgency: value.urgency,
    dueDate: value.dueDate,
    summary: value.summary,
    items,
    confidence: value.confidence,
  };
}

export function normalizeStoredThoughtInterpretation(
  value: unknown,
): ThoughtInterpretation | null {
  if (!isObject(value) || !Array.isArray(value.items)) {
    return null;
  }

  const normalizedItems = value.items.map((item) =>
    typeof item === 'string' ? { title: item, quantity: null } : item,
  );
  const normalizedDueDate = normalizeStoredDueDate(value.dueDate);

  if (normalizedDueDate === undefined) {
    return null;
  }

  const normalizedValue = {
    ...value,
    items: normalizedItems,
    dueDate: normalizedDueDate,
  };

  return isThoughtInterpretation(normalizedValue) ? normalizedValue : null;
}

export function parseInterpretationPayload(
  responseText: string,
): { payload: InterpretationPayload | null; error: 'invalid_json' | 'validation' | null } {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(responseText);
  } catch {
    return { payload: null, error: 'invalid_json' };
  }

  const payload = validateInterpretationPayload(parsedValue);

  return payload
    ? { payload, error: null }
    : { payload: null, error: 'validation' };
}

export function isThoughtInterpretation(
  value: unknown,
): value is ThoughtInterpretation {
  if (!isObject(value)) {
    return false;
  }

  const payload = validateInterpretationPayload({
    type: value.type,
    category: value.category,
    urgency: value.urgency,
    dueDate: value.dueDate,
    summary: value.summary,
    items: value.items,
    confidence: value.confidence,
  });

  return (
    payload !== null &&
    isOneOf(value.status, INTERPRETATION_STATUSES) &&
    isOneOf(value.model, GEMINI_MODELS) &&
    (value.analyzedAt === null || isIsoDateTime(value.analyzedAt)) &&
    (value.errorCode === null ||
      isOneOf(value.errorCode, INTERPRETATION_ERROR_CODES)) &&
    (value.promptVersion === undefined ||
      value.promptVersion === null ||
      (typeof value.promptVersion === 'number' &&
        Number.isInteger(value.promptVersion) &&
        value.promptVersion > 0))
  );
}

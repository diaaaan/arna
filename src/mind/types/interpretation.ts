export const INTERPRETATION_STATUSES = [
  'pending',
  'success',
  'failed',
] as const;

export const INTERPRETATION_TYPES = [
  'task',
  'shopping_list',
  'idea',
  'note',
  'quote',
  'reminder',
  'project',
  'unknown',
] as const;

export const INTERPRETATION_CATEGORIES = [
  'work',
  'home',
  'health',
  'finance',
  'learning',
  'creativity',
  'personal',
  'unknown',
] as const;

export const INTERPRETATION_URGENCIES = [
  'low',
  'medium',
  'high',
  'unknown',
] as const;

export const GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
] as const;

export const INTERPRETATION_ERROR_CODES = [
  'missing_api_key',
  'network',
  'timeout',
  'http',
  'rate_limit',
  'invalid_json',
  'validation',
] as const;

export type InterpretationStatus = (typeof INTERPRETATION_STATUSES)[number];
export type InterpretationType = (typeof INTERPRETATION_TYPES)[number];
export type InterpretationCategory =
  (typeof INTERPRETATION_CATEGORIES)[number];
export type InterpretationUrgency =
  (typeof INTERPRETATION_URGENCIES)[number];
export type GeminiModel = (typeof GEMINI_MODELS)[number];
export type InterpretationErrorCode =
  (typeof INTERPRETATION_ERROR_CODES)[number];

export type InterpretationItem = {
  title: string;
  quantity: number | null;
};

export type InterpretationPayload = {
  type: InterpretationType;
  category: InterpretationCategory;
  urgency: InterpretationUrgency;
  dueDate: string | null;
  summary: string;
  items: InterpretationItem[];
  confidence: number;
};

export type ThoughtInterpretation = InterpretationPayload & {
  status: InterpretationStatus;
  model: GeminiModel;
  analyzedAt: string | null;
  errorCode: InterpretationErrorCode | null;
  promptVersion?: number | null;
};

export function createPendingInterpretation(): ThoughtInterpretation {
  return {
    status: 'pending',
    type: 'unknown',
    category: 'unknown',
    urgency: 'unknown',
    dueDate: null,
    summary: '',
    items: [],
    confidence: 0,
    model: 'gemini-3.1-flash-lite',
    analyzedAt: null,
    errorCode: null,
  };
}

export function createFailedInterpretation(
  errorCode: InterpretationErrorCode,
  model: GeminiModel,
): ThoughtInterpretation {
  return {
    status: 'failed',
    type: 'unknown',
    category: 'unknown',
    urgency: 'unknown',
    dueDate: null,
    summary: '',
    items: [],
    confidence: 0,
    model,
    analyzedAt: new Date().toISOString(),
    errorCode,
  };
}

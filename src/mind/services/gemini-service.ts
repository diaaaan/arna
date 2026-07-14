import { createInterpretThoughtTemporalContext } from '../context/temporal-context';
import {
  buildInterpretThoughtInput,
  INTERPRET_THOUGHT_PROMPT,
  INTERPRET_THOUGHT_PROMPT_VERSION,
} from '../prompts/interpret-thought';
import {
  INTERPRETATION_CATEGORIES,
  INTERPRETATION_TYPES,
  INTERPRETATION_URGENCIES,
  type GeminiModel,
  type InterpretationErrorCode,
} from '../types/interpretation';

const PRIMARY_MODEL: GeminiModel = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL: GeminiModel = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 20_000;
const PRIMARY_UNAVAILABLE_STATUSES = new Set([404, 429, 500, 502, 503, 504]);

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'type',
    'category',
    'urgency',
    'dueDate',
    'summary',
    'items',
    'confidence',
  ],
  properties: {
    type: { type: 'string', enum: INTERPRETATION_TYPES },
    category: { type: 'string', enum: INTERPRETATION_CATEGORIES },
    urgency: { type: 'string', enum: INTERPRETATION_URGENCIES },
    dueDate: {
      anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }],
    },
    summary: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'quantity'],
        properties: {
          title: { type: 'string' },
          quantity: {
            anyOf: [{ type: 'number' }, { type: 'null' }],
          },
        },
      },
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
} as const;

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
};

export type GeminiInterpretationResponse = {
  responseText: string;
  model: GeminiModel;
};

export class GeminiServiceError extends Error {
  constructor(
    public readonly code: InterpretationErrorCode,
    public readonly model: GeminiModel,
    public readonly httpStatus?: number,
  ) {
    super('Gemini interpretation request failed.');
    this.name = 'GeminiServiceError';
  }
}

function debugLog(message: string, details?: unknown) {
  if (__DEV__) {
    console.log(`[Mind Engine] ${message}`, details ?? '');
  }
}

function mapHttpError(status: number): InterpretationErrorCode {
  if (status === 429) {
    return 'rate_limit';
  }

  return 'http';
}

async function requestInterpretation(
  rawText: string,
  model: GeminiModel,
  apiKey: string,
  temporalContext: ReturnType<typeof createInterpretThoughtTemporalContext>,
): Promise<GeminiInterpretationResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();

  debugLog('Selected model', model);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: INTERPRET_THOUGHT_PROMPT }],
          },
          contents: [
            {
              role: 'user',
              parts: [
                { text: buildInterpretThoughtInput(rawText, temporalContext) },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema,
          },
        }),
        signal: controller.signal,
      },
    );

    debugLog('Response time (ms)', Date.now() - startedAt);

    if (!response.ok) {
      throw new GeminiServiceError(mapHttpError(response.status), model, response.status);
    }

    let responseBody: GeminiResponse;

    try {
      responseBody = (await response.json()) as GeminiResponse;
    } catch {
      throw new GeminiServiceError('invalid_json', model);
    }
    const responseText = responseBody.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('');

    if (!responseText) {
      throw new GeminiServiceError('invalid_json', model);
    }

    return { responseText, model };
  } catch (error: unknown) {
    if (error instanceof GeminiServiceError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new GeminiServiceError('timeout', model);
    }

    throw new GeminiServiceError('network', model);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function interpretThoughtWithGemini(
  rawText: string,
): Promise<GeminiInterpretationResponse> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new GeminiServiceError('missing_api_key', PRIMARY_MODEL);
  }

  const temporalContext = createInterpretThoughtTemporalContext();
  debugLog('Local date', temporalContext.currentLocalDate);
  debugLog('Timezone', temporalContext.timeZone);
  debugLog('Prompt version', INTERPRET_THOUGHT_PROMPT_VERSION);

  try {
    return await requestInterpretation(
      rawText,
      PRIMARY_MODEL,
      apiKey,
      temporalContext,
    );
  } catch (error: unknown) {
    if (
      error instanceof GeminiServiceError &&
      error.httpStatus !== undefined &&
      PRIMARY_UNAVAILABLE_STATUSES.has(error.httpStatus)
    ) {
      debugLog('Primary model unavailable; using fallback', FALLBACK_MODEL);
      return requestInterpretation(
        rawText,
        FALLBACK_MODEL,
        apiKey,
        temporalContext,
      );
    }

    throw error;
  }
}

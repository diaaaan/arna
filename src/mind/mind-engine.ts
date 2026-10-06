import type { Thought } from '../entities/thought/thought';
import { updateThoughtAnalysis } from '../storage/thought-storage';
import { deriveEntities } from './derivation/derive-entities';
import {
  GeminiServiceError,
  interpretThoughtWithGemini,
} from './services/gemini-service';
import {
  createFailedInterpretation,
  createPendingInterpretation,
  type ThoughtInterpretation,
} from './types/interpretation';
import { INTERPRET_THOUGHT_PROMPT_VERSION } from './prompts/interpret-thought';
import { parseInterpretationPayload } from './validation/interpretation-validator';

function debugLog(message: string, details?: unknown) {
  if (__DEV__) {
    console.log(`[Mind Engine] ${message}`, details ?? '');
  }
}

export async function analyzeThought(
  thought: Thought,
): Promise<ThoughtInterpretation> {
  const pendingInterpretation = createPendingInterpretation();
  await updateThoughtAnalysis(thought.id, pendingInterpretation);

  let interpretation: ThoughtInterpretation;

  try {
    const response = await interpretThoughtWithGemini(thought.rawText);
    debugLog('Received JSON', response.responseText);

    const validation = parseInterpretationPayload(response.responseText);
    debugLog('Validation result', validation.error ?? 'valid');

    interpretation = validation.payload
      ? {
          status: 'success',
          ...validation.payload,
          model: response.model,
          analyzedAt: new Date().toISOString(),
          errorCode: null,
          promptVersion: INTERPRET_THOUGHT_PROMPT_VERSION,
        }
      : createFailedInterpretation(
          validation.error ?? 'validation',
          response.model,
        );
  } catch (error: unknown) {
    const errorCode =
      error instanceof GeminiServiceError ? error.code : 'network';
    const model =
      error instanceof GeminiServiceError
        ? error.model
        : pendingInterpretation.model;

    debugLog('Validation result', `failed:${errorCode}`);
    interpretation = createFailedInterpretation(errorCode, model);
  }

  await updateThoughtAnalysis(thought.id, interpretation);

  if (interpretation.status === 'success') {
    try {
      await deriveEntities(thought, interpretation);
    } catch (error: unknown) {
      console.warn('[Mind Engine] Derivation failed', error);
    }
  }

  return interpretation;
}

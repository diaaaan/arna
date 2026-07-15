import type { InterpretThoughtTemporalContext } from '../context/temporal-context';

export const INTERPRET_THOUGHT_PROMPT_VERSION = 3;

export const INTERPRET_THOUGHT_PROMPT = `You interpret one saved user thought for Arna.

The original thought is immutable input. Never rewrite it or invent an intention that the user did not express.

Return only a JSON object matching the supplied JSON Schema. Do not return markdown, code fences, explanations, or additional fields.

Rules:
- Use "unknown" whenever the type, category, or urgency is not directly supported by the text or strong context.
- Determine type from the user's intent and scope, not merely from the presence of a verb.
- Use type "idea" for a hypothesis, possibility, proposal, raw concept, or something the user has not decided to execute. Strong signals include "можно", "а что если", "идея", and "попробовать бы".
- Use type "project" for an accepted larger goal, product, or initiative that requires multiple steps and has no single concrete next action or deadline in the thought.
- Use type "task" only for a concrete executable action or clear next step that can reasonably be marked complete as one action. A deadline or date is a strong task signal.
- Never classify a large multi-step initiative as "task" only because it starts with an action verb.
- Type and category are independent dimensions. Determine each separately; never use a category to force a type or a type to force a category.
- Never infer category from everyday associations. A short command is not automatically a home task.
- Determine category only from explicit words or sufficiently strong context. Otherwise use "unknown".
- confidence reflects confidence in the whole interpretation, including intent and context, not the ability to restate the text.
- Short ambiguous phrases should usually not receive confidence from 0.9 to 1.0. A plausible summary is not evidence that context is understood.
- dueDate must be null or an ISO date in YYYY-MM-DD format. Never return a datetime.
- Return dueDate only when a date is explicit or can be calculated unambiguously from the supplied local temporal context.
- Resolve today, tomorrow, the day after tomorrow, on Friday, by Friday, in a week, and next week relative to the supplied current local date, weekday, and timezone.
- "In a week" means exactly seven calendar days after the current local date. "Next week" without a weekday means Monday of the next calendar week.
- For "by Friday", choose the nearest future Friday. If the current day is Friday, choose the following Friday unless the text clearly says otherwise.
- If only a day is known, return YYYY-MM-DD without inventing a time of day. If the date is ambiguous, return null.
- Use items only when the thought clearly contains one or more list items; otherwise return an empty array.
- Every item must contain a concise title and a quantity.
- Extract an explicit quantity even when it appears before the title, after the title, after an urgency word, or in an x3-style form.
- If a quantity is not stated or is ambiguous, use null. Never invent a quantity.
- Quantity examples:
  - "Купить мыло 3" -> [{"title":"мыло","quantity":3}]
  - "Купить 3 мыла" -> [{"title":"мыло","quantity":3}]
  - "Купить мыло срочно 3" -> [{"title":"мыло","quantity":3}]
  - "Мыло x3, кондиционер и щётки" -> [{"title":"мыло","quantity":3},{"title":"кондиционер","quantity":null},{"title":"щётки","quantity":null}]
- Uncertainty examples:
  - "Убрать точки" -> type "task" or "unknown", category "unknown", urgency "unknown", dueDate null, confidence approximately 0.3 to 0.5.
  - "Убрать точки в макете детского профиля" -> type "task", category "work", high confidence.
  - "Убрать точки на столе" -> type "task", category "home" or "personal", medium or high confidence.
- Type and category examples:
  - "Можно сделать сервис доставки еды для офисов" -> type "idea", category "work".
  - "Идея сервиса доставки еды для офисов" -> type "idea", category "work".
  - "Сделать сервис доставки еды для офисов" -> type "project", category "work", because it is a significant multi-step initiative without a concrete next action or deadline.
  - "Сегодня начать прототип сервиса доставки еды" -> type "task", category "work", because it states a concrete next action for today.
  - "А что если сделать приложение для подсчёта калорий" -> type "idea"; determine category independently from the supported context.
  - "Нарисовать экран детского профиля до пятницы" -> type "task", category "work".
- Strong quote signals include: "цитата", "понравилась фраза", "сохранить фразу", "запомнить фразу", "хочу сохранить эту фразу", quoted text, explicit attribution, and explicitly cited text after a colon.
- Quote examples:
  - "Мне понравилась фраза: тек токтама" -> type "quote", category "personal" or "unknown", urgency "unknown", items [], high confidence.
  - "Запомнить фразу \"Всё проходит\"" -> type "quote".
  - "Заметка про хорошие фразы для презентации" -> type "note", not "quote", because it describes a note container rather than quoting a phrase.
- Keep summary concise and faithful to the original meaning.
- confidence must be between 0 and 1 and reflect uncertainty honestly.`;

export function buildInterpretThoughtInput(
  rawText: string,
  temporalContext: InterpretThoughtTemporalContext,
) {
  return JSON.stringify({
    temporalContext: {
      currentLocalDate: temporalContext.currentLocalDate,
      currentLocalDateTime: temporalContext.currentLocalDateTime,
      timeZone: temporalContext.timeZone,
      currentWeekday: temporalContext.currentWeekday,
    },
    rawText,
  });
}

import OpenAI from "openai";
import type {
  Response,
  ResponseStreamEvent,
  ResponseUsage,
} from "openai/resources/responses/responses";
import type { Stream } from "openai/streaming";

export type AIWorkflow =
  | "assignment_guide"
  | "class_material_analysis"
  | "flashcards"
  | "study_guide"
  | "study_session_tutor"
  | "tutor"
  | "syllabus_analysis";

type WorkflowConfig = {
  defaultModel: string;
  modelEnv: string;
  timeoutMs: number;
  maxRetries: number;
};

const DEFAULT_SDK_TIMEOUT_MS = 10 * 60 * 1_000;

export const AI_WORKFLOWS: Record<AIWorkflow, WorkflowConfig> = {
  assignment_guide: {
    defaultModel: "gpt-5.4-mini",
    modelEnv: "OPENAI_ASSIGNMENT_GUIDE_MODEL",
    timeoutMs: 60_000,
    maxRetries: 0,
  },
  class_material_analysis: {
    defaultModel: "gpt-5-mini",
    modelEnv: "OPENAI_CLASS_MATERIAL_MODEL",
    timeoutMs: 2 * 60_000,
    maxRetries: 0,
  },
  flashcards: {
    defaultModel: "gpt-5-mini",
    modelEnv: "OPENAI_FLASHCARDS_MODEL",
    timeoutMs: DEFAULT_SDK_TIMEOUT_MS,
    maxRetries: 2,
  },
  study_guide: {
    defaultModel: "gpt-5-mini",
    modelEnv: "OPENAI_STUDY_GUIDE_MODEL",
    timeoutMs: 4 * 60_000,
    maxRetries: 0,
  },
  study_session_tutor: {
    defaultModel: "gpt-5.4-mini",
    modelEnv: "OPENAI_STUDY_TUTOR_MODEL",
    timeoutMs: 60_000,
    maxRetries: 0,
  },
  tutor: {
    defaultModel: "gpt-5.4-mini",
    modelEnv: "OPENAI_TUTOR_MODEL",
    timeoutMs: DEFAULT_SDK_TIMEOUT_MS,
    maxRetries: 2,
  },
  syllabus_analysis: {
    defaultModel: "gpt-5-mini",
    modelEnv: "OPENAI_SYLLABUS_MODEL",
    timeoutMs: DEFAULT_SDK_TIMEOUT_MS,
    maxRetries: 2,
  },
};

type ModelPricing = {
  inputPerMillionUsd: number;
  cachedInputPerMillionUsd: number;
  outputPerMillionUsd: number;
};

// Standard API pricing captured 2026-08-06. Unknown overrides still emit usage,
// latency, and a null cost instead of silently applying the wrong rate.
const MODEL_PRICING: Array<{ prefix: string; pricing: ModelPricing }> = [
  {
    prefix: "gpt-5.4-mini",
    pricing: {
      inputPerMillionUsd: 0.75,
      cachedInputPerMillionUsd: 0.075,
      outputPerMillionUsd: 4.5,
    },
  },
  {
    prefix: "gpt-5-mini",
    pricing: {
      inputPerMillionUsd: 0.25,
      cachedInputPerMillionUsd: 0.025,
      outputPerMillionUsd: 2,
    },
  },
];

let client: OpenAI | null = null;

type AIRequestContext = {
  client: OpenAI;
  model: string;
  requestOptions: {
    maxRetries: number;
    signal?: AbortSignal;
    timeout: number;
  };
};

export type AIRequestMetric = {
  event: "ai.request";
  workflow: AIWorkflow;
  model: string;
  responseId: string | null;
  status: string;
  success: boolean;
  latencyMs: number;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  errorName: string | null;
};

export function getAIModel(workflow: AIWorkflow) {
  const config = AI_WORKFLOWS[workflow];
  return process.env[config.modelEnv]?.trim() || config.defaultModel;
}

export async function runAIRequest<T extends Response>(
  workflow: AIWorkflow,
  execute: (context: AIRequestContext) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const startedAt = Date.now();
  const context = getRequestContext(workflow, signal);

  try {
    const response = await execute(context);
    const parsedOutputMissing =
      "output_parsed" in response && response.output_parsed === null;
    recordAIRequestMetric(
      createMetric({
        workflow,
        model: response.model || context.model,
        response,
        latencyMs: Date.now() - startedAt,
        success: response.status === "completed" && !parsedOutputMissing,
        status: parsedOutputMissing ? "refused_or_unparsed" : undefined,
      }),
    );
    return response;
  } catch (error) {
    recordAIRequestMetric(
      createMetric({
        workflow,
        model: context.model,
        latencyMs: Date.now() - startedAt,
        success: false,
        error,
      }),
    );
    throw error;
  }
}

export async function runAIStream(
  workflow: AIWorkflow,
  execute: (
    context: AIRequestContext,
  ) => Promise<Stream<ResponseStreamEvent>>,
  signal?: AbortSignal,
) {
  const startedAt = Date.now();
  const context = getRequestContext(workflow, signal);
  let source: Stream<ResponseStreamEvent>;

  try {
    source = await execute(context);
  } catch (error) {
    recordAIRequestMetric(
      createMetric({
        workflow,
        model: context.model,
        latencyMs: Date.now() - startedAt,
        success: false,
        error,
      }),
    );
    throw error;
  }

  return {
    controller: source.controller,
    async *[Symbol.asyncIterator]() {
      let recorded = false;

      try {
        for await (const event of source) {
          if (event.type === "response.completed") {
            recorded = true;
            recordAIRequestMetric(
              createMetric({
                workflow,
                model: event.response.model || context.model,
                response: event.response,
                latencyMs: Date.now() - startedAt,
                success: true,
              }),
            );
          } else if (event.type === "response.failed") {
            recorded = true;
            recordAIRequestMetric(
              createMetric({
                workflow,
                model: event.response.model || context.model,
                response: event.response,
                latencyMs: Date.now() - startedAt,
                success: false,
              }),
            );
          }

          yield event;
        }

        if (!recorded) {
          recordAIRequestMetric(
            createMetric({
              workflow,
              model: context.model,
              latencyMs: Date.now() - startedAt,
              success: false,
              status: signal?.aborted ? "aborted" : "incomplete_stream",
            }),
          );
        }
      } catch (error) {
        if (!recorded) {
          recordAIRequestMetric(
            createMetric({
              workflow,
              model: context.model,
              latencyMs: Date.now() - startedAt,
              success: false,
              error,
            }),
          );
        }
        throw error;
      }
    },
  };
}

export function estimateAICostUsd(
  model: string,
  usage: Pick<
    ResponseUsage,
    "input_tokens" | "input_tokens_details" | "output_tokens"
  >,
) {
  const pricing = MODEL_PRICING.find(({ prefix }) =>
    model === prefix || model.startsWith(`${prefix}-`),
  )?.pricing;
  if (!pricing) return null;

  const cachedInputTokens = usage.input_tokens_details.cached_tokens ?? 0;
  const uncachedInputTokens = Math.max(
    0,
    usage.input_tokens - cachedInputTokens,
  );
  const cost =
    (uncachedInputTokens * pricing.inputPerMillionUsd
      + cachedInputTokens * pricing.cachedInputPerMillionUsd
      + usage.output_tokens * pricing.outputPerMillionUsd)
    / 1_000_000;

  return Number(cost.toFixed(8));
}

export function recordAIRequestMetric(metric: AIRequestMetric) {
  console.info(JSON.stringify(metric));
}

function getRequestContext(
  workflow: AIWorkflow,
  signal?: AbortSignal,
): AIRequestContext {
  const config = AI_WORKFLOWS[workflow];
  return {
    client: getOpenAIClient(),
    model: getAIModel(workflow),
    requestOptions: {
      maxRetries: config.maxRetries,
      signal,
      timeout: config.timeoutMs,
    },
  };
}

function getOpenAIClient() {
  client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  return client;
}

function createMetric(input: {
  workflow: AIWorkflow;
  model: string;
  latencyMs: number;
  success: boolean;
  response?: Response;
  error?: unknown;
  status?: string;
}): AIRequestMetric {
  const usage = input.response?.usage;
  return {
    event: "ai.request",
    workflow: input.workflow,
    model: input.model,
    responseId: input.response?.id ?? null,
    status:
      input.status
      ?? input.response?.status
      ?? (input.success ? "completed" : "error"),
    success: input.success,
    latencyMs: input.latencyMs,
    inputTokens: usage?.input_tokens ?? null,
    cachedInputTokens: usage?.input_tokens_details.cached_tokens ?? null,
    outputTokens: usage?.output_tokens ?? null,
    reasoningTokens: usage?.output_tokens_details.reasoning_tokens ?? null,
    totalTokens: usage?.total_tokens ?? null,
    estimatedCostUsd: usage
      ? estimateAICostUsd(input.model, usage)
      : null,
    errorName:
      input.error instanceof Error
        ? input.error.name
        : input.error
          ? "UnknownError"
          : null,
  };
}

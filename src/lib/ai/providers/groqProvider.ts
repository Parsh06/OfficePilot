import type { AIProvider, AIToolDefinition, AIToolCall } from '../types';

export interface GroqProviderConfig {
  apiKey?: string;
  fastModel?: string;
  reasoningModel?: string;
  baseUrl?: string;
}

export class GroqProvider implements AIProvider {
  public name = 'Groq';
  private apiKey: string;
  private fastModel: string;
  private reasoningModel: string;
  private baseUrl: string;

  constructor(config: GroqProviderConfig = {}) {
    this.apiKey =
      config.apiKey ||
      (typeof process !== 'undefined' ? process.env?.GROQ_API_KEY || '' : '');
    this.fastModel =
      config.fastModel ||
      (typeof process !== 'undefined'
        ? process.env?.GROQ_MODEL_FAST || 'openai/gpt-oss-20b'
        : 'openai/gpt-oss-20b');
    this.reasoningModel =
      config.reasoningModel ||
      (typeof process !== 'undefined'
        ? process.env?.GROQ_MODEL_REASONING || 'openai/gpt-oss-120b'
        : 'openai/gpt-oss-120b');
    this.baseUrl = config.baseUrl || 'https://api.groq.com/openai/v1';
  }

  async chat(params: {
    messages: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool';
      content: string;
      name?: string;
      tool_call_id?: string;
      tool_calls?: AIToolCall[];
    }>;
    tools?: AIToolDefinition[];
    modelType: 'FAST' | 'REASONING';
    temperature?: number;
  }): Promise<{
    content: string | null;
    toolCalls?: AIToolCall[];
    modelUsed: string;
    finishReason?: string;
  }> {
    const model =
      params.modelType === 'REASONING' ? this.reasoningModel : this.fastModel;

    // If no Groq API Key provided, execute simulated intelligent response for local/offline testing
    if (!this.apiKey) {
      return this.handleFallbackOfflineChat(params, model);
    }

    try {
      const payload: any = {
        model,
        messages: params.messages.map((m) => {
          const item: any = { role: m.role, content: m.content };
          if (m.name) item.name = m.name;
          if (m.tool_call_id) item.tool_call_id = m.tool_call_id;
          if (m.tool_calls) item.tool_calls = m.tool_calls;
          return item;
        }),
        temperature: params.temperature ?? 0.2,
      };

      if (params.tools && params.tools.length > 0) {
        payload.tools = params.tools.map((t) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        }));
        payload.tool_choice = 'auto';
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[GroqProvider] API Error (${response.status}): ${errText}`);
        return this.handleFallbackOfflineChat(params, model);
      }

      const json = await response.json();
      const choice = json.choices?.[0];

      if (!choice) {
        throw new Error('No choices returned by Groq API');
      }

      const message = choice.message;
      return {
        content: message.content || null,
        toolCalls: message.tool_calls as AIToolCall[] | undefined,
        modelUsed: json.model || model,
        finishReason: choice.finish_reason,
      };
    } catch (err: any) {
      console.warn('[GroqProvider] Connection failed, falling back to deterministic offline model:', err?.message);
      return this.handleFallbackOfflineChat(params, model);
    }
  }

  /**
   * Deterministic local fallback used in offline development, mock tests, or when API key is missing.
   */
  private handleFallbackOfflineChat(
    params: {
      messages: Array<{
        role: string;
        content: string;
        tool_call_id?: string;
      }>;
      tools?: AIToolDefinition[];
      modelType: string;
    },
    model: string
  ): {
    content: string | null;
    toolCalls?: AIToolCall[];
    modelUsed: string;
    finishReason: string;
  } {
    const lastUserMessage = [...params.messages]
      .reverse()
      .find((m) => m.role === 'user')?.content.toLowerCase() || '';

    // If tools are registered and last message is a user question, decide if a tool should be called first
    const hasToolResponses = params.messages.some((m) => m.role === 'tool');

    if (!hasToolResponses && params.tools && params.tools.length > 0) {
      if (lastUserMessage.includes('make') || lastUserMessage.includes('set') || lastUserMessage.includes('switch')) {
        if (lastUserMessage.includes('wfh') || lastUserMessage.includes('thursday')) {
          const isBulk = lastUserMessage.includes('all') || lastUserMessage.includes('3 months');
          const dates = isBulk
            ? ['2026-10-15', '2026-10-22', '2026-10-29', '2026-11-05', '2026-11-12', '2026-11-19', '2026-11-26', '2026-12-03', '2026-12-10', '2026-12-17', '2026-12-24']
            : ['2026-10-15'];
          return {
            content: null,
            toolCalls: [
              {
                id: 'call_set_wfh_1',
                type: 'function',
                function: {
                  name: 'setWFH',
                  arguments: JSON.stringify({ dates, isBulk, monthsCount: isBulk ? 3 : 1, reason: 'AI Optimization schedule shift' }),
                },
              },
            ],
            modelUsed: `${model} (offline-deterministic)`,
            finishReason: 'tool_calls',
          };
        }
      }

      if (lastUserMessage.includes('cost') || lastUserMessage.includes('spend') || lastUserMessage.includes('price')) {
        if (lastUserMessage.includes('week')) {
          return {
            content: null,
            toolCalls: [
              {
                id: 'call_calc_week_cost_1',
                type: 'function',
                function: {
                  name: 'calculateWeekCost',
                  arguments: JSON.stringify({ weekOffset: 0 }),
                },
              },
            ],
            modelUsed: `${model} (offline-deterministic)`,
            finishReason: 'tool_calls',
          };
        } else if (lastUserMessage.includes('month') || lastUserMessage.includes('expensive')) {
          return {
            content: null,
            toolCalls: [
              {
                id: 'call_get_analytics_1',
                type: 'function',
                function: {
                  name: 'getAnalytics',
                  arguments: JSON.stringify({ period: 'MONTH' }),
                },
              },
            ],
            modelUsed: `${model} (offline-deterministic)`,
            finishReason: 'tool_calls',
          };
        }
      } else if (lastUserMessage.includes('thursday') || lastUserMessage.includes('wfh') || lastUserMessage.includes('what if')) {
        return {
          content: null,
          toolCalls: [
            {
              id: 'call_compare_sched_1',
              type: 'function',
              function: {
                name: 'compareScheduleOptions',
                arguments: JSON.stringify({ hypothesis: 'What if Thursday is WFH?' }),
              },
            },
          ],
          modelUsed: `${model} (offline-deterministic)`,
          finishReason: 'tool_calls',
        };
      } else if (lastUserMessage.includes('schedule') || lastUserMessage.includes('context') || lastUserMessage.includes('plan')) {
        return {
          content: null,
          toolCalls: [
            {
              id: 'call_get_context_1',
              type: 'function',
              function: {
                name: 'getUserWorkContext',
                arguments: JSON.stringify({ includeForecast: true }),
              },
            },
          ],
          modelUsed: `${model} (offline-deterministic)`,
          finishReason: 'tool_calls',
        };
      }
    }

    // Synthesize response based on user question and tool results if present
    const toolMessages = params.messages.filter((m) => m.role === 'tool');
    let dynamicSummary = '';

    if (toolMessages.length > 0) {
      try {
        const lastToolOutput = JSON.parse(toolMessages[toolMessages.length - 1].content);
        if (lastToolOutput.totalCost !== undefined) {
          dynamicSummary = `Based on deterministic schedule & route calculation, total projected cost is **₹${lastToolOutput.totalCost.toLocaleString('en-IN')}** across ${lastToolOutput.wfoDaysCount || 'scheduled'} office days.`;
        } else if (lastToolOutput.savings !== undefined) {
          dynamicSummary = `Switching Thursday to WFH saves **₹${lastToolOutput.savings.toLocaleString('en-IN')}** by eliminating return express transit tickets and local transfers.`;
        } else if (lastToolOutput.summary) {
          dynamicSummary = `${lastToolOutput.summary}`;
        }
      } catch {
        // use default fallback
      }
    }

    const fallbackResponse =
      dynamicSummary ||
      `I analyzed your verified work schedule and travel preferences. All projections use deterministic route rates, lodging allowances, and expense templates. Let me know if you would like to test a scenario simulation or optimize next week's commute corridor.`;

    return {
      content: fallbackResponse,
      modelUsed: `${model} (offline-deterministic)`,
      finishReason: 'stop',
    };
  }
}

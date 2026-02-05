const API_KEY = 'c87829d8a0dd941e60fa2a2e265728f039534d4061b36f6a572159678eab3bca8829550ada87bc4f496d150dc4d0420a';
const API_URL = 'https://api.getunbound.ai/v1/chat/completions';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface CallResult {
  content: string;
  usage?: TokenUsage;
}

export async function callUnboundAPI(model: string, prompt: string, context?: string): Promise<CallResult> {
  const fullPrompt = context
    ? `Previous Step Context:\n${context}\n\nTask:\n${prompt}`
    : prompt;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: fullPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'API call failed');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  const usage = data.usage
    ? {
        promptTokens: data.usage.prompt_tokens ?? 0,
        completionTokens: data.usage.completion_tokens ?? 0
      }
    : undefined;
  return { content, usage };
}

export async function evaluateLLMCriteria(output: string, criteria: string) {
  const prompt = `Evaluate if the following text meets the given criteria. 
Respond with ONLY "PASS" or "FAIL" followed by a brief reason.

Criteria: ${criteria}

Text to evaluate: 
---
${output}
---
`;

  const result = await callUnboundAPI('kimi-k2p5', prompt);
  return {
    passed: result.content.toUpperCase().includes('PASS'),
    reason: result.content
  };
}

export function computeCost(usage: TokenUsage | undefined, costPer1k: number): number {
  if (!usage || costPer1k <= 0) return 0;
  const total = usage.promptTokens + usage.completionTokens;
  return (total / 1000) * costPer1k;
}

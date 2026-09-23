export interface Skill {
  name: string;
  shortDescription: string;
  fullDescription: string;
  excerpt: string;
}

export interface NoulQuestion {
  type: 'noul';
  instructions: string;
}

export interface ChoiceQuestion {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string>;
}

export interface TypeSafeRequest {
  state: {
    request: string;
    recent_context: string;
  };
  model: string;
  questions: Record<string, NoulQuestion | ChoiceQuestion>;
}

export interface NoulAnswer {
  type: 'noul';
  noul: number;
}

export interface ChoiceAnswer {
  type: 'choice';
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface TypeSafeResponse {
  answers: Record<string, NoulAnswer | ChoiceAnswer>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  timing_ms?: number;
}

export interface WideRankResult {
  gateScore: number;
  rankedProbabilities: Array<{ name: string; probability: number }>;
  choice: string;
  raw: TypeSafeResponse;
}

export interface RerankResult {
  fits: Record<string, number>;
  winner: string | null;
  reason: string;
  raw: TypeSafeResponse;
}

import type { QuestionInput } from '@evalot/contracts';
// Provider-independent boundary. Engines propose marks; only teacher review can finalize them.
export interface ExtractedAnswer {text: string; confidence: number; source: {storageKey: string; page: number; bounds: number[]};}
export interface MarkProposal {suggestedMark: number; confidence: number; rationale: string; engine: string; engineVersion: string;}
export interface CorrectionEngine {evaluate(question: QuestionInput, answer: ExtractedAnswer): Promise<MarkProposal>;}
export interface ExtractionService {extract(storageKey: string): Promise<ExtractedAnswer[]>;}
// No fallback AI marks are fabricated when a provider is unavailable.

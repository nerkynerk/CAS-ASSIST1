import type { AppRole } from '../types.js';

export interface KnowledgeCandidate {
  id: string;
  title: string;
  section?: string | null;
  category: string;
  content: string;
  keywords: string[];
  sourceType: 'tier1' | 'verified_document';
  audienceRoles?: AppRole[];
}

export interface RankedKnowledge extends KnowledgeCandidate {
  confidence: number;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'do', 'for', 'from', 'how', 'i', 'in', 'is', 'it',
  'me', 'my', 'of', 'on', 'please', 'the', 'to', 'what', 'when', 'where', 'which', 'with',
]);

const SYNONYMS: Record<string, string[]> = {
  advisor: ['advising', 'consultation'],
  adviser: ['advising', 'consultation'],
  advising: ['advisor', 'adviser', 'consult', 'consultation'],
  consult: ['advising', 'consultation'],
  consultation: ['consult', 'advising'],
  classroom: ['room', 'location'],
  venue: ['room', 'location'],
  moved: ['change', 'relocation'],
  track: ['status', 'tracking'],
  certificate: ['document', 'request'],
  transcript: ['document', 'records'],
  tor: ['transcript', 'document'],
  login: ['account', 'sign'],
  signin: ['account', 'login'],
  enrolment: ['enrollment'],
  requirements: ['requirement', 'policy'],
  notices: ['announcement', 'updates'],
  news: ['announcement', 'updates'],
  night: ['dark', 'theme'],
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  return [...new Set(normalize(value).split(' ').filter(token => token.length > 1 && !STOP_WORDS.has(token)))];
}

function expandedTokens(value: string): string[] {
  const base = tokens(value);
  return [...new Set(base.flatMap(token => [token, ...(SYNONYMS[token] ?? [])]))];
}

export function rankKnowledge(query: string, candidates: KnowledgeCandidate[], role: AppRole): RankedKnowledge | null {
  const original = tokens(query);
  const expanded = expandedTokens(query);
  if (!original.length) return null;

  let best: RankedKnowledge | null = null;
  for (const candidate of candidates) {
    if (candidate.audienceRoles && !candidate.audienceRoles.includes(role)) continue;

    const title = new Set(expandedTokens(candidate.title));
    const keyword = new Set(candidate.keywords.flatMap(expandedTokens));
    const content = new Set(expandedTokens(candidate.content));
    let weightedMatches = 0;
    let originalMatches = 0;

    for (const token of expanded) {
      if (keyword.has(token)) weightedMatches += 3.2;
      else if (title.has(token)) weightedMatches += 2.5;
      else if (content.has(token)) weightedMatches += 1;
    }
    for (const token of original) {
      if (keyword.has(token) || title.has(token) || content.has(token)) originalMatches += 1;
    }

    const coverage = originalMatches / original.length;
    const relevance = weightedMatches / Math.max(expanded.length * 3.2, 1);
    const normalizedQuery = normalize(query);
    const phraseBonus = normalize(candidate.title).includes(normalizedQuery) || candidate.keywords.some(item => normalizedQuery.includes(normalize(item))) ? 0.12 : 0;
    const verifiedBonus = candidate.sourceType === 'verified_document' ? 0.06 : 0;
    const confidence = Math.min(0.98, coverage * 0.62 + relevance * 0.26 + phraseBonus + verifiedBonus);

    if (!best || confidence > best.confidence) best = { ...candidate, confidence };
  }

  return best;
}

export function isConfidentMatch(result: RankedKnowledge | null): result is RankedKnowledge {
  return Boolean(result && result.confidence >= 0.42);
}

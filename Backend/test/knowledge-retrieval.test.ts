import { describe, expect, it } from 'vitest';

import { isConfidentMatch, rankKnowledge, type KnowledgeCandidate } from '../src/services/knowledge-retrieval.js';

const candidates: KnowledgeCandidate[] = [
  {
    id: 'advising', title: 'Submitting an advising request', category: 'advising',
    content: 'Students submit advising requests from the Requests tab.',
    keywords: ['advising', 'advisor', 'request', 'consultation'], sourceType: 'tier1',
  },
  {
    id: 'room', title: 'Room-change updates', category: 'room_changes',
    content: 'Faculty record a room change and enrolled students acknowledge it.',
    keywords: ['room', 'classroom', 'location', 'relocation'], sourceType: 'tier1',
  },
];

describe('closed-domain knowledge retrieval', () => {
  it('matches natural-language synonyms to the correct article', () => {
    const result = rankKnowledge('Where can I consult my adviser?', candidates, 'student');
    expect(result?.id).toBe('advising');
    expect(isConfidentMatch(result)).toBe(true);
  });

  it('rejects unrelated open-domain questions', () => {
    const result = rankKnowledge('Who won the international football championship?', candidates, 'staff');
    expect(isConfidentMatch(result)).toBe(false);
  });

  it('respects article audience restrictions', () => {
    const restricted = [{ ...candidates[0], audienceRoles: ['student' as const] }];
    expect(rankKnowledge('advising request', restricted, 'faculty')).toBeNull();
  });
});

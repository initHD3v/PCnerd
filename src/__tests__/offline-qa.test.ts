import { describe, it, expect } from 'vitest';
import { isOfflineQuestion, offlineQaFallback } from '@/lib/offline-qa';

// Simulates an offline 2-turn chat: review RTX 5070, then follow-up holding
// context ("bagaimana jika 5050").
function offlineConversation() {
  const turn1 = offlineQaFallback('tolong berikan review untuk vga rtx5070');
  const history = [
    { role: 'user', text: 'tolong berikan review untuk vga rtx5070' },
    { role: 'assistant', text: turn1 ?? '' },
  ];
  return { turn1, history, turn2: offlineQaFallback('bagaimana jika 5050', history) };
}

describe('isOfflineQuestion', () => {
  it('detects review requests', () => {
    expect(isOfflineQuestion('tolong berikan review untuk vga gtx5070', false)).toBe(true);
  });

  it('detects comparisons', () => {
    expect(isOfflineQuestion('RTX 4060 vs RX 7600 mana yang lebih baik?', false)).toBe(true);
    expect(isOfflineQuestion('perbandingan Ryzen 7 5800X dan Intel i5-12400', false)).toBe(true);
  });

  it('detects spec/performance questions', () => {
    expect(isOfflineQuestion('berapa fps RTX 3070 di 1440p?', false)).toBe(true);
    expect(isOfflineQuestion('cara mengatasi PC boot loop', false)).toBe(true);
    expect(isOfflineQuestion('apa itu bottleneck?', false)).toBe(true);
  });

  it('does NOT treat build requests as questions', () => {
    expect(isOfflineQuestion('15 juta buat gaming RTX 4060', true)).toBe(false);
    expect(isOfflineQuestion('rakit pc gaming 10 juta', false)).toBe(false);
    expect(isOfflineQuestion('pc buat editing 4K', false)).toBe(false);
  });

  it('classifies a bare follow-up as question only when there is context', () => {
    expect(isOfflineQuestion('bagaimana jika 5050', false, true)).toBe(true);
    expect(isOfflineQuestion('bagaimana jika 5050', false, false)).toBe(false);
  });
});

describe('offlineQaFallback', () => {
  it('reviews a GPU and corrects GTX 5070 -> RTX 5070', () => {
    const answer = offlineQaFallback('tolong berikan review untuk vga gtx5070');
    expect(answer).not.toBeNull();
    expect(answer).toContain('RTX 5070');
    expect(answer).toContain('140 FPS');
    expect(answer).not.toContain('GTX 5070');
  });

  it('reviews an AMD GPU', () => {
    const answer = offlineQaFallback('review RX 7600');
    expect(answer).not.toBeNull();
    expect(answer).toContain('RX 7600');
    expect(answer).toContain('FPS');
  });

  it('reviews a CPU with PassMark scores', () => {
    const answer = offlineQaFallback('review Ryzen 7 5800X');
    expect(answer).not.toBeNull();
    expect(answer).toContain('Ryzen 7 5800X');
    expect(answer).toContain('PassMark');
  });

  it('returns null when nothing known is mentioned', () => {
    expect(offlineQaFallback('tolong berikan review untuk motherboard aneh')).toBeNull();
  });

  it('reviews RTX 5070 in turn 1', () => {
    const { turn1 } = offlineConversation();
    expect(turn1).not.toBeNull();
    expect(turn1).toContain('RTX 5070');
    expect(turn1).toContain('140 FPS');
  });

  it('keeps context for the follow-up "bagaimana jika 5050"', () => {
    const { turn2, turn1 } = offlineConversation();
    expect(turn2).not.toBeNull();
    expect(turn2).toContain('RTX 5050');
    expect(turn2).toContain('78 FPS');
    // The follow-up answer explicitly links back to the previous card.
    expect(turn2).toContain('RTX 5070');
  });

  it('does not fabricate a component when follow-up has no history', () => {
    expect(offlineQaFallback('bagaimana jika 5050')).toBeNull();
  });
});

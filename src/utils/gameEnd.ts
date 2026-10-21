export type InningHalf = 'top' | 'bottom';

export interface InningScore {
  inning: number;
  half: InningHalf;
  topScore: number;
  bottomScore: number;
}

export type GameEndDecision =
  | { action: 'none' }
  | { action: 'finish'; reason: 'regulation' | 'walkoff'; message: string }
  | { action: 'ask'; reason: 'cold' | 'walkoffCold'; message: string };

const halfName = (half: InningHalf) => (half === 'top' ? '表' : '裏');

const leadMargin = (topScore: number, bottomScore: number) => Math.abs(topScore - bottomScore);

const isColdMargin = (inning: number, margin: number) => {
  if (inning === 4) return margin >= 10;
  if (inning >= 5 && inning < 7) return margin >= 7;
  return false;
};

/** 3アウトでハーフが終わった直後。引数はそのハーフ終了時点の回数と得点。 */
export const evaluateAfterHalf = (ended: InningScore): GameEndDecision => {
  const { inning, half, topScore, bottomScore } = ended;
  const homeLead = bottomScore - topScore;
  const visitorLead = topScore - bottomScore;
  const margin = leadMargin(topScore, bottomScore);
  const label = `${inning}回${halfName(half)}終了`;

  if (half === 'top') {
    if (homeLead <= 0) return { action: 'none' };
    if (inning >= 7) {
      return { action: 'finish', reason: 'regulation', message: `${label}、後攻リードのため終了` };
    }
    if (isColdMargin(inning, homeLead)) {
      return { action: 'ask', reason: 'cold', message: `${label}、${margin}点差です。コールドで終了しますか？` };
    }
    return { action: 'none' };
  }

  if (inning >= 7 && visitorLead > 0) {
    return { action: 'finish', reason: 'regulation', message: `${label}、先攻リードのため終了` };
  }
  if (visitorLead > 0 && isColdMargin(inning, visitorLead)) {
    return { action: 'ask', reason: 'cold', message: `${label}、${margin}点差です。コールドで終了しますか？` };
  }
  return { action: 'none' };
};

/** 裏の攻撃中に得点が入り、後攻がリードした直後。3アウトは待たない。 */
export const evaluateAfterRuns = (current: InningScore): GameEndDecision => {
  if (current.half !== 'bottom') return { action: 'none' };
  const homeLead = current.bottomScore - current.topScore;
  if (homeLead <= 0) return { action: 'none' };

  const label = `${current.inning}回裏`;
  if (current.inning >= 7) {
    return { action: 'finish', reason: 'walkoff', message: `${label}、サヨナラのため終了` };
  }
  if (isColdMargin(current.inning, homeLead)) {
    const margin = leadMargin(current.topScore, current.bottomScore);
    return {
      action: 'ask',
      reason: 'walkoffCold',
      message: `${label}、${margin}点差です。サヨナラコールドで終了しますか？`,
    };
  }
  return { action: 'none' };
};

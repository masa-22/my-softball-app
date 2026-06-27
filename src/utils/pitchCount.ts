import { PitchData } from '../types/PitchData';

/**
 * 投球列を先頭から畳み込み、ストライクゾーン上の B/S を求める（useGameProcessor.calculateCountBefore と同一規則）。
 * @param stopBeforeOrder 指定時は `order < stopBeforeOrder` の球のみ反映（直前カウント用）
 */
export function foldPitchCount(
  pitches: PitchData[],
  initialBalls: number,
  initialStrikes: number,
  stopBeforeOrder?: number
): { b: number; s: number } {
  let balls = initialBalls;
  let strikes = initialStrikes;
  const sorted = [...pitches].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const pitch of sorted) {
    if (stopBeforeOrder !== undefined && (pitch.order ?? 0) >= stopBeforeOrder) break;

    switch (pitch.result) {
      case 'ball':
        balls = Math.min(3, balls + 1);
        break;
      case 'swing':
      case 'looking':
        strikes = Math.min(2, strikes + 1);
        break;
      case 'foul':
        if (strikes < 2) {
          strikes = Math.min(2, strikes + 1);
        }
        break;
      case 'inplay':
      case 'deadball':
        break;
    }
  }
  return { b: balls, s: strikes };
}

/** 打席先頭（0-0）から、与えられた投球列の直後の B/S */
export function getCountAfterPitches(pitches: PitchData[]): { b: number; s: number } {
  return foldPitchCount(pitches, 0, 0);
}

/**
 * targetSeq 球の直前のカウント（1球目は常に 0-0）。PitchRecord / AtBat 保存用の { B, S } 形式。
 */
export function calculateCountBeforePitchOrder(
  pitches: PitchData[],
  initialBalls: number,
  initialStrikes: number,
  targetSeq: number
): { B: number; S: number } {
  if (targetSeq <= 1) return { B: 0, S: 0 };
  const { b, s } = foldPitchCount(pitches, initialBalls, initialStrikes, targetSeq);
  return { B: b, S: s };
}

/**
 * ランナー動き入力で使う型定義（RunnerMovementInput / useRunnerMovement で共有）
 */
import type { ScoredRunnerEntry } from '../../types/AtBat';

export type BaseKey = '1' | '2' | '3' | 'home';

/** 進塁理由「エラー」で選択した送球/捕球の詳細（playDetails に追加する用） */
export interface AdvanceErrorDetail {
  position: string;
  errorType: 'throw' | 'catch';
}

export interface RunnerMovementResult {
  afterRunners: { '1': string | null; '2': string | null; '3': string | null };
  outsAfter: number;
  scoredRunners: ScoredRunnerEntry[];
  outDetails: Array<{
    runnerId: string;
    base: string;
    threwPosition: string;
    caughtPosition: string;
  }>;
  scoredRunnerReasons?: Record<string, 'hit' | 'error' | 'steal' | 'wildpitch' | 'passball'>;
  advanceErrorDetail?: AdvanceErrorDetail;
}

export interface RunnerMovementInputProps {
  onComplete?: (result: RunnerMovementResult) => void;
  onCancel?: () => void;
  initialRunners?: { '1': string | null; '2': string | null; '3': string | null };
  battingResult?: string;
  batterId?: string;
  initialOuts?: number;
  presetOutsAfter?: number | null;
  battingResultLabel?: string;
  pitches?: Array<{
    id: number;
    x: number;
    y: number;
    type: import('../../types/PitchType').PitchType;
    order: number;
    result: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul';
  }>;
  battingOrder?: number;
  offenseTeamId?: string | null;
  playDetails?: {
    position: string;
    batType: string;
    outfieldDirection: string;
    fieldingOptions?: {
      putoutPosition?: string;
      assistPosition?: string;
    };
  };
}

/**
 * ランナー動き入力で使う型定義（RunnerMovementInput / useRunnerMovement で共有）
 */
import type { ScoredRunnerEntry } from '../../types/AtBat';
import type { AdvanceReasonCode } from './runner/AdvanceReasonDialog';
import type { AdvanceErrorOption } from '../../utils/advanceErrors';

export type BaseKey = '1' | '2' | '3' | 'home';

/** 進塁理由「エラー」で選んだ失策。countsAsNew のときだけ失策数を増やす */
export interface AdvanceErrorDetail {
  id: string;
  position: string;
  errorType?: 'throw' | 'catch';
  countsAsNew: boolean;
  sameAsResult?: boolean;
}

/** 自動進塁のあとに記録した追加進塁 */
export interface ExtraAdvance {
  runnerId: string;
  fromBase: '1' | '2' | '3';
  toBase: BaseKey;
  reason: AdvanceReasonCode;
  errorDetail?: AdvanceErrorDetail;
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
  /** 走者ごとの追加進塁理由（本塁以外も含む） */
  scoredRunnerReasons?: Record<string, AdvanceReasonCode>;
  /** 進塁理由で選択した失策（複数可。同じ id は1失策） */
  advanceErrorDetails?: AdvanceErrorDetail[];
  /** 自動進塁を超える追加進塁 */
  extraAdvances?: ExtraAdvance[];
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
  /** この打席で既に記録した進塁失策 */
  knownErrors?: AdvanceErrorOption[];
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

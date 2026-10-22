import { POSITIONS } from '../data/softball/positions';

/** 送球失策・捕球失策 */
export type ErrorType = 'throw' | 'catch';

/** 進塁理由で参照する失策1件 */
export interface AdvanceErrorOption {
  id: string;
  /** 守備略称（P, C, 1B...） */
  positionAbbr: string;
  errorType?: ErrorType;
  origin: 'result' | 'prior' | 'new';
  /** この選択で失策数を増やす。結果の失策・保存済みの失策は false */
  countsAsNew: boolean;
}

export interface AdvanceErrorDetail {
  errorId: string;
  errorBy?: string;
  errorType?: ErrorType;
  sameAsResult?: boolean;
  countsAsNew?: boolean;
}

export function createAdvanceErrorId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `err-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function positionNameByAbbr(abbr: string): string {
  const pos = Object.values(POSITIONS).find((p) => p.abbr === abbr);
  return pos?.name ?? abbr;
}

/** 打撃結果エラー（守備位置コード 1-9）を一覧の先頭候補にする */
export function resultErrorOption(positionCode: string): AdvanceErrorOption | null {
  const pos = POSITIONS[positionCode];
  if (!pos || pos.type === 'not_onfield') return null;
  return {
    id: `result-${positionCode}`,
    positionAbbr: pos.abbr,
    origin: 'result',
    countsAsNew: false,
  };
}

export function advanceErrorLabel(err: AdvanceErrorOption): string {
  const name = positionNameByAbbr(err.positionAbbr);
  if (err.origin === 'result') return `この結果の失策（${name}）`;
  const kind = err.errorType === 'throw' ? '送球エラー' : err.errorType === 'catch' ? '捕球エラー' : '失策';
  return `${name}の${kind}`;
}

export function errorDetailFromOption(err: AdvanceErrorOption): AdvanceErrorDetail {
  return {
    errorId: err.id,
    errorBy: err.positionAbbr,
    errorType: err.errorType,
    sameAsResult: err.origin === 'result',
    countsAsNew: err.countsAsNew,
  };
}

/** 確定済みの進塁失策を、次のダイアログでは再計上しない候補にする */
export function toPriorError(detail: AdvanceErrorDetail): AdvanceErrorOption | null {
  if (!detail.errorId || !detail.countsAsNew) return null;
  return {
    id: detail.errorId,
    positionAbbr: detail.errorBy || '',
    errorType: detail.errorType,
    origin: 'prior',
    countsAsNew: false,
  };
}

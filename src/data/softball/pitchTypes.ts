import { PitchType } from '../../components/play/common/PitchTypeSelector';

// 球種 (Pitch Types)
export interface PitchTypeDef {
  code: PitchType;
  name: string;
}

export const PITCH_TYPES: Record<PitchType, PitchTypeDef> = {
  rise: { code: 'rise', name: 'ライズ' },
  drop: { code: 'drop', name: 'ドロップ' },
  cut: { code: 'cut', name: 'カット' },
  changeup: { code: 'changeup', name: 'チェンジアップ' },
  chenrai: { code: 'chenrai', name: 'チェンライ' },
  slider: { code: 'slider', name: 'スライダー' },
  unknown: { code: 'unknown', name: '不明' },
} as const;

export const PITCH_TYPE_LIST = Object.values(PITCH_TYPES);


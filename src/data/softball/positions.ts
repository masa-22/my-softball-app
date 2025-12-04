// 守備位置 (Positions)
export interface PositionDef {
  code: string;      // '1', '2'...
  name: string;      // ピッチャー
  shortName: string; // 投
  abbr: string;      // P
  type: 'infield' | 'outfield' | 'not_onfield';
}

export const POSITIONS: Record<string, PositionDef> = {
  '1': { code: '1', name: '投手', shortName: '投', abbr: 'P', type: 'infield' },
  '2': { code: '2', name: '捕手', shortName: '捕', abbr: 'C', type: 'infield' },
  '3': { code: '3', name: '一塁手', shortName: '一', abbr: '1B', type: 'infield' },
  '4': { code: '4', name: '二塁手', shortName: '二', abbr: '2B', type: 'infield' },
  '5': { code: '5', name: '三塁手', shortName: '三', abbr: '3B', type: 'infield' },
  '6': { code: '6', name: '遊撃手', shortName: '遊', abbr: 'SS', type: 'infield' },
  '7': { code: '7', name: '左翼手', shortName: '左', abbr: 'LF', type: 'outfield' },
  '8': { code: '8', name: '中堅手', shortName: '中', abbr: 'CF', type: 'outfield' },
  '9': { code: '9', name: '右翼手', shortName: '右', abbr: 'RF', type: 'outfield' },
  'DP': { code: 'DP', name: '指名選手', shortName: 'DP', abbr: 'DP', type: 'not_onfield' },
  'PH': { code: 'PH', name: '代打', shortName: 'PH', abbr: 'PH', type: 'not_onfield' },
  'PR': { code: 'PR', name: '代走', shortName: 'PR', abbr: 'PR', type: 'not_onfield' },
  'TR': { code: 'TR', name: 'テンポラリーランナー', shortName: 'TR', abbr: 'TR', type: 'not_onfield' },
} as const;

export const POSITION_LIST = Object.values(POSITIONS);


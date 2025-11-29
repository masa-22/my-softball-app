/**
 * 1球・1プレーごとのデータを管理するサービス。
 * - play/pitchデータの保存・取得・更新・削除などを担当。
 * - matchIdごとに配列で管理する想定。
 */
export type Play = {
  id: string; // 1プレーごとのユニークID
  matchId: string;
  inning: number;
  topOrBottom: 'top' | 'bottom';
  order: number;
  pitchCount: number;
  batterId: string;
  pitcherId: string;
  result: string; // 'ストライク', 'ボール', 'ファウル', 'ヒット', 'アウト', '得点'など
  runners: { first?: string; second?: string; third?: string };
  playDetail?: string;
  timestamp: string;
  // 必要に応じてフィールド追加
};

// 実装は後で追加

type PlaysByMatch = Record<string, Play[]>;

let playsByMatch: PlaysByMatch = {};

const load = () => {
  try {
    const raw = localStorage.getItem('plays');
    if (raw) {
      playsByMatch = JSON.parse(raw);
      return;
    }
  } catch (e) {
    console.warn('plays load error', e);
  }
  playsByMatch = {};
  persist();
};

const persist = () => {
  try {
    localStorage.setItem('plays', JSON.stringify(playsByMatch));
  } catch (e) {
    console.warn('plays save error', e);
  }
};

load();

/**
 * 試合ごとのプレイ一覧を取得
 */
export const getPlays = (matchId: string): Play[] => {
  return (playsByMatch[matchId] || []).slice();
};

/**
 * 1プレイを保存（末尾に追加）
 */
export const savePlay = (play: Play): void => {
  const list = playsByMatch[play.matchId] || [];
  list.push(play);
  playsByMatch[play.matchId] = list;
  persist();
};

/**
 * スコアボード用の集計データ
 */
export type ScoreBoardData = {
  innings: { inning: number; top: number; bottom: number }[]; // 各回の表/裏得点
  totals: { home: number; away: number }; // 合計得点
  current: { inning: number; half: 'top' | 'bottom' }; // 現在のイニング（強調表示用）
};

/**
 * プレイ結果から簡易的に得点を集計
 * - result が '得点' または 'ヒット' に紐づく得点加算など、詳細ロジックは後で強化可能
 * - ここでは result === '得点' のとき1点加算する簡易仕様
 */
export const computeScoreBoard = (matchId: string): ScoreBoardData => {
  const plays = getPlays(matchId);
  // 回ごとの入れ物（最大はプレイから決定）
  const inningMax = plays.reduce((max, p) => Math.max(max, p.inning), 1);
  const innings: { inning: number; top: number; bottom: number }[] = [];
  for (let i = 1; i <= inningMax; i++) {
    innings.push({ inning: i, top: 0, bottom: 0 });
  }

  // 得点加算
  plays.forEach((p) => {
    if (p.result === '得点') {
      const rec = innings.find((x) => x.inning === p.inning);
      if (!rec) return;
      if (p.topOrBottom === 'top') rec.top += 1;
      else rec.bottom += 1;
    }
  });

  // 合計
  const totals = innings.reduce(
    (acc, x) => ({ home: acc.home + x.top, away: acc.away + x.bottom }),
    { home: 0, away: 0 }
  );

  // 現在イニング（最後のプレイから推定）
  const last = plays.length ? plays[plays.length - 1] : undefined;
  const current = {
    inning: last ? last.inning : 1,
    half: last ? last.topOrBottom : 'top',
  };

  return { innings, totals, current };
};

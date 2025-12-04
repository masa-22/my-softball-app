import {
  ParticipationStatus,
  ParticipationEntry,
  ParticipationTable
} from '../types/Participation';

let participations: Record<string, ParticipationTable> = {};

const loadParticipations = () => {
  try {
    const raw = localStorage.getItem('participations');
    if (raw) {
      participations = JSON.parse(raw);
      return;
    }
  } catch (e) {
    console.warn('participations load error', e);
  }
  participations = {};
  persistParticipations();
};

const persistParticipations = () => {
  try {
    localStorage.setItem('participations', JSON.stringify(participations));
  } catch (e) {
    console.warn('participations save error', e);
  }
};

loadParticipations();

// スタメン確定時に出場記録を初期化・記録
export const recordStarters = (
  matchId: string, 
  lineup: { home: { playerId: string; position: string }[]; away: { playerId: string; position: string }[] }
): void => {
  participations[matchId] = participations[matchId] || { home: [], away: [] };
  
  // 配列のインデックスを使って打順(1番~)を記録する
  const nowHome = lineup.home.filter(e => e.playerId);
  const nowAway = lineup.away.filter(e => e.playerId);

  participations[matchId].home = nowHome.map((e, index) => ({
    playerId: e.playerId,
    side: 'home',
    battingOrder: index + 1, // ★打順付与
    status: 'starter',
    startInning: 1,
    endInning: null,
    positionAtStart: e.position || null,
  }));

  participations[matchId].away = nowAway.map((e, index) => ({
    playerId: e.playerId,
    side: 'away',
    battingOrder: index + 1, // ★打順付与
    status: 'starter',
    startInning: 1,
    endInning: null,
    positionAtStart: e.position || null,
  }));

  persistParticipations();
};

// 交代記録（代打・代走）
export const recordSubstitution = (params: {
  matchId: string;
  side: 'home' | 'away';
  outPlayerId: string;
  inPlayerId: string;
  inning: number;
  kind: 'pinch_hitter' | 'pinch_runner';
  position?: string;
  note?: string;
}): void => {
  const table = participations[params.matchId] || (participations[params.matchId] = { home: [], away: [] });
  const list = table[params.side];
  
  // 交代対象の選手を探す（まだ試合に出ている選手＝endInningがnull）
  const outEntry = list.find(p => p.playerId === params.outPlayerId && p.endInning == null);
  
  // ★打順の引き継ぎ（見つからない場合はエラーだが、一旦0にしておく）
  const inheritedOrder = outEntry ? outEntry.battingOrder : 0;

  if (outEntry) {
    outEntry.endInning = params.inning;
    outEntry.status = 'substituted';
    outEntry.positionAtEnd = outEntry.positionAtEnd ?? params.position ?? null;
  } else if (params.outPlayerId) {
    // データ整合性エラー時の保険
    list.push({
      playerId: params.outPlayerId,
      side: params.side,
      battingOrder: inheritedOrder,
      status: 'substituted',
      startInning: null,
      endInning: params.inning,
      positionAtEnd: params.position ?? null,
      note: params.note,
    });
  }

  // 新しい選手の追加
  list.push({
    playerId: params.inPlayerId,
    side: params.side,
    battingOrder: inheritedOrder, // ★打順を引き継ぐ
    status: params.kind,
    startInning: params.inning,
    endInning: null,
    positionAtStart: params.position ?? null,
    note: params.note,
  });

  persistParticipations();
};

// 試合終了時に、endInningが未設定の選手へ最終回を付与
export const closeParticipationOnGameEnd = (matchId: string, finalInning: number): void => {
  const table = participations[matchId];
  if (!table) return;
  (['home', 'away'] as const).forEach(side => {
    table[side].forEach(p => {
      if (p.endInning == null) {
        p.endInning = finalInning;
        if (p.status === 'starter' || p.status === 'pinch_hitter' || p.status === 'pinch_runner') {
          p.status = 'finished';
        }
      }
    });
  });
  persistParticipations();
};

export const getParticipations = (matchId: string): ParticipationTable => {
  if (!participations[matchId]) {
    participations[matchId] = { home: [], away: [] };
    persistParticipations();
  }
  return participations[matchId];
};

/**
 * ★便利関数: 現在出場中のラインナップを取得する（UI表示用）
 * - 打順順にソートして返す
 */
export const getCurrentLineup = (matchId: string, side: 'home' | 'away'): ParticipationEntry[] => {
  const table = getParticipations(matchId);
  return table[side]
    .filter(p => p.endInning === null) // まだ終わっていない選手
    .sort((a, b) => a.battingOrder - b.battingOrder); // 打順順
};

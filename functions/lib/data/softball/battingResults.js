"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BATTING_RESULTS = void 0;
exports.BATTING_RESULTS = {
    single: {
        code: 'single',
        name: 'ヒット（シングル）',
        stats: { isAB: true, isHit: true, isOnBase: true, isSacrifice: false, isFourBall: false, isOut: false }
    },
    double: {
        code: 'double',
        name: 'ツーベースヒット',
        stats: { isAB: true, isHit: true, isOnBase: true, isSacrifice: false, isFourBall: false, isOut: false }
    },
    triple: {
        code: 'triple',
        name: 'スリーベースヒット',
        stats: { isAB: true, isHit: true, isOnBase: true, isSacrifice: false, isFourBall: false, isOut: false }
    },
    homerun: {
        code: 'homerun',
        name: 'ホームラン',
        stats: { isAB: true, isHit: true, isOnBase: true, isSacrifice: false, isFourBall: false, isOut: false }
    },
    runninghomerun: {
        code: 'runninghomerun',
        name: 'ランニングホームラン',
        stats: { isAB: true, isHit: true, isOnBase: true, isSacrifice: false, isFourBall: false, isOut: false }
    },
    groundout: {
        code: 'groundout',
        name: 'ゴロアウト',
        stats: { isAB: true, isHit: false, isOnBase: false, isSacrifice: false, isFourBall: false, isOut: true }
    },
    flyout: {
        code: 'flyout',
        name: 'フライアウト',
        stats: { isAB: true, isHit: false, isOnBase: false, isSacrifice: false, isFourBall: false, isOut: true }
    },
    bunt_out: {
        code: 'bunt_out',
        name: 'バント失敗',
        stats: { isAB: true, isHit: false, isOnBase: false, isSacrifice: false, isFourBall: false, isOut: true }
    },
    strikeout_swinging: {
        code: 'strikeout_swinging',
        name: '空振り三振',
        stats: { isAB: true, isHit: false, isOnBase: false, isSacrifice: false, isFourBall: false, isOut: true }
    },
    strikeout_looking: {
        code: 'strikeout_looking',
        name: '見逃し三振',
        stats: { isAB: true, isHit: false, isOnBase: false, isSacrifice: false, isFourBall: false, isOut: true }
    },
    droppedthird: {
        code: 'droppedthird',
        name: '振り逃げ',
        // 記録上は三振（打数1、安打0）。出塁できたかどうかは別のフラグで管理するが、打撃結果としては「三振」扱い。
        // ※出塁した場合は「三振＋エラーor暴投」等の扱いになるが、基本はアウト属性を持つ
        stats: { isAB: true, isHit: false, isOnBase: false, isSacrifice: false, isFourBall: false, isOut: true }
    },
    walk: {
        code: 'walk',
        name: 'フォアボール',
        stats: { isAB: false, isHit: false, isOnBase: true, isSacrifice: false, isFourBall: true, isOut: false }
    },
    deadball: {
        code: 'deadball',
        name: 'デッドボール',
        stats: { isAB: false, isHit: false, isOnBase: true, isSacrifice: false, isFourBall: true, isOut: false }
    },
    sac_bunt: {
        code: 'sac_bunt',
        name: '犠打（バント）',
        stats: { isAB: false, isHit: false, isOnBase: false, isSacrifice: true, isFourBall: false, isOut: true }
    },
    sacrifice_bunt: {
        code: 'sacrifice_bunt',
        name: '犠打（バント）',
        stats: { isAB: false, isHit: false, isOnBase: false, isSacrifice: true, isFourBall: false, isOut: true }
    },
    sac_fly: {
        code: 'sac_fly',
        name: '犠飛',
        stats: { isAB: false, isHit: false, isOnBase: false, isSacrifice: true, isFourBall: false, isOut: true }
    },
    sacrifice_fly: {
        code: 'sacrifice_fly',
        name: '犠飛',
        stats: { isAB: false, isHit: false, isOnBase: false, isSacrifice: true, isFourBall: false, isOut: true }
    },
    interference: {
        code: 'interference',
        name: '打撃妨害',
        stats: { isAB: false, isHit: false, isOnBase: true, isSacrifice: false, isFourBall: false, isOut: false }
    },
    error: {
        code: 'error',
        name: 'エラー',
        // エラー出塁は打数に数える（凡打扱い）。出塁率は上がらない。
        stats: { isAB: true, isHit: false, isOnBase: false, isSacrifice: false, isFourBall: false, isOut: false }
    }
};
//# sourceMappingURL=battingResults.js.map
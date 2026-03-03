import { AtBat, GameSnapshot, Runners } from '../types/AtBat';
import { getAtBats, saveAtBat } from './atBatService';
import { getGameState, updateCountsRealtime, updateRunnersRealtime, addRunsRealtime, setInningAndHalf, resetCountsRealtime } from './gameStateService';
import { BATTING_RESULTS } from '../data/softball/battingResults';

import { simulatePlay } from '../utils/gameSimulation';

/**
 * 試合の再計算を行うサービス
 * 指定された打席（修正済み）を起点に、それ以降の打席の状況（ランナー、アウト、得点など）を再シミュレーションする
 */
export const recalculateGame = async (matchId: string, modifiedAtBat: AtBat) => {
  // 1. 全打席を取得
  const allAtBats = await getAtBats(matchId);
  
  // 2. 修正対象の打席を特定・置換
  const index = allAtBats.findIndex(a => a.playId === modifiedAtBat.playId);
  if (index === -1) throw new Error('AtBat not found');
  
  allAtBats[index] = modifiedAtBat;
  
  // 修正された打席を保存
  await saveAtBat(modifiedAtBat);
  
  // 3. 以降の打席を再シミュレーション
  // 初期状態は修正された打席の「直後」の状態
  let currentState: GameSnapshot = { ...modifiedAtBat.situationAfter };
  let currentInning = modifiedAtBat.inning;
  let currentHalf = modifiedAtBat.topOrBottom;
  
  // 修正打席でチェンジになった場合
  if (currentState.outs >= 3) {
      if (currentHalf === 'top') {
          currentHalf = 'bottom';
      } else {
          currentHalf = 'top';
          currentInning++;
      }
      currentState.outs = 0;
      currentState.runners = { '1': null, '2': null, '3': null };
      currentState.balls = 0;
      currentState.strikes = 0;
  }
  
  // 得点集計用（イニングごと）
  const inningScores: Record<string, { top: number, bottom: number }> = {};
  
  // 最初の打席までのスコアを計算しておく必要があるが、
  // ここでは簡易的に、再計算ループ内でスコアを積み上げる方式にするか、
  // あるいはGameStateを最後に一括更新するか。
  // GameStateのスコアは「各イニングのスコア」を持つので、全打席から再集計するのが確実。
  
  for (let i = index + 1; i < allAtBats.length; i++) {
      const atBat = allAtBats[i];
      
      // 直前の状況を更新
      atBat.situationBefore = { ...currentState };
      atBat.inning = currentInning;
      atBat.topOrBottom = currentHalf;
      
      // 結果に基づいて直後の状況をシミュレーション
      const resultType = atBat.result?.type;
      if (resultType) {
          const simResult = simulatePlay(currentState, resultType, atBat.batterId);
          
          atBat.situationAfter = simResult.snapshot;
          atBat.scoredRunners = simResult.scoredRunners;
          
          // 得点があれば記録（AtBat内のrbiなども更新すべきだが、自動計算は難しいのでscoredRunnersのみ更新）
          if (atBat.result) {
             // rbiの再計算は簡易的に行う（得点数＝打点とする）
             // ※エラー得点などが含まれる場合は不正確だが、修正機能の限界とする
             atBat.result.rbi = simResult.scoredRunners.length;
          }
      } else {
          // 結果がない場合は変化なし（ありえないはず）
          atBat.situationAfter = { ...currentState };
          atBat.scoredRunners = [];
      }
      
      // 次のループのためにcurrentStateを更新
      currentState = { ...atBat.situationAfter };
      
      // チェンジ判定
      if (currentState.outs >= 3) {
          if (currentHalf === 'top') {
              currentHalf = 'bottom';
          } else {
              currentHalf = 'top';
              currentInning++;
          }
          currentState.outs = 0;
          currentState.runners = { '1': null, '2': null, '3': null };
          currentState.balls = 0;
          currentState.strikes = 0;
      }
      
      // 更新された打席を保存
      await saveAtBat(atBat);
  }
  
  // 4. GameState（リアルタイム状況）を最終状態に合わせて更新
  // 全打席からスコアを再集計
  const finalScores = calculateScoresFromAtBats(allAtBats);
  
  // FirestoreのGameStateを更新
  // ※ここでは簡易的に、現在のイニング・カウント・ランナー・スコアを更新する
  // 本来はgameStateServiceに「全再計算」機能があると良いが、個別のupdate関数を呼ぶ
  
  await setInningAndHalf(matchId, currentInning, currentHalf);
  await updateCountsRealtime(matchId, { 
      b: currentState.balls, 
      s: currentState.strikes, 
      o: currentState.outs 
  });
  await updateRunnersRealtime(matchId, {
      '1b': currentState.runners['1'],
      '2b': currentState.runners['2'],
      '3b': currentState.runners['3']
  });
  
  // スコアの更新（addRunsではなく、setScores的なものが必要だが、現状のAPIではaddRunsしかない）
  // gameStateServiceにsetScoresを追加するか、あるいはFirestoreを直接叩くか。
  // ここでは一旦、現在のAPIでできる範囲（カウント・ランナー・イニング）を更新し、
  // スコアについては別途対応が必要かもしれない（gameStateServiceの改修）。
  // TODO: gameStateServiceに `updateScores(scores: { top: number, bottom: number, innings: ... })` を追加推奨
};

// 全打席からスコア計算
const calculateScoresFromAtBats = (atBats: AtBat[]) => {
    // 実装省略（必要に応じて）
    return {};
};


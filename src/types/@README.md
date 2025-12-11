# 型定義ドキュメント

このディレクトリには、ソフトボール成績集計システムで使用されるすべてのデータ型定義が含まれています。

## 目次

- [Game.ts](#gamets) - 試合情報
- [AtBat.ts](#atbatts) - 打席情報
- [Team.ts](#teamts) - チーム情報
- [Player.ts](#playerts) - 選手情報
- [Tournament.ts](#tournamentts) - 大会情報
- [Lineup.ts](#lineupts) - ラインナップ情報
- [Participation.ts](#participationts) - 出場情報
- [GameState.ts](#gamestatets) - ゲーム状態
- [PitchData.ts](#pitchdatats) - 投球データ
- [PitchType.ts](#pitchtypets) - 投球種

---

## Game.ts

試合情報を管理する型定義です。静的な試合情報と、UI表示用の統合ビューを提供します。

### GameStatus

試合の状態を表す型です。

```typescript
type GameStatus = 'SCHEDULED' | 'PLAYING' | 'FINISHED';
```

- `SCHEDULED`: 予定済み（試合開始前）
- `PLAYING`: 進行中
- `FINISHED`: 終了

### TopOrBottom

表/裏のイニングを区別する型です。

```typescript
type TopOrBottom = 'top' | 'bottom';
```

- `top`: 表（先攻チームの攻撃）
- `bottom`: 裏（後攻チームの攻撃）

### Game

静的な試合情報を表すインターフェースです。動的な情報（スコア、イニング状況など）は含まれません。

**主要フィールド:**
- `gameId`: 試合の一意なID
- `date`: 試合日（文字列形式）
- `status`: 試合の状態（`GameStatus`）
- `tournament`: 大会情報（`id`と`name`）
- `topTeam`: 先攻チーム情報（`id`、`name`、`shortName`）
- `bottomTeam`: 後攻チーム情報（`id`、`name`、`shortName`）

### GameView

UI表示用の統合ビューです。`Game`の静的情報に加えて、リアルタイムのゲーム状態（`realtime`）を含みます。

**主要フィールド:**
- `Game`のすべてのフィールド
- `realtime`: リアルタイムゲーム状態
  - `status`: リアルタイム状態（`GameRealtimeStatus`）
  - `currentInning`: 現在のイニング
  - `topOrBottom`: 表/裏
  - `balls`: ボールカウント
  - `strikes`: ストライクカウント
  - `outs`: アウトカウント
  - `runners`: ランナー状況（1塁、2塁、3塁にいる選手ID）
  - `score`: スコア（先攻・後攻）
  - `inningScores`: イニングごとのスコア
  - `matchup`: 現在の対戦（投手ID、打者ID）
  - `lastUpdated`: 最終更新日時

### GameCreateInput

試合登録時の入力データを表す型です。

**主要フィールド:**
- `gameId`: 試合ID
- `date`: 試合日
- `tournamentId`: 大会ID
- `tournamentName`: 大会名
- `topTeamId`, `topTeamName`, `topTeamShortName`: 先攻チーム情報
- `bottomTeamId`, `bottomTeamName`, `bottomTeamShortName`: 後攻チーム情報

---

## AtBat.ts

打席情報とその関連データを管理する型定義です。打席の結果、投球記録、ランナーイベントなどを含みます。

### HalfInning

表/裏のイニングを表す型です。

```typescript
type HalfInning = 'top' | 'bottom';
```

### Runners

ランナー状況を表すインターフェースです。各塁にいる選手のIDを保持します。

```typescript
interface Runners {
  '1': string | null;  // 1塁ランナー
  '2': string | null;  // 2塁ランナー
  '3': string | null;  // 3塁ランナー
}
```

### AtBatType

打席の種類を表す型です。

```typescript
type AtBatType = 'bat' | 'steal' | 'substitution' | 'other';
```

- `bat`: 通常の打席
- `steal`: 盗塁
- `substitution`: 交代
- `other`: その他

### BatterResultType

打者の結果を表す型です。様々な打撃結果を網羅しています。

```typescript
type BatterResultType =
  | 'single'              // シングルヒット
  | 'double'              // ツーベースヒット
  | 'triple'              // スリーベースヒット
  | 'homerun'             // ホームラン
  | 'runninghomerun'      // ランニングホームラン
  | 'groundout'           // ゴロアウト
  | 'flyout'              // フライアウト
  | 'bunt_out'            // バントアウト
  | 'strikeout_swinging'  // スイング三振
  | 'strikeout_looking'   // 見逃し三振
  | 'droppedthird'        // 振り逃げ
  | 'walk'                // 四球
  | 'deadball'            // デッドボール
  | 'sac_bunt'            // 犠牲バント
  | 'sacrifice_bunt'      // 犠牲バント（別表記）
  | 'sac_fly'             // 犠牲フライ
  | 'sacrifice_fly'       // 犠牲フライ（別表記）
  | 'interference'        // 妨害
  | 'error';              // エラー
```

### AtBatResult

打席結果を表すインターフェースです。

**主要フィールド:**
- `type`: 打者結果の種類（`BatterResultType`）
- `fieldedBy`: 守備位置（1-9のポジション番号、オプショナル）
- `rbi`: 打点（オプショナル）

### GameSnapshot

ゲーム状況のスナップショットを表すインターフェースです。特定の時点でのゲーム状態を記録します。

**主要フィールド:**
- `outs`: アウトカウント
- `runners`: ランナー状況（`Runners`）
- `balls`: ボールカウント
- `strikes`: ストライクカウント

### PitchResult

投球結果を表す型です。

```typescript
type PitchResult = 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul';
```

- `swing`: スイング
- `looking`: 見逃し
- `ball`: ボール
- `inplay`: インプレー
- `deadball`: デッドボール
- `foul`: ファウル

### PitchRecord

個々の投球記録を表すインターフェースです。

**主要フィールド:**
- `seq`: 投球の順序（シーケンス番号）
- `type`: 投球種（`PitchType`）
- `course`: コース（1-25のグリッド番号、StrikeZoneGridに対応）
- `x`, `y`: 投球位置の座標（0-100%、左上が0,0、オプショナル）
- `result`: 投球結果（`PitchResult`）
- `velocity`: 球速（オプショナル）
- `countBefore`: その投球直前のカウント（`{ B: number; S: number }`、オプショナル）

### RunnerEventType

ランナーイベントの種類を表す型です。

```typescript
type RunnerEventType =
  | 'passedball'      // パスボール
  | 'wildpitch'       // ワイルドピッチ
  | 'steal'           // 盗塁
  | 'caughtstealing'  // 盗塁死
  | 'pickoff'         // 牽制アウト
  | 'runout'          // ランダウント
  | 'leftbase'        // 離塁
  | 'balk'            // ボーク
  | 'advance'         // 進塁
  | 'scored'          // 得点
  | 'illegalpitch'    // 不正投球
  | 'out';            // アウト
```

### BaseType

塁を表す型です。

```typescript
type BaseType = '1' | '2' | '3' | 'home';
```

### RunnerEvent

ランナーイベントを表すインターフェースです。

**主要フィールド:**
- `id`: イベントの一意なID
- `pitchSeq`: 関連する投球のシーケンス番号（投球が無い場合は`null`）
- `eventSource`: イベントの発生源（`'pitch'`または`'non_pitch'`）
- `type`: イベントの種類（`RunnerEventType`）
- `runnerId`: ランナーの選手ID
- `fromBase`: 出発塁（`BaseType`）
- `toBase`: 到達塁（`BaseType`）
- `isOut`: アウトになったかどうか（オプショナル）
- `outDetail`: アウトの詳細（オプショナル）
  - `base`: アウトになった塁
  - `threwPosition`: 送球したポジション
  - `caughtPosition`: 捕球したポジション

### BatType

打球の種類を表す型です。

```typescript
type BatType = 'ground' | 'fly' | 'liner' | 'bunt' | 'walk';
```

- `ground`: ゴロ
- `fly`: フライ
- `liner`: ライナー
- `bunt`: バント
- `walk`: 四球

### BatDirection

打球方向を表す型です。

```typescript
type BatDirection = 'left' | 'center' | 'right' | 'infield' | string;
```

基本的な方向（左、中、右、内野）の他、将来的にポジション番号も指定可能なように文字列型も許容しています。

### FieldingAction

守備行動を表すインターフェースです。

**主要フィールド:**
- `playerId`: 選手ID（不明な場合はオプショナル）
- `position`: 守備位置（文字列）
- `action`: 行動の種類
  - `'fielded'`: 処理
  - `'assist'`: 捕殺
  - `'putout'`: 刺殺
  - `'error'`: エラー
- `quality`: 処理の質
  - `'clean'`: クリーン
  - `'bobbled'`: ボールを落とした
  - `'missed'`: ミス

### PlayDetails

プレーの詳細情報を表すインターフェースです。

**主要フィールド:**
- `batType`: 打球の種類（`BatType`、オプショナル）
- `direction`: 打球方向（`BatDirection`、オプショナル）
- `fielding`: 守備行動の配列（`FieldingAction[]`、オプショナル）

### AtBat

打席情報を表す主要なインターフェースです。打席に関するすべての情報を含みます。

**主要フィールド:**
- `playId`: プレーID（一意なID）
- `matchId`: 試合ID
- `index`: 打席のインデックス（試合内での順序）
- `inning`: イニング
- `topOrBottom`: 表/裏（`HalfInning`）
- `type`: 打席の種類（`AtBatType`）
- `batterId`: 打者の選手ID
- `pitcherId`: 投手の選手ID
- `battingOrder`: 打順
- `result`: 打席結果（`AtBatResult`、オプショナル）
- `situationBefore`: 打席前のゲーム状況（`GameSnapshot`）
- `situationAtPitchResult`: 投球結果時点のゲーム状況（`GameSnapshot`、オプショナル）
- `situationAfter`: 打席後のゲーム状況（`GameSnapshot`）
- `scoredRunners`: 得点した選手のID配列
- `pitches`: 投球記録の配列（`PitchRecord[]`）
- `runnerEvents`: ランナーイベントの配列（`RunnerEvent[]`）
- `playDetails`: プレー詳細（`PlayDetails`、オプショナル）
- `timestamp`: タイムスタンプ
- `note`: 備考（オプショナル）

---

## Team.ts

チーム情報を管理する型定義です。

### Team

チーム情報を表すインターフェースです。

**主要フィールド:**
- `id`: チームID（数値）
- `teamName`: チーム名
- `teamAbbr`: チーム略称
- `prefecture`: 都道府県
- `affiliation`: 所属（学校名など）
- `createdAt`: 作成日時（オプショナル）

### TeamData

チーム登録用のデータ型です。`Team`から`id`と`createdAt`を除いたものです。

**主要フィールド:**
- `teamName`: チーム名
- `teamAbbr`: チーム略称
- `prefecture`: 都道府県
- `affiliation`: 所属

### TeamSearchParams

チーム検索時のパラメータを表すインターフェースです。

**主要フィールド:**
- `name`: チーム名（部分一致検索、オプショナル）
- `prefecture`: 都道府県（オプショナル）
- `affiliation`: 所属（オプショナル）

---

## Player.ts

選手情報を管理する型定義です。

### Player

選手情報を表すインターフェースです。

**主要フィールド:**
- `playerId`: 選手ID（文字列）
- `teamId`: チームID（文字列または数値）
- `familyName`: 姓
- `givenName`: 名
- `throwing`: 投球（右投げ/左投げ）
- `batting`: 打撃（右打ち/左打ち/両打ち）
- `entryYear`: 入学年度（文字列または`null`）
- `createdAt`: 作成日時

### PlayerData

選手登録用のデータ型です。`Player`から`playerId`と`createdAt`を除いたものです。

**主要フィールド:**
- `teamId`: チームID
- `familyName`: 姓
- `givenName`: 名
- `throwing`: 投球
- `batting`: 打撃
- `entryYear`: 入学年度（オプショナル）

---

## Tournament.ts

大会情報を管理する型定義です。

### Tournament

大会情報を表すインターフェースです。

**主要フィールド:**
- `id`: 大会ID（文字列）
- `year`: 年度（文字列）
- `name`: 大会名
- `type`: 大会の種類（`'トーナメント'`、`'リーグ'`、またはその他の文字列）
- `createdAt`: 作成日時（オプショナル）

### TournamentSearchParams

大会検索時のパラメータを表すインターフェースです。

**主要フィールド:**
- `year`: 年度（オプショナル）
- `name`: 大会名（部分一致検索、オプショナル）

### TournamentRegisterData

大会登録用のデータ型です。

**主要フィールド:**
- `year`: 年度
- `name`: 大会名
- `type`: 大会の種類（`Tournament['type']`）

---

## Lineup.ts

ラインナップ情報を管理する型定義です。

### LineupEntry

ラインナップの1エントリを表すインターフェースです。打順、ポジション、選手を紐付けます。

**主要フィールド:**
- `battingOrder`: 打順（1-9）
- `position`: 守備位置（1-9、DP、PH、PRなど）
  - `1-9`: 通常の守備位置（1: ピッチャー、2: キャッチャー、3: ファースト、4: セカンド、5: サード、6: ショート、7: レフト、8: センター、9: ライト）
  - `DP`: 指名打者（Designated Player）
  - `PH`: 代打（Pinch Hitter）
  - `PR`: 代走（Pinch Runner）
- `playerId`: 選手ID

### Lineup

ラインナップ全体を表すインターフェースです。先攻と後攻の両方のラインナップを含みます。

**主要フィールド:**
- `matchId`: 試合ID
- `home`: 先攻チームのラインナップ（`LineupEntry[]`）
- `away`: 後攻チームのラインナップ（`LineupEntry[]`）

---

## Participation.ts

選手の出場情報を管理する型定義です。試合における選手の出場状況を記録します。

### ParticipationStatus

出場ステータスを表す型です。

```typescript
type ParticipationStatus =
  | 'starter'          // スターティングメンバー
  | 'pinch_hitter'     // 代打
  | 'pinch_runner'     // 代走
  | 'substituted'      // 交代
  | 'finished'         // 出場終了
  | 'position_change'; // ポジション変更
```

### ParticipationEntry

選手の出場エントリを表す型です。

**主要フィールド:**
- `playerId`: 選手ID
- `side`: チーム側（`'home'`または`'away'`）
- `battingOrder`: 打順（1-9）
- `status`: 出場ステータス（`ParticipationStatus`）
- `startInning`: 開始イニング（`number`または`null`）
- `endInning`: 終了イニング（`number`または`null`）
- `positionAtStart`: 開始時のポジション（オプショナル）
- `note`: 備考（オプショナル）

### ParticipationTable

出場テーブルを表す型です。先攻と後攻の両方の出場情報を含みます。

**主要フィールド:**
- `home`: 先攻チームの出場エントリ配列（`ParticipationEntry[]`）
- `away`: 後攻チームの出場エントリ配列（`ParticipationEntry[]`）

---

## GameState.ts

ゲームのリアルタイム状態を管理する型定義です。試合進行中の動的な情報を保持します。

### GameRealtimeStatus

ゲームのリアルタイム状態を表す型です。

```typescript
type GameRealtimeStatus = 'in_progress' | 'finished' | 'scheduled';
```

- `in_progress`: 進行中
- `finished`: 終了
- `scheduled`: 予定済み

### GameState

ゲーム状態を表すインターフェースです。試合進行中のすべての動的情報を含みます。

**主要フィールド:**
- `game_id`: 試合ID
- `status`: リアルタイム状態（`GameRealtimeStatus`）
- `current_inning`: 現在のイニング
- `top_bottom`: 表/裏（`'top'`または`'bottom'`）
- `counts`: カウント情報
  - `b`: ボールカウント
  - `s`: ストライクカウント
  - `o`: アウトカウント
- `runners`: ランナー状況
  - `1b`: 1塁ランナーの選手ID（`string`または`null`）
  - `2b`: 2塁ランナーの選手ID（`string`または`null`）
  - `3b`: 3塁ランナーの選手ID（`string`または`null`）
- `matchup`: 現在の対戦
  - `pitcher_id`: 投手の選手ID（`string`または`null`）
  - `batter_id`: 打者の選手ID（`string`または`null`）
- `scores`: スコア情報
  - `top_total`: 先攻チームの総得点
  - `bottom_total`: 後攻チームの総得点
  - `innings`: イニングごとのスコア（`Record<string, { top: number | null; bottom: number | null; leftOnBase?: { top: number; bottom: number } }>`）
- `home_bat_index`: 先攻チームの現在の打順インデックス（オプショナル）
- `away_bat_index`: 後攻チームの現在の打順インデックス（オプショナル）
- `last_updated`: 最終更新日時

---

## PitchData.ts

投球データを管理する型定義です。UIでの投球入力に使用されます。

### PitchData

投球データを表すインターフェースです。

**主要フィールド:**
- `id`: 投球データのID（数値）
- `x`: X座標（0-100%）
- `y`: Y座標（0-100%）
- `type`: 投球種（`PitchType`）
- `order`: 投球の順序
- `result`: 投球結果（`'swing'`、`'looking'`、`'ball'`、`'inplay'`、`'deadball'`、`'foul'`）

**注意:** この型は主にUIでの入力に使用され、実際のデータベースに保存される際は`AtBat`の`PitchRecord`として保存されます。

---

## PitchType.ts

投球種を管理する型定義です。

### PitchType

投球種を表す型です。

```typescript
type PitchType =
  | 'rise'      // ライズボール
  | 'drop'      // ドロップボール
  | 'cut'       // カットボール
  | 'changeup'  // チェンジアップ
  | 'chenrai'   // チェンライ
  | 'slider'    // スライダー
  | 'unknown';  // 不明
```

ソフトボールで使用される主要な投球種を網羅しています。

---

## 型間の関係性

### 階層構造

```
Tournament
  └─ Game (試合)
      ├─ Lineup (ラインナップ)
      ├─ GameState (ゲーム状態)
      └─ AtBat[] (打席の配列)
          ├─ PitchRecord[] (投球記録)
          ├─ RunnerEvent[] (ランナーイベント)
          └─ PlayDetails (プレー詳細)
              └─ FieldingAction[] (守備行動)
```

### 主要な関係

1. **Game ↔ AtBat**: 1つの試合（`Game`）に複数の打席（`AtBat`）が紐付きます
2. **AtBat ↔ PitchRecord**: 1つの打席に複数の投球記録が紐付きます
3. **AtBat ↔ RunnerEvent**: 1つの打席に複数のランナーイベントが紐付きます
4. **Game ↔ Lineup**: 1つの試合に1つのラインナップが紐付きます
5. **Game ↔ GameState**: 1つの試合に1つのゲーム状態が紐付きます（リアルタイム更新）
6. **Team ↔ Player**: 1つのチームに複数の選手が紐付きます
7. **Tournament ↔ Game**: 1つの大会に複数の試合が紐付きます

### データフロー

1. **試合登録**: `GameCreateInput` → `Game`
2. **ラインナップ登録**: `LineupEntry[]` → `Lineup`
3. **打席記録**: `PitchData[]` → `PitchRecord[]` → `AtBat`
4. **ゲーム状態更新**: `GameState`がリアルタイムで更新される

---

## 使用上の注意

### 型の選択

- **静的データ**: `Game`、`Team`、`Player`、`Tournament`など
- **動的データ**: `GameState`、`AtBat`など
- **UI表示用**: `GameView`（静的＋動的の統合）
- **入力用**: `GameCreateInput`、`TeamData`、`PlayerData`など

### 命名規則

- インターフェース: PascalCase（例: `Game`、`AtBat`）
- 型エイリアス: PascalCase（例: `GameStatus`、`PitchType`）
- フィールド: camelCase（例: `gameId`、`batterId`）

### オプショナルフィールド

多くの型でオプショナルフィールド（`?`）が使用されています。これは、データ入力の段階によって情報が不完全な場合があるためです。例えば、`AtBat`の`result`は打席が完了するまで存在しません。

---

## 関連ファイル

- `src/services/gameService.ts`: `Game`のCRUD操作
- `src/services/atBatService.ts`: `AtBat`のCRUD操作
- `src/services/gameStateService.ts`: `GameState`の更新
- `src/hooks/useAtBats.ts`: `AtBat`データの取得フック
- `src/hooks/usePitcherStatsData.ts`: 投手成績の集計


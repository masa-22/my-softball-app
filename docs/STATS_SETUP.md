# 打撃成績詳細機能のセットアップ

「成績データがありません」と表示される場合、以下の手順を確認してください。

## 1. Cloud Functions のデプロイ / 起動

### 本番 Firebase を使う場合

```bash
cd functions
npm run build
firebase deploy --only functions
```

### エミュレータで開発する場合

```bash
# ターミナル1: エミュレータ起動（Functions を含む）
firebase emulators:start --only firestore,functions

# ターミナル2: アプリ起動
npm run dev
```

- アプリは開発モードで自動的に Functions エミュレータ（localhost:5001）に接続します。
- `firebase.json` に `emulators.functions` を追加済みです。

## 2. データソースの確認

成績は次のコレクションを参照します：

| 通算成績（全期間） | `dev_playerSeasonStats` |
| 試合履歴・期間限定 | `dev_playerGameStats` |

- **dev_playerSeasonStats**: `onPlayerGameStatsWriteDryRun` トリガーが `dev_playerGameStats` の更新時に集計して保存
- **dev_playerGameStats**: `onAtBatWriteDryRun` トリガーが `atBats` の更新時に保存
- **games**: 試合履歴の日付・対戦相手取得に使用

### Firestore に以下があるか確認

1. `dev_playerSeasonStats/{playerId}` … 通算成績（`batting` に計算済み値）
2. `dev_playerGameStats` … `playerId` で取得できるドキュメントがあること
3. `games/{gameId}` … `dev_playerGameStats` の `matchId` と一致するドキュメントがあること

## 3. エラー時の確認

- ブラウザの開発者ツール（F12）→ Console でエラー内容を確認
- 「読み込みエラー」が表示された場合、Functions の起動・デプロイ状況を確認

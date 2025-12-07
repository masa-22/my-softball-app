# 成績集計システム
## 開発理念・背景

### 開発理念

- **誰でも操作・活用・維持可能な成績集計システムを作る**

### 背景

- 成績データを活用したいが、**集計や分析方法を理解している人が限られている**
- 成績が**年度ごとに分断され、引継ぎがうまく行われていない**
- **理系大学でありながら、データ活用の力を活かしきれていない**
---

## 実現したいこと

### 成績集計用データベースの設計・作成・運用

- 今後も**維持・拡張できるデータベース**を目指す

### データベースへのデータ挿入Webアプリケーション開発

- **誰でも分かる直感的な操作**でデータベースへの入力を可能にする
- **打者とストライクゾーンの表示画面**を操作してデータを入力する形式
- **動画再生＋入力操作を同一タブ内で完結**させるインターフェースを実装予定

### データ活用Webアプリケーションの開発

- データベース内のデータから**自動で成績を算出・取得**する機能を実現
- 将来的には**AI問い合わせ型**で成績分析・検索ができるようにする
---
# 実現環境について
## 開発環境
- 当初はレンタルサーバー上での開発予定であったが、ログインの融通性や今後の拡張性から**Firebase**での開発に切り替えた
- **Firebase**はnoSQL形式でデータを管理するため、そこが難しい
## 使っている技術？
- フロントエンドは**React**を用いて開発を行う
---
## 完成予定

- **2026年シーズン開始時**から本格活用を目指す
- 理想は **2026年2月初旬完成**
- **2025年内に入力部は完成させる！！**

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

# Firebase デプロイ手順

## 前提条件

- Firebase CLIがインストールされていること
- Firebaseプロジェクトが作成済みであること
- 本プロジェクトのFirebaseプロジェクトID: `tus-softball-datasystem`

## ローカル開発環境のセットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Firebaseエミュレータの起動

別のターミナルで以下を実行：

```bash
npm run dev:emulator
```

エミュレータが起動すると、以下のURLでアクセスできます：
- Firestoreエミュレータ: `http://localhost:8080`
- Firebase Emulator UI: `http://localhost:4000`

### 3. アプリケーションの起動

エミュレータが起動した状態で、別のターミナルで以下を実行：

```bash
npm run dev:app
```

または

```bash
npm run dev
```

アプリケーションは `http://localhost:5173` で起動します。

**注意**: ローカル環境では自動的にFirebaseエミュレータに接続されます。本番環境では自動的に本番Firestoreに接続されます。

#### エミュレータを無効にして本番環境に接続する場合

Firebase Consoleで作成したユーザーでログインをテストする場合は、エミュレータを無効にする必要があります。

1. `.env` ファイルを作成（プロジェクトルートに）
2. 以下の内容を追加：
   ```
   VITE_USE_EMULATOR=false
   ```
3. アプリケーションを再起動

または、環境変数として設定：
```bash
# Windows (PowerShell)
$env:VITE_USE_EMULATOR="false"; npm run dev

# Windows (Command Prompt)
set VITE_USE_EMULATOR=false && npm run dev

# macOS/Linux
VITE_USE_EMULATOR=false npm run dev
```

**重要**: エミュレータを使用している場合、Firebase Consoleで作成した本番環境のユーザーではログインできません。エミュレータを使用する場合は、エミュレータ内でユーザーを作成するか、本番環境に接続するように環境変数を設定してください。

## 本番環境へのデプロイ

### 1. Firebase CLIにログイン

```bash
firebase login
```

### 2. Firebaseプロジェクトの確認

```bash
firebase projects:list
```

プロジェクトIDが `tus-softball-datasystem` であることを確認してください。

### 3. Firestoreセキュリティルールのデプロイ

```bash
firebase deploy --only firestore:rules
```

### 4. Realtime Databaseセキュリティルールのデプロイ

```bash
firebase deploy --only database
```

### 5. Firestoreインデックスのデプロイ（必要に応じて）

```bash
firebase deploy --only firestore:indexes
```

### 6. アプリケーションのビルド

```bash
npm run build
```

### 7. Hostingへのデプロイ

```bash
firebase deploy --only hosting
```

### 8. すべてを一度にデプロイ

```bash
firebase deploy
```

## Firebase Authentication で管理者を登録する手順

### 一人目の管理者を登録する手順（最初の管理者）

最初の管理者を登録する場合は、以下の手順に従ってください。

#### ステップ1: Firebase Consoleでユーザーを作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクト `tus-softball-datasystem` を選択
3. 左側のメニューから「Authentication」（認証）をクリック
4. 「Users」（ユーザー）タブを開く
5. 「Add user」（ユーザーを追加）ボタンをクリック
6. 以下の情報を入力：
   - **Email（メールアドレス）**: 管理者として使用するメールアドレスを入力
   - **Password（パスワード）**: 安全なパスワードを設定（最低6文字）
7. 「Add user」をクリックしてユーザーを作成

#### ステップ2: ユーザーUIDを確認

1. 作成したユーザーがユーザー一覧に表示されます
2. ユーザーをクリックして詳細を開く（または、ユーザーの行にマウスオーバーして「・・・」メニューから「View details」を選択）
3. **UID**（ユーザーID）をコピーしておく
   - UIDは長い文字列（例: `abc123def456ghi789...`）
   - 後で使用するため、メモ帳などに保存しておくと便利です

#### ステップ3: Firestore Consoleで承認レコードを作成

1. Firebase Consoleの左側のメニューから「Firestore Database」をクリック
2. 「Data」タブを開く（既に開いている場合はそのまま）
3. コレクション一覧から `userApprovals` コレクションを探す
   - もし存在しない場合は、手動で作成します：
     - 「Start collection」をクリック
     - コレクションIDに `userApprovals` と入力
     - 「Next」をクリック
4. `userApprovals` コレクションを開く
5. 「Add document」（ドキュメントを追加）をクリック
6. ドキュメントIDに、**ステップ2でコピーしたUID**を貼り付け
7. 「Add field」（フィールドを追加）をクリックして、以下のフィールドを順番に追加します：

   **フィールド1: `userId`**
   - フィールド名: `userId`
   - タイプ: `string`（文字列）を選択
   - 値: ユーザーのUID（ステップ2でコピーしたUID）を貼り付け

   **フィールド2: `email`**
   - フィールド名: `email`
   - タイプ: `string`（文字列）を選択
   - 値: ユーザーのメールアドレスを入力

   **フィールド3: `approved`**
   - フィールド名: `approved`
   - タイプ: `boolean`（ブール値）を選択
   - 値: `true`（チェックボックスをオンにする）

   **フィールド4: `createdAt`**
   - フィールド名: `createdAt`
   - タイプ: `timestamp`（タイムスタンプ）を選択
   - 値: 現在の日時を選択（「Use current timestamp」ボタンがある場合はクリック）

   **フィールド5: `approvedAt`**
   - フィールド名: `approvedAt`
   - タイプ: `timestamp`（タイムスタンプ）を選択
   - 値: 現在の日時を選択（`createdAt`と同じでOK）

   **フィールド6: `approvedBy`**
   - フィールド名: `approvedBy`
   - タイプ: `string`（文字列）を選択
   - 値: ユーザーのUID（自分自身のUID、ステップ2でコピーしたUIDと同じ）

   **フィールド7: `role`（役割）**
   - フィールド名: `role`
   - タイプ: `string`（文字列）を選択
   - 値: 役割を選択
     - `viewer`: 閲覧者（データの閲覧のみ可能）
     - `editor`: 編集者（データの閲覧・編集が可能）
     - `admin`: 管理者（すべての権限、ユーザー管理も可能）
   - 最初の管理者を作成する場合は `admin` を設定してください

8. すべてのフィールドを追加したら、「Save」（保存）をクリック

**補足**: 各フィールドを追加するたびに「Add field」をクリックする必要があります。

#### ステップ4: エミュレータを無効にして本番環境に接続（重要）

**重要**: ローカルエミュレータを使用している場合、Firebase Consoleで作成した本番環境のユーザーではログインできません。エミュレータを無効にして本番環境に接続する必要があります。

**方法1: `.env`ファイルを作成（推奨）**

1. プロジェクトルート（`package.json`があるディレクトリ）に `.env` ファイルを作成
2. 以下の内容を追加：
   ```
   VITE_USE_EMULATOR=false
   ```
3. アプリケーションを**完全に停止**してから再起動
   - 実行中のアプリケーションを停止（Ctrl+C）
   - 再度 `npm run dev` または `npm run dev:app` を実行

**方法2: 環境変数として設定**

アプリケーション起動時に環境変数を指定：
```bash
# Windows (PowerShell)
$env:VITE_USE_EMULATOR="false"; npm run dev

# Windows (Command Prompt)
set VITE_USE_EMULATOR=false && npm run dev

# macOS/Linux
VITE_USE_EMULATOR=false npm run dev
```

**確認方法**:
- ブラウザの開発者ツール（F12）のコンソールを開く
- 「🌐 Using production Firebase (emulator disabled)」というメッセージが表示されれば成功
- 「✅ Connected to Auth emulator」などのメッセージが表示されている場合は、まだエミュレータに接続されています

#### ステップ5: ログインを確認

1. アプリケーションにアクセス（通常は `http://localhost:5173`）
2. ログインページで、作成したメールアドレスとパスワードでログイン
3. 正常にログインし、ホームページが表示されることを確認
4. 保護されたページ（チーム管理、選手管理など）にアクセスできることを確認

**トラブルシューティング**:
- 「メールアドレスが登録されていない」と表示される場合：
  - ブラウザのコンソールを確認し、エミュレータに接続されていないか確認
  - `.env`ファイルが正しく作成されているか確認（ファイル名が`.env`であること、プロジェクトルートにあること）
  - アプリケーションを完全に再起動したか確認
  - ブラウザのキャッシュをクリアするか、シークレットモードで試す

**補足: エミュレータを使用する場合**

エミュレータを使用し続ける場合は、エミュレータ内でユーザーを作成する必要があります：
1. Firebase Emulator UI（`http://localhost:4000`）にアクセス
2. 「Authentication」タブを開く
3. 「Add user」でユーザーを作成
4. その後、Firestoreエミュレータでも承認レコードを作成

### 既存の管理者による追加ユーザーの承認

既に管理者がいる場合、新しいユーザーは以下のいずれかの方法で承認されます：

1. **アプリケーションから新規登録**: ユーザーがアプリから新規登録すると、自動的に承認待ち状態になります。管理者が承認管理画面から承認できます。
2. **Firebase Consoleで作成**: 上記の手順と同じ方法で手動で承認レコードを作成します。

### 重要な注意事項：承認レコードの作成

**Firebase Consoleでユーザーを作成した場合、以下の手順が必要です：**

#### 問題点

Firebase Consoleでユーザーを作成しても、自動的には承認レコードが作成されません。そのため、ログインはできても、アプリ内の保護されたページにアクセスできません。

#### 解決方法

1. **エミュレータを使用している場合**：
   - 開発環境では自動的にエミュレータに接続されます
   - Firebase Consoleで作成した本番環境のユーザーではログインできません
   - エミュレータを使用する場合は、エミュレータ内でユーザーを作成するか、環境変数 `VITE_USE_EMULATOR=false` を設定して本番環境に接続してください

2. **承認レコードの作成**：
   Firebase Consoleでユーザーを作成した後、以下のいずれかの方法で承認レコードを作成する必要があります：

   **方法A: Firestore Consoleで手動作成**
   1. Firestore Consoleを開く
   2. `userApprovals` コレクションを開く
   3. ユーザーのUIDをドキュメントIDとして新しいドキュメントを作成
   4. 以下のフィールドを追加：
      - `userId`: ユーザーのUID（文字列）
      - `email`: ユーザーのメールアドレス（文字列）
      - `approved`: `true`（ブール値）- すぐに承認する場合
      - `createdAt`: 現在のタイムスタンプ
      - `approvedAt`: 現在のタイムスタンプ（承認する場合）
      - `approvedBy`: 承認者のUID（文字列、承認する場合）

   **方法B: アプリケーションから初回ログイン時に自動作成（推奨）**
   - ユーザーが初回ログインした際に、承認レコードが自動的に作成されるように実装する（将来的に実装予定）

   **方法C: 管理者画面から承認**
   - 既存のユーザー承認管理画面を使用して、承認レコードを作成・承認する

### 3. ユーザーの役割について

システムでは以下の4つのステータスが設定できます：

#### ユーザーステータス

1. **未登録（未認証）**
   - ログインしていないユーザー
   - 公開データ（チーム情報など）のみ閲覧可能

2. **閲覧者（viewer）**
   - 承認済みユーザー
   - すべてのデータを閲覧可能
   - データの編集・作成は不可

3. **編集者（editor）**
   - 承認済みユーザー
   - すべてのデータを閲覧・編集・作成可能
   - ユーザー管理は不可

4. **管理者（admin）**
   - 承認済みユーザー
   - すべての機能にアクセス可能
   - ユーザー管理（承認・役割変更）が可能
   - 管理者ページへのアクセス可能

#### 役割の設定

- 承認時に役割を設定できます（管理者ページから）
- 承認済みユーザーの役割は管理者ページから変更できます
- 最初の管理者を作成する場合は、Firestore Consoleで `role` フィールドに `admin` を設定してください

### 4. 管理者権限の設定

現在のセキュリティルールでは、認証済みユーザーはすべて読み書き可能です。
将来的には、Firestoreセキュリティルールで役割ベースのアクセス制御を実装する予定です。

## テスト手順

### ローカル環境でのテスト

**現在の状況**: ローカルでのテスト環境は本番環境（Firebase本番環境）に接続しています。エミュレータは使用していません。

**注意**: 本番環境に接続しているため、テスト時に作成・変更したデータは本番データベースに反映されます。テストデータの作成には十分注意してください。

#### エミュレータを使用する場合（参考）

エミュレータを使用してテストする場合は、以下の手順に従ってください：

1. エミュレータを起動: `npm run dev:emulator`
2. アプリケーションを起動: `npm run dev:app`
3. ブラウザで `http://localhost:5173` にアクセス

#### 現在のテスト手順（本番環境接続時）

1. アプリケーションを起動: `npm run dev:app` または `npm run dev`
2. ブラウザで `http://localhost:5173` にアクセス
3. 各種機能をテスト：
   - ユーザー登録・ログイン
   - チーム登録・検索
   - 選手登録・検索
   - 大会登録・検索
   - 試合登録・管理
   - ラインナップ登録
   - 打席記録の入力
   - ゲーム状態の更新

### 本番環境でのテスト

1. デプロイ後、本番URLにアクセス
2. 上記と同様の機能をテスト
3. Firestore Consoleでデータが正しく保存されていることを確認

## 今後の開発・デプロイフロー

### ローカル開発

1. 新しいブランチを作成
2. ローカルでエミュレータを起動して開発
3. 変更をコミット・プッシュ
4. プルリクエストを作成
5. レビュー後にマージ

### デプロイ

1. メインブランチにマージ後、以下を実行：
   ```bash
   npm run build
   firebase deploy
   ```

### 新しいGitHubプロジェクトへのコピーについて

現在のプロジェクトを新しいGitHubプロジェクトにコピーする場合：

1. **新しいリポジトリを作成**
   - GitHubで新しいリポジトリを作成

2. **コードをコピー**
   ```bash
   # 新しいディレクトリにクローン
   git clone <現在のリポジトリURL>
   cd <プロジェクト名>
   
   # 新しいリモートを設定
   git remote set-url origin <新しいリポジトリURL>
   git push -u origin main
   ```

3. **Firebaseプロジェクトの設定**
   - 新しいFirebaseプロジェクトを作成（または既存のプロジェクトを使用）
   - `.firebaserc` を更新してプロジェクトIDを変更
   - `src/firebaseConfig.ts` を更新して新しいFirebase設定を反映

4. **環境変数の設定**
   - 必要に応じて環境変数を設定

5. **初回デプロイ**
   ```bash
   firebase login
   firebase use <新しいプロジェクトID>
   npm run build
   firebase deploy
   ```

### 注意事項

- **本番環境のデータ**: 新しいプロジェクトに移行する場合、既存のデータは移行されません。必要に応じてデータのエクスポート・インポートを行ってください。
- **セキュリティルール**: 新しいプロジェクトでは、セキュリティルールを再デプロイしてください。
- **認証設定**: Firebase Authenticationの設定（プロバイダーなど）を新しいプロジェクトで再設定してください。
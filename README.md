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

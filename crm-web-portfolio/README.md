# 店舗巡回CRM (crm-web)

ラウンダー業務向けのマップ中心CRM。訪問担当者はマップ上で店舗を巡回・ステータス更新し、管理者はCSVで店舗を一括登録・管理する。

技術: React 19 + Vite + TypeScript / MUI v6 / Firebase (Auth・Firestore・Functions・Hosting) / Google Maps。

> **これは個人開発のポートフォリオとして公開しているソースコードです。**
> APIキーやプロジェクト固有のシークレットは一切含まれていません。Firebase/Google Maps の設定はすべて環境変数（`.env.local`）で注入する設計で、`.env.example` をテンプレートにご自身のプロジェクトの値を設定すれば動作します。`.env.local` は `.gitignore` 済みです。

## フェーズ1で実装済みの機能

- メール/パスワード認証（サインアップ無効・パスワード再設定対応・admin/staffロール）
- マップ表示 + ステータス色分けピン + マーカークラスタリング
- フィルタ（エリア / ステータス / ジャンル / 未訪問のみ）— 絞り込みクエリのみ購読
- 店舗詳細パネル（スマホ=ボトムシート / PC=サイドパネル）: 情報閲覧・ステータス更新・メモ・訪問履歴・外部ナビ起動・同期状態表示
- ステータス更新と訪問履歴記録のトランザクション（prevStatusId付き）
- CSVインポート（UTF-8/Shift-JIS対応・エリア/ステータス名の自動突合と作成・エラー行返却）
- Cloud Functions: 住所→緯度経度ジオコーディング / 管理者によるユーザー発行
- Firestore Security Rules（ロール+フィールドレベル制御）・オフライン永続化・App Check

## セットアップ

```bash
npm install
cp .env.example .env.local   # 値を埋める
npm run dev                  # http://localhost:5173
```

### 必要な環境変数（.env.local）
Firebase Console のプロジェクト設定からWebアプリの構成を取得し、Google Maps APIキー（**HTTPリファラー制限必須**）とMap ID、App Check用 reCAPTCHA サイトキーを設定する。詳細は `.env.example` 参照。

## Firebase 側の準備

1. Firebaseプロジェクトで **Authentication（メール/パスワード）** を有効化
2. **Firestore** を作成
3. **Blaze プラン**に切替（Functions / Geocoding API の外部呼び出しに必要）
4. Google Cloud で **Maps JavaScript API** と **Geocoding API** を有効化
5. Functions の Secret に Geocoding キーを登録:
   ```bash
   firebase functions:secrets:set GEOCODING_API_KEY
   ```
6. 初回管理者アカウントは Console から Auth にユーザーを手動作成し、`users/{uid}` に `{ role: "admin", disabled: false, name, email }` を手動登録（以降は createUser 関数で発行可能）

### 課金保護（必ず設定）
- Maps APIキーに HTTPリファラー制限 + 用途をMaps JSのみに制限
- 各APIに日次quota上限
- Google Cloud で予算アラート＋上限
- App Check を有効化（reCAPTCHA v3）

## デプロイ

```bash
npm run build
firebase deploy   # hosting + firestore rules/indexes + functions
```

## CSVフォーマット

ヘッダー行（日本語・順不同可）: `店舗コード(任意), 店舗名, 住所, 店舗ジャンル, 営業時間, 大エリア, 中エリア, 小エリア, 現在の最新ステータス, 最新の訪問メモ`

- 文字コードは UTF-8（BOM可）/ Shift-JIS に対応
- エリア・ステータスは**名前**で記載 → インポート時にマスタと突合し、無ければ自動作成
- 緯度経度はCSVに不要。登録後にFunctionsが住所から自動変換
- 任意で `緯度` / `経度` 列を持たせると、その座標を確定値として使用（ジオコーディング不要）。
  → 課金前（Maps Functions未デプロイ）でもピン表示の確認が可能

### 地図のマーカー描画
- `VITE_GOOGLE_MAPS_MAP_ID` あり → AdvancedMarker + マーカークラスタリング
- Map ID なし（課金前の開発時など）→ 通常 Marker でフォールバック表示（クラスタリングなし）

### upsert（新規登録 + 既存更新）
- 突合キー: **店舗コードがあれば優先**、無ければ **「店舗名+住所」**
- **新規**: ステータス・メモを初期値として登録
- **更新**: 基本情報（店舗名/住所/ジャンル/営業時間/エリア）のみ更新。
  現場が更新する運用データ（ステータス/メモ/最終訪問）は**CSVで上書きしない**。
  住所が変わった場合のみ再ジオコーディング。

## 既知のTODO（フェーズ2以降）

- ダッシュボード（進捗グラフ）/ CSVエクスポート
- マスタ管理画面（ステータス/エリア/ユーザーUI）
- ジオコーディング失敗店舗の手動ピン配置
- 現在地連動 / バンドルのコード分割

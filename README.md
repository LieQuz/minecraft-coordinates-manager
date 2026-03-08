# ⛏️ Minecraft 座標マネージャー

マルチプレイ中にみんなで見つけた場所の座標を共有・管理できる Web アプリです。

![screenshot](https://img.shields.io/badge/Node.js-Express-green) ![license](https://img.shields.io/badge/license-ISC-blue)

## 機能

- 📍 **座標の登録** — 場所の名前・X/Z座標・ディメンション・メモを保存
- 📋 **ワンクリックコピー** — 座標をクリックするだけでクリップボードにコピー
- 🔍 **検索・フィルター** — 名前/メモで検索、ディメンション別に絞り込み
- 🗑️ **削除** — 確認ダイアログ付きで誤削除を防止
- 🌍 **ディメンション対応** — オーバーワールド / ネザー / エンドを色分け表示

## 技術スタック

| 役割 | 技術 |
|------|------|
| サーバー | Node.js + Express |
| データベース | SQLite (better-sqlite3) |
| フロントエンド | Vanilla HTML / CSS / JavaScript |

## セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/LieQuz/minecraft-coordinates-manager.git
cd minecraft-coordinates-manager

# 依存パッケージをインストール
npm install

# サーバーを起動
npm start
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く。

## API

| メソッド | エンドポイント | 説明 |
|----------|----------------|------|
| `GET` | `/api/coordinates` | 一覧取得（`?search=`, `?dimension=` でフィルター） |
| `POST` | `/api/coordinates` | 座標を追加 |
| `DELETE` | `/api/coordinates/:id` | 座標を削除 |

### POST リクエスト例

```json
{
  "name": "拠点",
  "x": 100,
  "z": -200,
  "dimension": "overworld",
  "notes": "スタート地点"
}
```

## ディレクトリ構成

```
minecraft-coordinates-manager/
├── server.js        # Express サーバー・API
├── database.js      # SQLite 操作
├── public/
│   ├── index.html   # UI
│   ├── style.css    # スタイル
│   └── app.js       # フロントエンドロジック
└── coordinates.db   # データベース（自動生成）
```

## LAN 内での共有

同じネットワーク内のフレンドは `http://あなたのIPアドレス:3000` でアクセスできます。

```bash
# Mac でローカル IP を確認
ipconfig getifaddr en0
```

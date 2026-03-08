# ⛏️ Minecraft 座標マネージャー

マルチプレイ中にみんなで見つけた場所の座標を共有・管理できる Web アプリです。

![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![license](https://img.shields.io/badge/license-ISC-blue)

## 機能

- 📍 **座標の登録** — 場所の名前・X/Z座標・ディメンション・カテゴリ・メモを保存
- ✏️ **編集** — 登録済みの座標をその場で編集
- 📋 **ワンクリックコピー** — 座標をクリックするだけでクリップボードにコピー
- 🔍 **検索・フィルター** — 名前/メモで検索、ディメンション・カテゴリ別に絞り込み
- 🗑️ **削除** — 確認ダイアログ付きで誤削除を防止
- 🌍 **ディメンション対応** — オーバーワールド / ネザー / エンドを色分け表示
- 🔑 **招待リンク認証** — トークン付きURLを知っている人だけアクセス可能

## 対応カテゴリ

拠点 / 農場 / 村 / ウッドランドマンション / ピリジャー前哨基地 / 砂漠の神殿 / ジャングルの神殿 / イグルー / 海底神殿 / 沈没船 / 廃坑 / 要塞 / ネザー要塞 / エンドシティ / 資源 / その他

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

起動するとターミナルにアクセスURLが表示されます：

```
🟢 Minecraft座標マネージャー起動中: http://localhost:3000
🔑 アクセスURL: http://localhost:3000/?key=xxxxxxxxxxxxxxxx
```

このURLをフレンドに共有するだけでOKです。  
ブラウザが Cookie を記憶するので、以降はキーなしで普通にアクセスできます（有効期限30日）。

## アクセス制御

- トークンは初回起動時に自動生成され `access.token` ファイルに保存されます
- サーバーを再起動してもトークンは変わりません
- トークンを変更したい場合は `access.token` を削除して再起動してください
- `ACCESS_TOKEN` 環境変数で固定トークンを指定することも可能です

```bash
ACCESS_TOKEN=mytoken npm start
```

## サーバーへのデプロイ・更新

```bash
# 初回
git clone https://github.com/LieQuz/minecraft-coordinates-manager.git
cd minecraft-coordinates-manager
npm install
npm install -g pm2
pm2 start server.js --name minecraft-coords
pm2 save && pm2 startup

# 更新時
git pull && pm2 restart minecraft-coords
```

## API

| メソッド | エンドポイント | 説明 |
|----------|----------------|------|
| `GET` | `/api/coordinates` | 一覧取得（`?search=`, `?dimension=` でフィルター） |
| `POST` | `/api/coordinates` | 座標を追加 |
| `PUT` | `/api/coordinates/:id` | 座標を編集 |
| `DELETE` | `/api/coordinates/:id` | 座標を削除 |

### POST / PUT リクエスト例

```json
{
  "name": "海底神殿",
  "x": 512,
  "z": -1024,
  "dimension": "overworld",
  "category": "海底神殿",
  "notes": "コンジットあり"
}
```

## ディレクトリ構成

```
minecraft-coordinates-manager/
├── server.js        # Express サーバー・API・認証
├── database.js      # SQLite 操作
├── public/
│   ├── index.html   # UI
│   ├── style.css    # スタイル
│   ├── app.js       # フロントエンドロジック
│   └── denied.html  # アクセス拒否ページ
├── access.token     # アクセストークン（自動生成・gitignore済み）
└── coordinates.db   # データベース（自動生成・gitignore済み）
```

## LAN 内での共有

```bash
# Mac でローカル IP を確認
ipconfig getifaddr en0

# Linux でローカル IP を確認
ip a | grep "inet " | grep -v 127
```


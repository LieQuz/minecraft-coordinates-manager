# ⛏️ Minecraft 座標マネージャー

マルチプレイ中に見つけた場所の座標をみんなで管理・共有できる Web アプリです。

![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![license](https://img.shields.io/badge/license-ISC-blue)

---

## できること

- **座標の登録・編集・削除** — 名前・X/Z座標・ディメンション・カテゴリ・メモをまとめて保存できます
- **ワンクリックコピー** — 座標をクリックするだけでクリップボードに入ります。ゲームに戻ってすぐ使えます
- **ネザー↔オーバーワールド自動換算** — オーバーワールドの座標を登録するとネザー換算値が自動表示され、その逆も同様です（÷8 / ×8）
- **検索・絞り込み** — 名前やメモで全文検索、ディメンションやカテゴリでフィルタリングできます
- **招待リンク認証** — トークン付きURLを知っている人だけアクセスできます。フレンドに URL を送るだけで参加できます

## 対応カテゴリ

拠点 / 農場 / 村 / ウッドランドマンション / ピリジャー前哨基地 / 砂漠の神殿 / ジャングルの神殿 / イグルー / 海底神殿 / 沈没船 / 廃坑 / 要塞 / ネザー要塞 / エンドシティ / 資源 / その他

---

## セットアップ

```bash
git clone https://github.com/LieQuz/minecraft-coordinates-manager.git
cd minecraft-coordinates-manager
npm install
npm start
```

起動するとターミナルにアクセス URL が表示されます。

```
🟢 Minecraft座標マネージャー起動中: http://localhost:3000
🔑 アクセスURL: http://localhost:3000/?key=xxxxxxxxxxxxxxxx
```

この URL をフレンドに送ればすぐ使えます。Cookie が保存されるので、次回からはキーなしで普通にアクセスできます（有効期限 30 日）。

---

## アクセス制御

トークンは初回起動時に自動生成されて `access.token` に保存されます。サーバーを再起動しても変わりません。

トークンをリセットしたい場合は `access.token` を削除して再起動してください。環境変数で固定することも可能です。

```bash
ACCESS_TOKEN=mytoken npm start
```

---

## セキュリティ

| 対策 | 内容 |
|------|------|
| タイミング攻撃対策 | トークン比較に `crypto.timingSafeEqual()` を使用 |
| ブルートフォース対策 | `?key=` によるトークン認証試行にのみレート制限を適用（15分に20回） |
| Cookie 保護 | `httpOnly` + `sameSite=lax`、HTTPS 環境では `Secure` フラグを自動付与 |
| リクエスト制限 | ボディサイズ上限 16KB |
| 入力バリデーション | 名前 100 文字・メモ 1000 文字の上限 |
| SQL インジェクション対策 | プリペアドステートメントのみ使用 |

---

## API

| メソッド | エンドポイント | 説明 |
|----------|----------------|------|
| `GET` | `/api/coordinates` | 一覧取得（`?search=`・`?dimension=` でフィルター可） |
| `POST` | `/api/coordinates` | 座標を追加 |
| `PUT` | `/api/coordinates/:id` | 座標を編集 |
| `DELETE` | `/api/coordinates/:id` | 座標を削除 |

**POST / PUT リクエスト例**

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

---

## 技術スタック

| 役割 | 技術 |
|------|------|
| サーバー | Node.js + Express |
| データベース | SQLite（better-sqlite3） |
| フロントエンド | HTML / CSS / Vanilla JavaScript |
| 認証 | トークン + Cookie |

---

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
├── access.token     # アクセストークン（自動生成・gitignore 済み）
└── coordinates.db   # データベース（自動生成・gitignore 済み）
```

---

## LAN 内で使う場合

同じネットワーク内なら、サーバーを起動している PC のローカル IP でアクセスできます。

```bash
# Mac
ipconfig getifaddr en0

# Linux
ip a | grep "inet " | grep -v 127
```

`http://<ローカルIP>:3000/?key=xxxx` にアクセスすれば OK です。


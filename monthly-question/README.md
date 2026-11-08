# 今月の問い

白い画面の真ん中に、毎月ひとつの問い。
閲覧者はニックネームとひとことを添え、その言葉が問いのまわりに浮かんでは消えていきます。

- `framer/YohakuQuestion.tsx` … Framer のコードコンポーネント（Takumi Ohba の自己紹介の直前に置く）
- `supabase/schema.sql` … 回答・いいね・これまでの問いを保存するデータベース

Supabase の URL とキーを入れるまでは「プレビュー」として、見本の言葉で動きます（見本の言葉は閲覧者のブラウザの中だけに残り、どこにも保存されません）。

---

## 1. はじめの準備（一度だけ・10分ほど）

1. https://supabase.com で無料アカウントをつくる（GitHub でログインできます）
2. **New project** → 名前は `yohaku-lab`、Region は **Northeast Asia (Tokyo)**、パスワードは自動生成のままで作成
3. 左メニュー **SQL Editor** → `supabase/schema.sql` の中身をまるごと貼り付けて **Run**
4. 左メニュー **Project Settings → API Keys** で次の2つをコピー
   - Project URL（`https://xxxx.supabase.co`）
   - **Publishable key**（`sb_publishable_…`。古い画面なら `anon` `public` キー）
5. Framer でコンポーネントを選び、右パネルの **Supabase URL** と **Public Key** に貼る

Publishable key はサイトに埋め込む前提の公開用キーです。チャットに貼っても問題ありません。
**`service_role` / `secret` キーは絶対に貼らないでください。**

## 2. 毎月の運営

**Table Editor → `yl_questions` → Insert row**

| month | body | image_url |
|---|---|---|
| 2026-12-01 | 来月の問い | （写真を置く月だけ URL） |

- 月の1日（日本時間）になると自動で切り替わります。先に何か月分入れておいても大丈夫です。
- 前の月は「これまでの問い」に移り、いいねの多い3つが並びます。

## 3. 言葉の見守り

| 状態 | 意味 |
|---|---|
| `visible` | 表示中 |
| `pending` | 確認待ち（URL・メールアドレス・電話番号らしきものを含む投稿は自動でここへ） |
| `hidden` | 非表示（禁止語を含む投稿は自動でここへ。投稿者には「確認待ち」と伝わる） |

- 消したい言葉 … `yl_answers` で該当行の `status` を `hidden` に
- 確認待ちを表示する … `status` を `visible` に
- 一覧を見る … SQL Editor で `select * from yl_review;`
- 禁止語を足す … `yl_blocked_words` に1語ずつ行を追加
- すべての投稿を確認してから出したい … SQL Editor で `update yl_settings set auto_publish = false;`

### 自動で効いている決まり
- ひとことは60字、ニックネームは16字まで
- 同じブラウザから、ひとつの問いに3つまで／30秒あける
- 同じネットワークから1時間に10件まで、同じ言葉の二重投稿はできない
- 人には見えない入力欄（ボット避け）
- いいねは一つの言葉に一人ひとつ（もう一度押すと外れる）

いいねはブラウザ単位の数え方です。小さな場の温度を伝えるには十分ですが、賞品を出す「投票」には向きません。

### 無料プランについて
Supabase の無料プランは、7日間まったくアクセスがないと一時停止します。サイトに訪問があれば動き続けます。止まった場合はダッシュボードの **Restore** で戻せます。

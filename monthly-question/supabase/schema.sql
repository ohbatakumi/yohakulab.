-- ─────────────────────────────────────────────────────────────
-- 余白Lab. 今月の問い — Supabase schema
--
-- Supabase の SQL Editor に、このファイルをまるごと貼り付けて
-- 「Run」を押すだけで準備が整います（何度実行しても安全です）。
--
-- 方針
--   ・テーブルには公開キー（anon）から直接触れさせない。
--   ・サイトからの読み書きは、下の4つの関数だけを通す。
--   ・投稿の長さ・頻度・禁止語・URL を関数の中で確かめる。
-- ─────────────────────────────────────────────────────────────

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ── 問い（毎月ひとつ） ──────────────────────────────────────
create table if not exists public.yl_questions (
    id          bigint generated always as identity primary key,
    month       date   not null unique,          -- その月の1日（例 2026-11-01）
    body        text   not null,                 -- 問いの文
    image_url   text,                            -- 写真を置く月だけ
    created_at  timestamptz not null default now()
);

-- ── 回答（ニックネームと一言） ─────────────────────────────
create table if not exists public.yl_answers (
    id           uuid primary key default gen_random_uuid(),
    question_id  bigint not null references public.yl_questions(id) on delete cascade,
    nickname     text   not null check (char_length(nickname) between 1 and 16),
    body         text   not null check (char_length(body) between 1 and 60),
    status       text   not null default 'visible'
                 check (status in ('visible', 'pending', 'hidden')),
    likes        int    not null default 0,
    voter_id     uuid   not null,                -- 閲覧者のブラウザごとの匿名ID
    ip_hash      text,                           -- 連投対策（IPそのものは保存しない）
    created_at   timestamptz not null default now()
);
create index if not exists yl_answers_q_idx on public.yl_answers (question_id, status, likes desc);
create index if not exists yl_answers_voter_idx on public.yl_answers (voter_id, created_at desc);
create index if not exists yl_answers_ip_idx on public.yl_answers (ip_hash, created_at desc);

-- ── いいね（ひとつの言葉に、ひとりひとつ） ───────────────
create table if not exists public.yl_likes (
    answer_id   uuid not null references public.yl_answers(id) on delete cascade,
    voter_id    uuid not null,
    created_at  timestamptz not null default now(),
    primary key (answer_id, voter_id)
);
create index if not exists yl_likes_voter_idx on public.yl_likes (voter_id, created_at desc);

-- ── 設定と禁止語 ─────────────────────────────────────────
create table if not exists public.yl_settings (
    id            int primary key default 1 check (id = 1),
    auto_publish  boolean not null default true  -- false にすると全投稿が「確認待ち」になる
);
insert into public.yl_settings (id) values (1) on conflict do nothing;

create table if not exists public.yl_blocked_words (
    word text primary key                       -- 含まれていたら非表示（hidden）で保存
);

-- 公開キーからテーブルへ直接は触れない
alter table public.yl_questions     enable row level security;
alter table public.yl_answers       enable row level security;
alter table public.yl_likes         enable row level security;
alter table public.yl_settings      enable row level security;
alter table public.yl_blocked_words enable row level security;
revoke all on public.yl_questions, public.yl_answers, public.yl_likes,
              public.yl_settings, public.yl_blocked_words from anon, authenticated;

-- ── 内部ヘルパー ─────────────────────────────────────────
create or replace function public.yl_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Tokyo')::date $$;

create or replace function public.yl_ip_hash() returns text
language plpgsql stable as $$
declare h json; ip text;
begin
    begin
        h := current_setting('request.headers', true)::json;
    exception when others then
        return null;
    end;
    ip := coalesce(h->>'cf-connecting-ip', split_part(h->>'x-forwarded-for', ',', 1));
    if ip is null or ip = '' then return null; end if;
    return encode(extensions.digest('yohaku-lab:' || trim(ip), 'sha256'), 'hex');
end $$;

create or replace function public.yl_answer_json(a public.yl_answers, p_voter uuid)
returns json language sql stable as $$
    select json_build_object(
        'id', a.id, 'nickname', a.nickname, 'body', a.body,
        'likes', a.likes, 'createdAt', a.created_at,
        'liked', exists (select 1 from public.yl_likes l
                         where l.answer_id = a.id and l.voter_id = p_voter),
        'mine', a.voter_id = p_voter
    )
$$;

-- ── 1. 今月の問いと、表示中の言葉 ─────────────────────────
create or replace function public.yl_current(p_voter uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare q public.yl_questions;
begin
    select * into q from yl_questions where month <= yl_today()
    order by month desc limit 1;
    if q.id is null then return json_build_object('question', null, 'answers', '[]'::json); end if;
    return json_build_object(
        'question', json_build_object('id', q.id, 'month', q.month, 'body', q.body, 'imageUrl', q.image_url),
        'answers', coalesce((
            select json_agg(yl_answer_json(a, p_voter) order by a.created_at desc)
            from yl_answers a
            where a.question_id = q.id
              and (a.status = 'visible' or (a.voter_id = p_voter and a.status = 'pending'))
        ), '[]'::json)
    );
end $$;

-- ── 2. 言葉を添える ───────────────────────────────────────
create or replace function public.yl_submit(
    p_question_id bigint default null,
    p_nickname text default '',
    p_body text default '',
    p_voter uuid default null,
    p_trap text default ''          -- 人には見えない入力欄。埋まっていたら機械とみなす
) returns json language plpgsql volatile security definer set search_path = public as $$
declare
    nick text := regexp_replace(trim(coalesce(p_nickname, '')), '\s+', ' ', 'g');
    msg  text := regexp_replace(trim(coalesce(p_body, '')), '\s+', ' ', 'g');
    ip   text := yl_ip_hash();
    q    public.yl_questions;
    st   text := 'visible';
    rec  public.yl_answers;
begin
    if p_voter is null then raise exception 'invalid' using errcode = '22023'; end if;

    -- ボット: 成功したふりをして何も保存しない
    if coalesce(p_trap, '') <> '' then
        return json_build_object('ok', true, 'status', 'pending', 'answer', null);
    end if;

    select * into q from yl_questions where id = p_question_id;
    if q.id is null or q.id <> (select id from yl_questions where month <= yl_today()
                                 order by month desc limit 1) then
        raise exception 'closed' using errcode = '22023', hint = 'この問いへの回答は締め切られました。';
    end if;

    if char_length(nick) < 1 or char_length(nick) > 16 then
        raise exception 'nickname' using errcode = '22023', hint = 'ニックネームは16文字までです。';
    end if;
    if char_length(msg) < 1 or char_length(msg) > 60 then
        raise exception 'body' using errcode = '22023', hint = 'ひとことは60文字までです。';
    end if;

    -- 連投対策
    if exists (select 1 from yl_answers where voter_id = p_voter
               and created_at > now() - interval '30 seconds') then
        raise exception 'rate' using errcode = '22023', hint = '少し時間をおいてから、もう一度どうぞ。';
    end if;
    if (select count(*) from yl_answers where voter_id = p_voter and question_id = q.id) >= 3 then
        raise exception 'limit' using errcode = '22023', hint = 'ひとつの問いに添えられる言葉は3つまでです。';
    end if;
    if ip is not null and (select count(*) from yl_answers where ip_hash = ip
                           and created_at > now() - interval '1 hour') >= 10 then
        raise exception 'rate' using errcode = '22023', hint = '少し時間をおいてから、もう一度どうぞ。';
    end if;
    if exists (select 1 from yl_answers where question_id = q.id and body = msg
               and (voter_id = p_voter or (ip is not null and ip_hash = ip))) then
        raise exception 'dup' using errcode = '22023', hint = '同じ言葉がすでに届いています。';
    end if;

    -- 内容の確認
    if not (select auto_publish from yl_settings where id = 1) then
        st := 'pending';
    end if;
    if msg ~* '(https?://|www\.|\.(com|net|jp|io|xyz|ru|cn)\M|@[a-z0-9_]{2,}|[0-9０-９]{2,4}[-ー－][0-9０-９]{2,4}[-ー－][0-9０-９]{3,4})'
       or nick ~* '(https?://|www\.)' then
        st := 'pending';
    end if;
    if exists (select 1 from yl_blocked_words w
               where position(lower(w.word) in lower(msg || ' ' || nick)) > 0) then
        st := 'hidden';
    end if;

    insert into yl_answers (question_id, nickname, body, status, voter_id, ip_hash)
    values (q.id, nick, msg, st, p_voter, ip)
    returning * into rec;

    return json_build_object(
        'ok', true,
        -- hidden は本人には pending と伝える（禁止語の存在を知らせない）
        'status', case when st = 'hidden' then 'pending' else st end,
        'answer', case when st = 'hidden' then null else yl_answer_json(rec, p_voter) end
    );
end $$;

-- ── 3. いいね（押すたびに、つける／外す） ─────────────────
create or replace function public.yl_like(p_answer uuid, p_voter uuid)
returns json language plpgsql volatile security definer set search_path = public as $$
declare n int; did boolean;
begin
    if p_voter is null then raise exception 'invalid' using errcode = '22023'; end if;
    if not exists (select 1 from yl_answers where id = p_answer and status = 'visible') then
        raise exception 'missing' using errcode = '22023';
    end if;

    delete from yl_likes where answer_id = p_answer and voter_id = p_voter;
    if found then
        did := false;
        update yl_answers set likes = greatest(likes - 1, 0) where id = p_answer returning likes into n;
    else
        if (select count(*) from yl_likes where voter_id = p_voter
            and created_at > now() - interval '1 hour') >= 120 then
            raise exception 'rate' using errcode = '22023', hint = '少し時間をおいてから、もう一度どうぞ。';
        end if;
        insert into yl_likes (answer_id, voter_id) values (p_answer, p_voter);
        did := true;
        update yl_answers set likes = likes + 1 where id = p_answer returning likes into n;
    end if;
    return json_build_object('likes', n, 'liked', did);
end $$;

-- ── 4. これまでの問い（各月の上位） ───────────────────────
create or replace function public.yl_archive(p_limit int default 3)
returns json language sql stable security definer set search_path = public as $$
    select coalesce(json_agg(x order by x.month desc), '[]'::json) from (
        select q.month, q.body, q.image_url as "imageUrl",
               (select count(*) from yl_answers a where a.question_id = q.id and a.status = 'visible') as total,
               coalesce((
                   select json_agg(json_build_object('nickname', t.nickname, 'body', t.body, 'likes', t.likes)
                                   order by t.likes desc, t.created_at)
                   from (select * from yl_answers a
                         where a.question_id = q.id and a.status = 'visible'
                         order by a.likes desc, a.created_at
                         limit least(greatest(p_limit, 1), 10)) t
               ), '[]'::json) as top
        from yl_questions q
        where q.month <= yl_today()
          and q.id <> coalesce((select id from yl_questions where month <= yl_today()
                                order by month desc limit 1), -1)
    ) x
$$;

-- 公開キーに許すのは、この4つの関数だけ
revoke all on function public.yl_ip_hash(), public.yl_answer_json(public.yl_answers, uuid) from public, anon, authenticated;
grant execute on function public.yl_current(uuid) to anon, authenticated;
grant execute on function public.yl_submit(bigint, text, text, uuid, text) to anon, authenticated;
grant execute on function public.yl_like(uuid, uuid) to anon, authenticated;
grant execute on function public.yl_archive(int) to anon, authenticated;

-- ── 運営者向け: 確認待ちの一覧（Table Editor / SQL Editor で使う） ─
create or replace view public.yl_review as
    select a.id, q.month, a.nickname, a.body, a.status, a.likes, a.created_at
    from public.yl_answers a join public.yl_questions q on q.id = a.question_id
    order by (a.status = 'pending') desc, a.created_at desc;
revoke all on public.yl_review from anon, authenticated;

-- ── 最初の問い ─────────────────────────────────────────
insert into public.yl_questions (month, body)
values ('2026-11-01', 'あなたが最近美しいと感じたものや瞬間は？')
on conflict (month) do nothing;

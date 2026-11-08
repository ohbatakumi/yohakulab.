import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * 今月の問い — one question a month, set in the middle of a white field.
 * Visitors leave a nickname and a few words; the words surface around
 * the question one by one, linger, and sink back into the white.
 *
 * Storage: Supabase (see monthly-question/supabase/schema.sql).
 * Without a Supabase URL/key the component runs in preview mode with
 * sample words kept only in this browser.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 860
 */

type Answer = {
    id: string
    nickname: string
    body: string
    likes: number
    liked: boolean
    mine?: boolean
    createdAt?: string
    pending?: boolean
}
type Question = { id: number; month: string; body: string; imageUrl?: string | null }
type ArchiveItem = {
    month: string
    body: string
    imageUrl?: string | null
    total: number
    top: { nickname: string; body: string; likes: number }[]
}

const MINCHO = `"Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif`
const SANS = `"Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic", sans-serif`
const SERIF = `"Instrument Serif", "Cormorant Garamond", Georgia, serif`

/* ───────────────────────── data ───────────────────────── */

function voterId(): string {
    const k = "yl-voter"
    try {
        const v = localStorage.getItem(k)
        if (v) return v
    } catch {}
    const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
                  const r = (Math.random() * 16) | 0
                  return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
              })
    try {
        localStorage.setItem(k, id)
    } catch {}
    return id
}

type Api = {
    current(): Promise<{ question: Question | null; answers: Answer[] }>
    submit(qid: number, nickname: string, body: string, trap: string): Promise<{ status: string; answer: Answer | null }>
    like(id: string): Promise<{ likes: number; liked: boolean }>
    archive(): Promise<ArchiveItem[]>
}

function supabaseApi(url: string, key: string, voter: string): Api {
    const base = url.replace(/\/+$/, "")
    const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" }
    // legacy anon keys are JWTs; new publishable keys (sb_publishable_…) go in apikey only
    if (!key.startsWith("sb_")) headers.Authorization = `Bearer ${key}`
    const rpc = async (fn: string, body: object) => {
        let r: Response
        try {
            r = await fetch(`${base}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(body) })
        } catch {
            throw new Error("通信がうまくいきませんでした。")
        }
        const j = await r.json().catch(() => null)
        if (!r.ok) throw new Error((j && j.hint) || "うまく届きませんでした。少し時間をおいて、もう一度どうぞ。")
        return j
    }
    return {
        current: () => rpc("yl_current", { p_voter: voter }),
        submit: async (qid, nickname, body, trap) =>
            rpc("yl_submit", { p_question_id: qid, p_nickname: nickname, p_body: body, p_voter: voter, p_trap: trap }),
        like: (id) => rpc("yl_like", { p_answer: id, p_voter: voter }),
        archive: () => rpc("yl_archive", { p_limit: 3 }),
    }
}

const SAMPLE: [string, string, number][] = [
    ["朝、障子に落ちた光の四角", "みどり", 12],
    ["雨上がりの土の匂い", "tomo", 9],
    ["祖母が柿をむく手つき", "ゆう", 15],
    ["誰もいない駅のホームの静けさ", "k.", 4],
    ["湯気の向こうに見えた、父の横顔", "はる", 7],
    ["欠けた器を金で継いだ跡", "sora", 11],
    ["夕方五時、窓辺の影がのびる時間", "nao", 3],
    ["霜の降りた朝の、白い息", "いち", 6],
    ["読みかけの本にはさんだ落ち葉", "mio", 5],
    ["冬の川面に映る、ゆれる街灯", "ren", 2],
]

function demoApi(question: string): Api {
    const key = "yl-demo-v1"
    const load = (): Answer[] => {
        try {
            const s = localStorage.getItem(key)
            if (s) return JSON.parse(s)
        } catch {}
        return SAMPLE.map(([body, nickname, likes], i) => ({
            id: `demo-${i}`,
            body,
            nickname,
            likes,
            liked: false,
            createdAt: new Date(Date.now() - i * 3600e3).toISOString(),
        }))
    }
    const save = (a: Answer[]) => {
        try {
            localStorage.setItem(key, JSON.stringify(a))
        } catch {}
    }
    let list = load()
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
    return {
        current: async () => ({ question: { id: 0, month, body: question }, answers: list }),
        submit: async (_q, nickname, body) => {
            const a: Answer = {
                id: `demo-${Date.now()}`,
                nickname: nickname.trim(),
                body: body.trim(),
                likes: 0,
                liked: false,
                mine: true,
                createdAt: new Date().toISOString(),
            }
            list = [a, ...list]
            save(list)
            return { status: "visible", answer: a }
        },
        like: async (id) => {
            let res = { likes: 0, liked: false }
            list = list.map((a) => {
                if (a.id !== id) return a
                const liked = !a.liked
                const likes = Math.max(0, a.likes + (liked ? 1 : -1))
                res = { likes, liked }
                return { ...a, liked, likes }
            })
            save(list)
            return res
        },
        archive: async () => [
            {
                month: "2026-10-01",
                body: "（プレビュー）先月の問いがここに並びます",
                total: 3,
                top: [
                    { nickname: "みどり", body: "いいねの多かった言葉から、三つ", likes: 21 },
                    { nickname: "tomo", body: "順に静かに並びます", likes: 14 },
                    { nickname: "ゆう", body: "月がかわると、問いもかわる", likes: 8 },
                ],
            },
        ],
    }
}

/* ───────────────────────── layout ───────────────────────── */

// anchor points (x%, y%) around the question; the centre stays empty
const SLOTS_WIDE: [number, number][] = [
    [16, 20], [40, 13], [66, 15], [84, 25],
    [12, 47], [83, 52],
    [17, 76], [42, 86], [64, 84], [83, 74],
]
const SLOTS_NARROW: [number, number][] = [
    [32, 13], [62, 25],
    [36, 75], [62, 88],
]

const fmtMonth = (m?: string) => (m ? m.slice(0, 7).replace("-", ".") : "")
const shuffle = <T,>(a: T[]) => {
    const b = a.slice()
    for (let i = b.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0
        ;[b[i], b[j]] = [b[j], b[i]]
    }
    return b
}

type Float = { key: number; id: string; slot: number; out: boolean; dx: number; dy: number; dur: number; delay: number }

/* ───────────────────────── component ───────────────────────── */

export default function YohakuQuestion(props) {
    const { supabaseUrl, supabaseKey, fallbackQuestion, paper, ink, mute, line, style } = props
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const preview = !supabaseUrl || !supabaseKey

    const rootRef = useRef<HTMLDivElement>(null)
    const [w, setW] = useState(1200)
    const narrow = w < 720
    const slots = narrow ? SLOTS_NARROW : SLOTS_WIDE

    const api = useMemo<Api | null>(() => {
        if (typeof window === "undefined") return null
        return preview ? demoApi(fallbackQuestion) : supabaseApi(supabaseUrl, supabaseKey, voterId())
    }, [preview, supabaseUrl, supabaseKey, fallbackQuestion])

    const [question, setQuestion] = useState<Question | null>({ id: 0, month: "", body: fallbackQuestion })
    const [answers, setAnswers] = useState<Answer[]>([])
    const [loaded, setLoaded] = useState(false)
    const [panel, setPanel] = useState<null | "all" | "archive">(null)
    const [form, setForm] = useState(false)
    const [reduced, setReduced] = useState(false)

    useEffect(() => {
        const el = rootRef.current
        setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        if (!el) return
        const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    useEffect(() => {
        if (!api) return
        let alive = true
        api.current()
            .then((d) => {
                if (!alive) return
                if (d.question) setQuestion(d.question)
                setAnswers(d.answers || [])
            })
            .catch(() => {})
            .finally(() => alive && setLoaded(true))
        return () => {
            alive = false
        }
    }, [api])

    useEffect(() => {
        if (!panel) return
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null)
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [panel])

    const visible = useMemo(() => answers.filter((a) => !a.pending), [answers])
    const byId = useMemo(() => new Map(answers.map((a) => [a.id, a])), [answers])

    /* ── likes ── */
    const busy = useRef(new Set<string>())
    const toggleLike = useCallback(
        async (id: string) => {
            if (!api || busy.current.has(id)) return
            const a = byId.get(id)
            if (!a || a.pending) return
            busy.current.add(id)
            const optimistic = { liked: !a.liked, likes: Math.max(0, a.likes + (a.liked ? -1 : 1)) }
            setAnswers((l) => l.map((x) => (x.id === id ? { ...x, ...optimistic } : x)))
            try {
                const r = await api.like(id)
                setAnswers((l) => l.map((x) => (x.id === id ? { ...x, ...r } : x)))
            } catch {
                setAnswers((l) => l.map((x) => (x.id === id ? { ...x, liked: a.liked, likes: a.likes } : x)))
            } finally {
                busy.current.delete(id)
            }
        },
        [api, byId]
    )

    /* ── floating words ── */
    const [floats, setFloats] = useState<Float[]>([])
    const hovered = useRef<string | null>(null)
    const queue = useRef<string[]>([])
    const seq = useRef(0)
    const priority = useRef<string | null>(null)

    const nextId = useCallback(
        (exclude: Set<string>) => {
            if (priority.current && !exclude.has(priority.current)) {
                const p = priority.current
                priority.current = null
                return p
            }
            for (let guard = 0; guard < 2; guard++) {
                while (queue.current.length) {
                    const id = queue.current.shift()!
                    if (!exclude.has(id) && byId.has(id)) return id
                }
                // refill: favour words with more likes, but keep the order loose
                queue.current = shuffle(visible)
                    .sort((a, b) => b.likes * Math.random() - a.likes * Math.random())
                    .map((a) => a.id)
            }
            return null
        },
        [visible, byId]
    )

    const spawn = useCallback(
        (slot: number, id: string, delay = 0): Float => ({
            key: ++seq.current,
            id,
            slot,
            out: false,
            dx: (Math.random() - 0.5) * 18,
            dy: -6 - Math.random() * 10,
            dur: 9 + Math.random() * 6,
            delay,
        }),
        []
    )

    // initial fill / refill when the slot count or data changes
    useEffect(() => {
        if (!loaded) return
        setFloats((cur) => {
            const keep = cur.filter((f) => f.slot < slots.length && byId.has(f.id))
            const used = new Set(keep.map((f) => f.id))
            const free = shuffle(slots.map((_, i) => i).filter((i) => !keep.some((f) => f.slot === i)))
            const want = Math.min(slots.length, visible.length)
            const out = keep.slice()
            for (const s of free) {
                if (out.filter((f) => !f.out).length >= want) break
                const id = nextId(used)
                if (!id) break
                used.add(id)
                // on first appearance the words rise one after another
                out.push(spawn(s, id, keep.length ? 0 : 0.3 + (out.length - keep.length) * 0.45))
            }
            return out
        })
    }, [loaded, slots, visible.length, byId, nextId, spawn])

    // rotation: one word sinks, another rises
    useEffect(() => {
        if (isCanvas || !loaded || visible.length <= slots.length) return
        const t = setInterval(() => {
            setFloats((cur) => {
                const live = cur.filter((f) => !f.out && f.id !== hovered.current)
                if (!live.length) return cur
                const old = live.reduce((a, b) => (a.key < b.key ? a : b))
                const used = new Set(cur.map((f) => f.id))
                const id = nextId(used)
                if (!id) return cur
                const next = cur.map((f) => (f.key === old.key ? { ...f, out: true } : f))
                next.push(spawn(old.slot, id))
                return next
            })
        }, 3200)
        return () => clearInterval(t)
    }, [isCanvas, loaded, visible.length, slots.length, nextId, spawn])

    // drop words that have finished fading out
    useEffect(() => {
        if (!floats.some((f) => f.out)) return
        const t = setTimeout(() => setFloats((cur) => cur.filter((f) => !f.out)), 1800)
        return () => clearTimeout(t)
    }, [floats])

    /* ── submit ── */
    const [nick, setNick] = useState("")
    const [msg, setMsg] = useState("")
    const [trap, setTrap] = useState("")
    const [sending, setSending] = useState(false)
    const [note, setNote] = useState("")

    useEffect(() => {
        try {
            const n = localStorage.getItem("yl-nickname")
            if (n) setNick(n)
        } catch {}
    }, [])

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!api || !question || sending) return
        const n = nick.trim()
        const m = msg.trim()
        if (!n || !m) {
            setNote("ニックネームと、ひとことを。")
            return
        }
        setSending(true)
        setNote("")
        try {
            const r = await api.submit(question.id, n, m, trap)
            try {
                localStorage.setItem("yl-nickname", n)
            } catch {}
            setMsg("")
            if (r.status === "visible" && r.answer) {
                setAnswers((l) => [r.answer!, ...l])
                priority.current = r.answer.id
                setNote("言葉が届きました。")
                // let the new words rise right away
                setFloats((cur) => {
                    const live = cur.filter((f) => !f.out)
                    const free = slots.map((_, i) => i).filter((i) => !live.some((f) => f.slot === i))
                    if (free.length) {
                        priority.current = null
                        return [...cur, spawn(free[(Math.random() * free.length) | 0], r.answer!.id)]
                    }
                    const old = live.reduce((a, b) => (a.key < b.key ? a : b))
                    priority.current = null
                    return [...cur.map((f) => (f.key === old.key ? { ...f, out: true } : f)), spawn(old.slot, r.answer!.id)]
                })
                setTimeout(() => setForm(false), 1400)
            } else {
                if (r.answer) setAnswers((l) => [{ ...r.answer!, pending: true }, ...l])
                setNote("受け取りました。確かめたのち、ここに浮かびます。")
            }
        } catch (err: any) {
            setNote(err?.message || "うまく届きませんでした。")
        } finally {
            setSending(false)
        }
    }

    /* ── archive ── */
    const [archive, setArchive] = useState<ArchiveItem[] | null>(null)
    const openArchive = async () => {
        setPanel("archive")
        if (archive || !api) return
        try {
            setArchive(await api.archive())
        } catch {
            setArchive([])
        }
    }

    /* ── render ── */
    const qSize = narrow ? Math.max(22, Math.min(28, w * 0.066)) : Math.max(34, Math.min(56, w * 0.038))
    const count = visible.length

    const css = `
    @keyframes ylIn { from { opacity: 0; filter: blur(6px) } to { opacity: 1; filter: blur(0) } }
    @keyframes ylOut { from { opacity: 1; filter: blur(0) } to { opacity: 0; filter: blur(6px) } }
    @keyframes ylDrift { from { transform: translate3d(0,0,0) } to { transform: translate3d(var(--dx), var(--dy), 0) } }
    @keyframes ylFade { from { opacity: 0 } to { opacity: 1 } }
    .yl-q * { box-sizing: border-box }
    .yl-q button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer }
    .yl-q input { font: inherit; color: inherit; background: transparent; border: 0; outline: none; border-radius: 0 }
    .yl-q input::placeholder { color: ${mute} }
    .yl-q .yl-ul { background-image: linear-gradient(currentColor, currentColor); background-size: 0% 1px; background-repeat: no-repeat; background-position: 0 100%; transition: background-size .6s cubic-bezier(.2,.7,.2,1) }
    .yl-q .yl-ul:hover, .yl-q .yl-ul:focus-visible { background-size: 100% 1px }
    .yl-q .yl-scroll::-webkit-scrollbar { width: 0 }
    .yl-q :focus-visible { outline: 1px solid ${ink}; outline-offset: 4px }
    `

    const label: React.CSSProperties = {
        fontFamily: SANS,
        fontSize: 11,
        letterSpacing: "0.14em",
        color: mute,
    }

    return (
        <div
            ref={rootRef}
            className="yl-q"
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                minHeight: 560,
                background: paper,
                color: ink,
                overflow: "hidden",
                fontFamily: SANS,
            }}
        >
            <style>{css}</style>

            {/* header line */}
            <div
                style={{
                    position: "absolute",
                    top: narrow ? 24 : 40,
                    left: narrow ? 20 : 48,
                    right: narrow ? 20 : 48,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    zIndex: 3,
                }}
            >
                <div style={label}>
                    今月の問い
                    <span style={{ fontFamily: SERIF, fontStyle: "italic", letterSpacing: "0.02em", fontSize: 14, marginLeft: 12, color: ink }}>
                        {fmtMonth(question?.month) || "—"}
                    </span>
                    {preview && <span style={{ marginLeft: 12 }}>（プレビュー）</span>}
                </div>
                <button className="yl-ul" style={{ ...label, color: ink }} onClick={openArchive}>
                    これまでの問い
                </button>
            </div>

            {/* floating words */}
            <div aria-hidden={panel ? true : undefined} style={{ position: "absolute", inset: 0, zIndex: 1 }}>
                {floats.map((f) => {
                    const a = byId.get(f.id)
                    if (!a) return null
                    const [x, y] = slots[f.slot] || [50, 50]
                    return (
                        <div
                            key={f.key}
                            onPointerEnter={() => (hovered.current = f.id)}
                            onPointerLeave={() => hovered.current === f.id && (hovered.current = null)}
                            style={{
                                position: "absolute",
                                left: `${x}%`,
                                top: `${y}%`,
                                transform: "translate(-50%, -50%)",
                                width: "max-content",
                                maxWidth: narrow ? "42vw" : 260,
                            }}
                        >
                            <div
                                style={{
                                    animation: f.out
                                        ? `ylOut ${reduced ? 1.2 : 1.6}s ease forwards`
                                        : `ylIn ${reduced ? 1.2 : 2.2}s cubic-bezier(.2,.6,.2,1) ${f.delay}s forwards`,
                                    opacity: 0,
                                }}
                            >
                                <div
                                    style={
                                        {
                                            "--dx": `${f.dx}px`,
                                            "--dy": `${f.dy}px`,
                                            animation: reduced || isCanvas ? undefined : `ylDrift ${f.dur}s ease-in-out infinite alternate`,
                                        } as React.CSSProperties
                                    }
                                >
                                    <Word a={a} ink={ink} mute={mute} narrow={narrow} onLike={() => toggleLike(a.id)} />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* the question */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: narrow ? "calc(100% - 88px)" : "min(46%, 640px)",
                    textAlign: "center",
                    zIndex: 2,
                    pointerEvents: "none",
                }}
            >
                {question?.imageUrl && (
                    <img
                        src={question.imageUrl}
                        alt=""
                        style={{ display: "block", width: narrow ? 160 : 220, margin: "0 auto 36px", filter: "grayscale(1)" }}
                    />
                )}
                <h2
                    style={{
                        margin: 0,
                        fontFamily: MINCHO,
                        fontWeight: 400,
                        fontSize: qSize,
                        lineHeight: 1.6,
                        letterSpacing: "0.08em",
                        textWrap: "balance" as any,
                        color: ink,
                    }}
                >
                    {question?.body}
                </h2>

                <div style={{ marginTop: narrow ? 28 : 40, pointerEvents: "auto" }}>
                    {!form ? (
                        <button
                            onClick={() => {
                                setForm(true)
                                setNote("")
                            }}
                            style={{ display: "inline-flex", alignItems: "center", gap: 14, fontSize: 13, letterSpacing: "0.16em" }}
                        >
                            <span style={{ display: "inline-block", width: 32, height: 1, background: ink }} />
                            <span className="yl-ul">ひとこと添える</span>
                        </button>
                    ) : (
                        <form
                            onSubmit={submit}
                            style={{
                                animation: "ylFade .6s ease",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 14,
                                width: narrow ? "100%" : 420,
                                margin: "0 auto",
                                background: paper,
                                padding: "6px 0",
                            }}
                        >
                            <input
                                value={msg}
                                onChange={(e) => setMsg(e.target.value.slice(0, 60))}
                                placeholder="ひとこと（60字まで）"
                                aria-label="ひとこと"
                                autoFocus
                                style={{
                                    width: "100%",
                                    fontFamily: MINCHO,
                                    fontSize: narrow ? 16 : 17,
                                    textAlign: "center",
                                    padding: "8px 0",
                                    borderBottom: `1px solid ${ink}`,
                                }}
                            />
                            <div style={{ display: "flex", width: "100%", gap: 16, alignItems: "center" }}>
                                <input
                                    value={nick}
                                    onChange={(e) => setNick(e.target.value.slice(0, 16))}
                                    placeholder="ニックネーム"
                                    aria-label="ニックネーム"
                                    style={{
                                        flex: 1,
                                        fontSize: 16,
                                        padding: "6px 0",
                                        borderBottom: `1px solid ${line}`,
                                    }}
                                />
                                {/* invisible to people; bots tend to fill it */}
                                <input
                                    value={trap}
                                    onChange={(e) => setTrap(e.target.value)}
                                    tabIndex={-1}
                                    autoComplete="off"
                                    aria-hidden="true"
                                    name="website"
                                    style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
                                />
                                <span style={{ ...label, fontFamily: SERIF, fontStyle: "italic", fontSize: 13, letterSpacing: 0 }}>
                                    {msg.length}/60
                                </span>
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="yl-ul"
                                    style={{ fontSize: 13, letterSpacing: "0.16em", opacity: sending ? 0.4 : 1 }}
                                >
                                    添える
                                </button>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", minHeight: 18 }}>
                                <span style={{ ...label, letterSpacing: "0.06em" }} role="status">
                                    {note}
                                </span>
                                <button type="button" onClick={() => setForm(false)} style={{ ...label }}>
                                    閉じる
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* side button: all words */}
            <button
                onClick={() => setPanel("all")}
                aria-label={`すべての言葉を見る（${count}）`}
                style={{
                    position: "absolute",
                    right: narrow ? 8 : 24,
                    top: "50%",
                    transform: "translateY(-50%)",
                    writingMode: "vertical-rl",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "10px 6px",
                    zIndex: 3,
                    fontSize: 12,
                    letterSpacing: "0.24em",
                }}
            >
                <span className="yl-ul">すべての言葉</span>
                <span style={{ display: "inline-block", width: 1, height: 28, background: ink }} />
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, letterSpacing: 0, writingMode: "horizontal-tb" }}>
                    {count}
                </span>
            </button>

            {/* bottom note */}
            <div
                style={{
                    position: "absolute",
                    bottom: narrow ? 20 : 36,
                    left: narrow ? 20 : 48,
                    right: narrow ? 20 : 48,
                    display: "flex",
                    justifyContent: "space-between",
                    ...label,
                    zIndex: 2,
                    pointerEvents: "none",
                }}
            >
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, letterSpacing: "0.02em" }}>
                    A question for this month
                </span>
            </div>

            {/* panels */}
            <div
                onClick={() => setPanel(null)}
                style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 9,
                    background: paper,
                    opacity: panel ? 0.72 : 0,
                    pointerEvents: panel ? "auto" : "none",
                    transition: "opacity .8s ease",
                }}
            />
            <Panel open={panel === "all"} narrow={narrow} paper={paper} ink={ink} line={line} onClose={() => setPanel(null)}>
                <AllWords answers={answers} question={question} ink={ink} mute={mute} line={line} onLike={toggleLike} />
            </Panel>
            <Panel open={panel === "archive"} narrow={narrow} paper={paper} ink={ink} line={line} onClose={() => setPanel(null)} wide>
                <Archive items={archive} ink={ink} mute={mute} line={line} />
            </Panel>
        </div>
    )
}

/* ───────────────────────── parts ───────────────────────── */

function Heart({ on, ink }: { on: boolean; ink: string }) {
    return (
        <svg width="11" height="10" viewBox="0 0 12 11" aria-hidden="true" style={{ display: "block" }}>
            <path
                d="M6 10.2 1.6 5.9A2.7 2.7 0 0 1 6 2.3a2.7 2.7 0 0 1 4.4 3.6Z"
                fill={on ? ink : "none"}
                stroke={ink}
                strokeWidth="0.9"
                strokeLinejoin="round"
                style={{ transition: "fill .4s ease" }}
            />
        </svg>
    )
}

function LikeButton({ a, ink, mute, onLike }: { a: Answer; ink: string; mute: string; onLike: () => void }) {
    if (a.pending) return <span style={{ fontSize: 10, color: mute, letterSpacing: "0.08em" }}>確認中</span>
    return (
        <button
            onClick={(e) => {
                e.stopPropagation()
                onLike()
            }}
            aria-pressed={a.liked}
            aria-label={`いいね ${a.likes}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 2px" }}
        >
            <Heart on={a.liked} ink={ink} />
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, lineHeight: 1, color: a.liked ? ink : mute, minWidth: 10 }}>
                {a.likes}
            </span>
        </button>
    )
}

function Word({ a, ink, mute, narrow, onLike }: { a: Answer; ink: string; mute: string; narrow: boolean; onLike: () => void }) {
    return (
        <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: MINCHO, fontSize: narrow ? 13 : 15, lineHeight: 1.75, letterSpacing: "0.04em", color: ink }}>
                {a.body}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: mute, letterSpacing: "0.08em" }}>— {a.nickname}</span>
                <LikeButton a={a} ink={ink} mute={mute} onLike={onLike} />
            </div>
        </div>
    )
}

function Panel({ open, narrow, wide = false, paper, ink, line, onClose, children }: any) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-hidden={!open}
            data-lenis-prevent
            className="yl-scroll"
            style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                width: narrow ? "100%" : wide ? "min(640px, 56%)" : "min(460px, 40%)",
                background: paper,
                borderLeft: narrow ? "none" : `1px solid ${line}`,
                zIndex: 10,
                transform: open ? "translateX(0)" : "translateX(100%)",
                visibility: open ? "visible" : "hidden",
                transition: open
                    ? "transform .8s cubic-bezier(.2,.7,.2,1), visibility 0s"
                    : "transform .6s cubic-bezier(.6,0,.8,.4), visibility 0s .6s",
                overflowY: "auto",
                overscrollBehavior: "contain",
                padding: narrow ? "72px 24px 48px" : "96px 48px 64px",
            }}
        >
            <button
                onClick={onClose}
                style={{
                    position: "absolute",
                    top: narrow ? 22 : 38,
                    right: narrow ? 20 : 40,
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    color: ink,
                }}
                className="yl-ul"
            >
                閉じる
            </button>
            {open && children}
        </div>
    )
}

function AllWords({ answers, question, ink, mute, line, onLike }) {
    const [order, setOrder] = useState<"likes" | "new">("likes")
    const list = useMemo(() => {
        const l = answers.slice()
        if (order === "likes") l.sort((a, b) => b.likes - a.likes || (b.createdAt || "").localeCompare(a.createdAt || ""))
        else l.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
        return l
    }, [answers, order])
    const tab = (k: "likes" | "new", t: string) => (
        <button
            onClick={() => setOrder(k)}
            style={{ fontSize: 11, letterSpacing: "0.14em", color: order === k ? ink : mute, borderBottom: `1px solid ${order === k ? ink : "transparent"}`, paddingBottom: 3 }}
        >
            {t}
        </button>
    )
    return (
        <div style={{ animation: "ylFade .8s ease" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.14em", color: mute }}>すべての言葉</div>
            <div style={{ fontFamily: MINCHO, fontSize: 20, lineHeight: 1.7, letterSpacing: "0.06em", margin: "14px 0 28px" }}>
                {question?.body}
            </div>
            <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
                {tab("likes", "いいね順")}
                {tab("new", "新しい順")}
            </div>
            {list.length === 0 && (
                <p style={{ fontFamily: MINCHO, fontSize: 14, color: mute, lineHeight: 2, marginTop: 32 }}>
                    まだ、どなたの言葉もありません。
                    <br />
                    最初のひとことを、お待ちしています。
                </p>
            )}
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {list.map((a, i) => (
                    <li
                        key={a.id}
                        style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 12, alignItems: "baseline", padding: "18px 0", borderBottom: `1px solid ${line}` }}
                    >
                        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: mute }}>
                            {order === "likes" ? String(i + 1).padStart(2, "0") : ""}
                        </span>
                        <div>
                            <div style={{ fontFamily: MINCHO, fontSize: 15, lineHeight: 1.8, letterSpacing: "0.04em" }}>{a.body}</div>
                            <div style={{ fontSize: 11, color: mute, letterSpacing: "0.08em", marginTop: 2 }}>— {a.nickname}</div>
                        </div>
                        <LikeButton a={a} ink={ink} mute={mute} onLike={() => onLike(a.id)} />
                    </li>
                ))}
            </ol>
        </div>
    )
}

function Archive({ items, ink, mute, line }: { items: ArchiveItem[] | null; ink: string; mute: string; line: string }) {
    if (!items) return <div style={{ fontSize: 11, letterSpacing: "0.14em", color: mute }}>…</div>
    return (
        <div style={{ animation: "ylFade .8s ease" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.14em", color: mute }}>これまでの問い</div>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 28, margin: "10px 0 36px", color: ink }}>Archive</div>
            {items.length === 0 && (
                <p style={{ fontFamily: MINCHO, fontSize: 14, color: mute, lineHeight: 2 }}>
                    最初のひと月が、いま始まったところです。
                    <br />
                    月がかわると、ここに言葉が積もっていきます。
                </p>
            )}
            {items.map((it) => (
                <section key={it.month} style={{ padding: "28px 0 32px", borderTop: `1px solid ${line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18 }}>{fmtMonth(it.month)}</span>
                        <span style={{ fontSize: 11, color: mute, letterSpacing: "0.08em" }}>{it.total} の言葉</span>
                    </div>
                    <div style={{ fontFamily: MINCHO, fontSize: 19, lineHeight: 1.7, letterSpacing: "0.06em", margin: "12px 0 20px" }}>{it.body}</div>
                    <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {it.top.map((t, i) => (
                            <li key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 12, alignItems: "baseline", padding: "10px 0" }}>
                                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, color: mute }}>{["i.", "ii.", "iii.", "iv.", "v."][i] || `${i + 1}.`}</span>
                                <div>
                                    <span style={{ fontFamily: MINCHO, fontSize: 15, lineHeight: 1.8 }}>{t.body}</span>
                                    <span style={{ fontSize: 11, color: mute, marginLeft: 10 }}>— {t.nickname}</span>
                                </div>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    <Heart on ink={ink} />
                                    <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14 }}>{t.likes}</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </section>
            ))}
        </div>
    )
}

YohakuQuestion.defaultProps = {
    supabaseUrl: "",
    supabaseKey: "",
    fallbackQuestion: "あなたが最近美しいと感じたものや瞬間は？",
    paper: "#F7F7F5",
    ink: "#111111",
    mute: "#8C8B87",
    line: "rgba(17,17,17,0.12)",
}

addPropertyControls(YohakuQuestion, {
    supabaseUrl: { type: ControlType.String, title: "Supabase URL", placeholder: "https://xxxx.supabase.co" },
    supabaseKey: { type: ControlType.String, title: "Public Key", placeholder: "sb_publishable_… / anon key" },
    fallbackQuestion: {
        type: ControlType.String,
        title: "Question",
        displayTextArea: true,
        description: "Supabase 未設定のとき（プレビュー）に表示する問い。設定後は Supabase の yl_questions が優先されます。",
    },
    paper: { type: ControlType.Color, title: "Paper" },
    ink: { type: ControlType.Color, title: "Ink" },
    mute: { type: ControlType.Color, title: "Mute" },
    line: { type: ControlType.Color, title: "Line" },
})

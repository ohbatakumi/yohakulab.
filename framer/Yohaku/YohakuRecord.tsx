import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { getBGM } from "./YohakuSound.tsx"

/**
 * 一枚 — 余白に置かれたレコード。
 *
 * ジャケットと、透明なビニールに入った盤がふたつ並んでいる。
 * 触れると盤が袋からすべり出て、ゆっくり回りはじめ、サイトの音（BGM）が鳴る。
 * もう一度触れると、惰性でゆるやかに止まり、袋に戻る。
 *
 * 音は右下の Sound と同じものを使う（window.__yohakuBGM）。
 * Sound で止めれば盤も止まり、オープニングで「音とともに」を選んだ人には、
 * はじめから回っている盤が待っている。
 *
 * 動きを減らす設定の人には、回転もすべりもなく、位置だけが静かに入れ替わる。
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */

const MINCHO = `"Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif`
const SANS = `"Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic", sans-serif`
const SERIF = `"Instrument Serif", "Cormorant Garamond", Georgia, serif`

const JACKET = "https://framerusercontent.com/images/dwVjnCSeRTyk8TXUPR3KzUEuwIg.webp"
const DISC = "https://framerusercontent.com/images/89NFjoDAUiNAnGxvvlNTVmMFEw.webp"
const SHEEN = "https://framerusercontent.com/images/akRjAIn9Eqv7BXyr7iJuXQPGbkY.webp"

const DISC_RATIO = 0.962 // 袋に対する盤の大きさ

type Layout = {
    narrow: boolean
    s: number // ジャケットと袋の一辺
    jx: number
    jy: number
    sx: number
    sy: number
    ox: number // 盤がすべり出る量
    oy: number
}

function layoutFor(W: number, H: number): Layout {
    const narrow = W < 720
    if (narrow) {
        // 縦に、少しずらして重ねる。盤は袋の下からすべり出る
        const s = Math.max(120, Math.min(W * 0.46, (H - 150) / 2.44, 300))
        const total = 2.44 * s
        const top = Math.max(56, (H - 80 - total) / 2)
        const left = (W - (s * 1.84)) / 2
        return { narrow, s, jx: left, jy: top, sx: left + s * 0.84, sy: top + s * 0.86, ox: 0, oy: s * 0.58 }
    }
    const s = Math.max(160, Math.min(W * 0.24, H * 0.5, 380))
    const gap = s * 0.18
    // しずかなときの二つを中央に。盤は右の余白へ出ていく
    const left = (W - (2 * s + gap)) / 2
    const top = (H - s) / 2 - Math.min(24, H * 0.03)
    return { narrow, s, jx: left, jy: top, sx: left + s + gap, sy: top, ox: s * 0.62, oy: 0 }
}

function useReducedMotion() {
    const [r, setR] = useState(false)
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return
        const m = window.matchMedia("(prefers-reduced-motion: reduce)")
        const on = () => setR(m.matches)
        on()
        m.addEventListener ? m.addEventListener("change", on) : m.addListener(on)
        return () => (m.removeEventListener ? m.removeEventListener("change", on) : m.removeListener(on))
    }, [])
    return r
}

export default function YohakuRecord(props) {
    const {
        jacket = JACKET,
        disc = DISC,
        sheen = SHEEN,
        title = "Yoru no Mori",
        titleJa = "夜の森",
        hintIdle = "触れると、回りはじめます",
        hintPlaying = "もう一度触れると、止まります",
        rpm = 33.3,
        sound,
        paper = "#F7F7F5",
        ink = "#111111",
        mute = "#8C8B87",
        style,
    } = props

    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const bgm = isCanvas ? null : getBGM()
    const reduced = useReducedMotion()

    const rootRef = useRef<HTMLDivElement>(null)
    const discRef = useRef<HTMLDivElement>(null)
    const rotorRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState({ w: 1200, h: 800 })
    const [playing, setPlaying] = useState(bgm ? bgm.state.playing : false)
    const [hover, setHover] = useState(false)

    // 大きさ
    useLayoutEffect(() => {
        const el = rootRef.current
        if (!el) return
        const set = () => setSize({ w: el.clientWidth || 1200, h: el.clientHeight || 800 })
        set()
        if (typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver(set)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    // 音とつなぐ
    useEffect(() => {
        if (!bgm) return
        if (sound) bgm.setSource(sound)
        setPlaying(bgm.state.playing)
        return bgm.subscribe((s) => setPlaying(s.playing))
    }, [sound])

    const L = layoutFor(size.w, size.h)

    // 動き: すべり出し（out 0..1）と回転（角速度 v °/s）を、惰性のある数値で追いかける
    const sim = useRef({ out: 0, v: 0, a: 0, peek: 0, raf: 0, last: 0, visible: true })
    const want = useRef({ playing, hover, reduced, L })
    want.current = { playing, hover, reduced, L }

    const paint = () => {
        const st = sim.current
        const { L } = want.current
        const k = st.out + st.peek * (1 - st.out)
        if (discRef.current) discRef.current.style.transform = `translate3d(${(L.ox * k).toFixed(2)}px, ${(L.oy * k).toFixed(2)}px, 0)`
        if (rotorRef.current) rotorRef.current.style.transform = `rotate(${st.a.toFixed(2)}deg)`
    }

    const kick = () => {
        const st = sim.current
        if (st.raf || typeof window === "undefined") return
        st.last = performance.now()
        const step = (now: number) => {
            const dt = Math.min(0.05, (now - st.last) / 1000)
            st.last = now
            const { playing, hover, reduced } = want.current
            const peekTarget = hover && !playing && !reduced ? 0.07 : 0
            if (reduced) {
                st.out = playing ? 1 : 0
                st.v = 0
                st.peek = 0
            } else {
                // 止めるときは、回転がほぼ止まってから袋に戻す
                const outTarget = playing || st.v > 6 ? 1 : 0
                const outRate = outTarget ? 2.6 : 2.1
                st.out += (outTarget - st.out) * (1 - Math.exp(-dt * outRate))
                const vTarget = playing && st.out > 0.72 ? rpm * 6 : 0
                const vRate = vTarget > st.v ? 0.9 : 1.15
                st.v += (vTarget - st.v) * (1 - Math.exp(-dt * vRate))
                if (!playing && st.v < 0.4) st.v = 0
                st.a = (st.a + st.v * dt) % 360
                st.peek += (peekTarget - st.peek) * (1 - Math.exp(-dt * 6))
            }
            paint()
            const settled =
                st.v === 0 &&
                Math.abs((playing ? 1 : 0) - st.out) < 0.001 &&
                Math.abs(peekTarget - st.peek) < 0.001
            // 画面の外では回し続けない（角度は覚えておく）
            if ((settled && !playing) || !st.visible || (reduced && settled)) {
                if (settled) {
                    st.out = playing ? 1 : 0
                    paint()
                }
                st.raf = 0
                return
            }
            st.raf = requestAnimationFrame(step)
        }
        st.raf = requestAnimationFrame(step)
    }

    useEffect(() => {
        if (isCanvas) return
        kick()
    }, [playing, hover, reduced, L.ox, L.oy])

    useEffect(() => {
        if (isCanvas || !rootRef.current || typeof IntersectionObserver === "undefined") return
        const io = new IntersectionObserver(([e]) => {
            sim.current.visible = e.isIntersecting
            if (e.isIntersecting) kick()
        })
        io.observe(rootRef.current)
        return () => {
            io.disconnect()
            cancelAnimationFrame(sim.current.raf)
            sim.current.raf = 0
        }
    }, [])

    // キャンバスでは盤を少し出して、どう見えるかが分かるようにする
    useLayoutEffect(() => {
        if (isCanvas) {
            sim.current.out = 0.55
            sim.current.a = 0
        }
        paint()
    })

    const toggle = () => {
        if (!bgm) return
        bgm.toggle()
    }

    const discSize = L.s * DISC_RATIO
    const inset = (L.s - discSize) / 2
    // ビニールの口: 横並びなら右、縦なら下
    const sleeveBorder = `1px solid color-mix(in srgb, ${ink} 9%, transparent)`
    const sleeveOpen = `1px solid color-mix(in srgb, ${ink} 4%, transparent)`

    const css = `
    .yl-rec * { box-sizing: border-box }
    .yl-rec .yl-rec-btn { appearance: none; -webkit-appearance: none; background: none; border: 0; padding: 0; margin: 0; cursor: pointer; color: inherit; font: inherit; -webkit-tap-highlight-color: transparent }
    .yl-rec .yl-rec-btn:focus-visible { outline: 1px solid ${ink}; outline-offset: 10px }
    .yl-rec .yl-rec-hint { transition: opacity .9s ease }
    `

    const label: React.CSSProperties = { fontFamily: SANS, fontSize: 11, letterSpacing: "0.14em", color: mute }

    return (
        <div
            ref={rootRef}
            className="yl-rec"
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                minHeight: 520,
                background: paper,
                color: ink,
                overflow: "hidden",
                fontFamily: SANS,
            }}
        >
            <style>{css}</style>

            {/* ジャケット */}
            <img
                src={jacket}
                alt={`${titleJa}のジャケット`}
                draggable={false}
                onClick={toggle}
                style={{
                    position: "absolute",
                    cursor: "pointer",
                    left: L.jx,
                    top: L.jy,
                    width: L.s,
                    height: L.s,
                    objectFit: "cover",
                    display: "block",
                    userSelect: "none",
                    zIndex: 1,
                }}
            />

            {/* 盤とビニール。全体がひとつのボタン */}
            <button
                type="button"
                className="yl-rec-btn"
                aria-pressed={playing}
                aria-label={playing ? `${titleJa}を止める` : `${titleJa}を回す（音が鳴ります）`}
                onClick={toggle}
                onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
                onPointerLeave={() => setHover(false)}
                style={{
                    position: "absolute",
                    left: L.sx,
                    top: L.sy,
                    width: L.s + L.ox,
                    height: L.s + L.oy,
                    zIndex: 2,
                }}
            >
                {/* 盤（すべる層 → 回る層 + 動かない光） */}
                <div
                    ref={discRef}
                    style={{
                        position: "absolute",
                        left: inset,
                        top: inset,
                        width: discSize,
                        height: discSize,
                        willChange: "transform",
                    }}
                >
                    <div
                        ref={rotorRef}
                        style={{
                            position: "absolute",
                            inset: 0,
                            backgroundImage: `url(${disc})`,
                            backgroundSize: "100% 100%",
                            borderRadius: "50%",
                            willChange: "transform",
                        }}
                    />
                    <div
                        aria-hidden
                        style={{
                            position: "absolute",
                            inset: 0,
                            backgroundImage: `url(${sheen})`,
                            backgroundSize: "100% 100%",
                            opacity: 0.85,
                            pointerEvents: "none",
                        }}
                    />
                </div>

                {/* 透明なビニール */}
                <div
                    aria-hidden
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: L.s,
                        height: L.s,
                        borderTop: sleeveBorder,
                        borderLeft: sleeveBorder,
                        borderRight: L.narrow ? sleeveBorder : sleeveOpen,
                        borderBottom: L.narrow ? sleeveOpen : sleeveBorder,
                        borderRadius: 2,
                        backgroundImage: [
                            "linear-gradient(116deg, rgba(255,255,255,0) 14%, rgba(255,255,255,.30) 21%, rgba(255,255,255,.06) 26%, rgba(255,255,255,0) 31%)",
                            "linear-gradient(116deg, rgba(255,255,255,0) 56%, rgba(255,255,255,.16) 62%, rgba(255,255,255,0) 69%)",
                            "linear-gradient(28deg, rgba(255,255,255,0) 70%, rgba(255,255,255,.12) 78%, rgba(255,255,255,0) 86%)",
                            `linear-gradient(color-mix(in srgb, ${ink} 3%, transparent), color-mix(in srgb, ${ink} 3%, transparent))`,
                        ].join(","),
                        boxShadow: `inset 0 0 0 3px rgba(255,255,255,.22), inset 0 0 0 4px color-mix(in srgb, ${ink} 4%, transparent)`,
                        pointerEvents: "none",
                    }}
                />
            </button>

            {/* ひとこと: 盤の下に。右下の Sound と重ならないように */}
            <div
                aria-live="polite"
                style={{
                    ...label,
                    position: "absolute",
                    top: L.narrow ? L.jy + L.s * 2.44 + 14 : L.sy + L.s + 22,
                    ...(L.narrow ? { right: size.w - (L.sx + L.s), textAlign: "right" } : { left: L.sx }),
                    whiteSpace: "nowrap",
                    zIndex: 3,
                }}
            >
                <span className="yl-rec-hint" aria-hidden={playing || undefined} style={{ opacity: playing ? 0 : 1, display: "inline-block" }}>
                    {hintIdle}
                </span>
                <span
                    className="yl-rec-hint"
                    aria-hidden={!playing || undefined}
                    style={{ opacity: playing ? 1 : 0, position: "absolute", top: 0, ...(L.narrow ? { right: 0 } : { left: 0 }) }}
                >
                    <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13, letterSpacing: 0, marginRight: 12, color: ink }}>33⅓</span>
                    {hintPlaying}
                </span>
            </div>

            {/* 下の一行 */}
            <div
                style={{
                    position: "absolute",
                    bottom: L.narrow ? 22 : 36,
                    left: L.narrow ? 20 : 48,
                    right: L.narrow ? 20 : 48,
                    display: "flex",
                    zIndex: 3,
                }}
            >
                <div style={label}>
                    {titleJa}
                    <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, letterSpacing: "0.02em", marginLeft: 12, color: ink }}>
                        {title}
                    </span>
                </div>
            </div>
        </div>
    )
}

YohakuRecord.displayName = "Yohaku Record"

addPropertyControls(YohakuRecord, {
    jacket: { type: ControlType.Image, title: "Jacket" },
    disc: { type: ControlType.Image, title: "Disc" },
    sheen: { type: ControlType.Image, title: "Disc Light" },
    titleJa: { type: ControlType.String, title: "Title (JA)", defaultValue: "夜の森" },
    title: { type: ControlType.String, title: "Title", defaultValue: "Yoru no Mori" },
    hintIdle: { type: ControlType.String, title: "Hint", defaultValue: "触れると、回りはじめます" },
    hintPlaying: { type: ControlType.String, title: "Hint Playing", defaultValue: "もう一度触れると、止まります" },
    rpm: { type: ControlType.Number, title: "RPM", defaultValue: 33.3, min: 5, max: 78, step: 0.1 },
    sound: { type: ControlType.File, title: "Sound", allowedFileTypes: ["mp3", "m4a", "aac", "wav"] },
    paper: { type: ControlType.Color, title: "Paper", defaultValue: "#F7F7F5" },
    ink: { type: ControlType.Color, title: "Ink", defaultValue: "#111111" },
    mute: { type: ControlType.Color, title: "Mute", defaultValue: "#8C8B87" },
})

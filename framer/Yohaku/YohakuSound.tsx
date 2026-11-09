import { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * 音 — 余白研究室のBGM。
 *
 * オープニングで「音とともに」を選んだ人にだけ鳴る。閲覧中はいつでも
 * 小さな波の線で止めたり鳴らしたりでき、細い線で音量を変えられる。
 *
 * - 音はページを移っても途切れない（window に一つだけ持つ）
 * - 曲の終わりと始まりは数秒かけて重ね、継ぎ目を聴かせない
 * - タブを離れると静まり、戻るとまた鳴る
 *
 * ページの右下などに Fixed で置き、Sound に mp3 を入れる。
 *
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */

// ---------------------------------------------------------------- store

type State = { playing: boolean; volume: number; pref: "on" | "off" | null; canVolume: boolean }
type BGM = {
    state: State
    /** このページの読み込みのあいだに、もう選ばれたか */
    chosen: boolean
    setSource: (url: string) => void
    choose: (on: boolean) => void
    play: () => void
    pause: () => void
    toggle: () => void
    setVolume: (v: number) => void
    subscribe: (fn: (s: State) => void) => () => void
}

const PREF_KEY = "yohaku-sound" // このセッションでの選択
const VOL_KEY = "yohaku-sound-volume" // 音量は次の訪問でも覚えておく
const XF = 6 // 曲の継ぎ目を重ねる秒数
const FADE_IN = 2.8
const FADE_OUT = 1.4

const read = (s: Storage | undefined, k: string) => {
    try {
        return s ? s.getItem(k) : null
    } catch (e) {
        return null
    }
}
const write = (s: Storage | undefined, k: string, v: string) => {
    try {
        s && s.setItem(k, v)
    } catch (e) {}
}

function createBGM(): BGM {
    const ss = typeof sessionStorage !== "undefined" ? sessionStorage : undefined
    const ls = typeof localStorage !== "undefined" ? localStorage : undefined
    const storedVol = parseFloat(read(ls, VOL_KEY) || "")
    const p = read(ss, PREF_KEY)
    const state: State = {
        playing: false,
        volume: isFinite(storedVol) ? Math.max(0, Math.min(1, storedVol)) : 0.6,
        pref: p === "on" || p === "off" ? p : null,
        canVolume: true,
    }
    const subs = new Set<(s: State) => void>()
    const emit = () => subs.forEach((f) => f({ ...state }))

    let url = ""
    let ctx: AudioContext | null = null
    let graph = false // Web Audio で音量を扱えるか
    type Track = { el: HTMLAudioElement; gain: GainNode | null; env: number; envTarget: number; envRate: number }
    let tracks: Track[] = []
    let active = 0
    let ramp = 0 // 再生・停止のフェード
    let rampTarget = 0
    let hidden = false
    let timer: any = 0
    let waitingGesture = false

    const makeTracks = (useCors: boolean) => {
        tracks.forEach((t) => {
            t.el.pause()
            t.el.removeAttribute("src")
            t.el.load()
        })
        tracks = []
        graph = false
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext
        if (useCors && AC) {
            try {
                ctx = ctx || new AC()
                graph = true
            } catch (e) {
                graph = false
            }
        }
        for (let i = 0; i < 2; i++) {
            const el = new Audio()
            el.preload = i === 0 ? "auto" : "none"
            if (graph) el.crossOrigin = "anonymous"
            ;(el as any).playsInline = true
            el.src = url
            let gain: GainNode | null = null
            if (graph && ctx) {
                try {
                    const src = ctx.createMediaElementSource(el)
                    gain = ctx.createGain()
                    gain.gain.value = 0
                    src.connect(gain).connect(ctx.destination)
                } catch (e) {}
            }
            if (graph && i === 0) {
                // 音源がCORSを許していなければ、Web Audio を使わずに作り直す
                el.addEventListener(
                    "error",
                    () => {
                        if (graph && tracks[0] && tracks[0].el === el) {
                            const was = rampTarget > 0
                            makeTracks(false)
                            if (was) startEl(tracks[0], 0)
                        }
                    },
                    { once: true }
                )
            }
            tracks.push({ el, gain, env: i === 0 ? 1 : 0, envTarget: i === 0 ? 1 : 0, envRate: 1 })
        }
        active = 0
        if (!graph) {
            // iOS は HTMLAudioElement の音量を変えられない
            const probe = tracks[0].el
            probe.volume = 0.5
            state.canVolume = Math.abs(probe.volume - 0.5) < 0.01
            probe.volume = 0
            if (!state.canVolume) probe.loop = true
        } else state.canVolume = true
    }

    const startEl = (t: Track, at: number) => {
        try {
            t.el.currentTime = at
        } catch (e) {}
        const pr = t.el.play()
        if (pr && pr.catch)
            pr.catch(() => {
                // 自動再生が止められた: 次に触れた瞬間に鳴らす
                if (rampTarget > 0) waitForGesture()
            })
    }

    const waitForGesture = () => {
        if (waitingGesture) return
        waitingGesture = true
        const go = () => {
            waitingGesture = false
            window.removeEventListener("pointerdown", go, true)
            window.removeEventListener("keydown", go, true)
            if (rampTarget > 0) play()
        }
        window.addEventListener("pointerdown", go, true)
        window.addEventListener("keydown", go, true)
    }

    const apply = () => {
        const master = state.volume * ramp * (hidden ? 0 : 1)
        tracks.forEach((t) => {
            const v = Math.max(0, Math.min(1, master * t.env * t.env))
            if (t.gain && ctx) t.gain.gain.setTargetAtTime(v, ctx.currentTime, 0.03)
            else if (state.canVolume) t.el.volume = v
        })
    }

    const tick = () => {
        const dt = 0.05
        const step = rampTarget > ramp ? dt / FADE_IN : dt / FADE_OUT
        ramp = rampTarget > ramp ? Math.min(rampTarget, ramp + step) : Math.max(rampTarget, ramp - step)

        // 継ぎ目を重ねる
        if (tracks.length === 2 && !tracks[0].el.loop && rampTarget > 0) {
            const a = tracks[active]
            const b = tracks[1 - active]
            const d = a.el.duration
            if (isFinite(d) && d > XF * 3 && d - a.el.currentTime < XF && b.envTarget === 0 && b.el.paused) {
                b.env = 0
                b.envTarget = 1
                b.envRate = 1 / XF
                a.envTarget = 0
                a.envRate = 1 / XF
                b.el.preload = "auto"
                startEl(b, 0)
                active = 1 - active
            }
        }
        tracks.forEach((t) => {
            if (t.env < t.envTarget) t.env = Math.min(t.envTarget, t.env + t.envRate * dt)
            else if (t.env > t.envTarget) t.env = Math.max(t.envTarget, t.env - t.envRate * dt)
            if (t !== tracks[active] && t.env === 0 && !t.el.paused) {
                t.el.pause()
                t.envTarget = 0
            }
        })
        apply()

        if (ramp === 0 && rampTarget === 0) {
            tracks.forEach((t) => t.el.pause())
            clearInterval(timer)
            timer = 0
        }
    }
    const run = () => {
        if (!timer) timer = setInterval(tick, 50)
    }

    const play = () => {
        if (!url) {
            state.playing = true
            emit()
            return
        }
        if (!tracks.length) makeTracks(true)
        if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {})
        rampTarget = 1
        const a = tracks[active]
        if (a.el.paused) {
            a.env = 1
            a.envTarget = 1
            startEl(a, a.el.currentTime || 0)
        }
        state.playing = true
        run()
        emit()
    }
    const pause = () => {
        rampTarget = 0
        state.playing = false
        run()
        emit()
    }

    if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", () => {
            hidden = document.hidden
            if (!hidden && state.playing && tracks[active] && tracks[active].el.paused) startEl(tracks[active], tracks[active].el.currentTime)
            if (state.playing || ramp > 0) run()
            if (hidden) setTimeout(() => document.hidden && tracks.forEach((t) => t.el.pause()), 600)
        })
    }

    return {
        state,
        chosen: false,
        setSource(u) {
            if (!u || u === url) return
            const was = state.playing
            url = u
            if (tracks.length) makeTracks(true)
            if (was) play()
        },
        choose(on) {
            this.chosen = true
            state.pref = on ? "on" : "off"
            write(ss, PREF_KEY, state.pref)
            on ? play() : pause()
        },
        play() {
            state.pref = "on"
            write(ss, PREF_KEY, "on")
            play()
        },
        pause() {
            state.pref = "off"
            write(ss, PREF_KEY, "off")
            pause()
        },
        toggle() {
            state.playing ? this.pause() : this.play()
        },
        setVolume(v) {
            state.volume = Math.max(0, Math.min(1, v))
            write(ls, VOL_KEY, String(state.volume))
            apply()
            emit()
        },
        subscribe(fn) {
            subs.add(fn)
            return () => subs.delete(fn)
        },
    }
}

/** オープニングなど、ほかの部品からも同じ音にさわるための入口 */
export function getBGM(): BGM | null {
    if (typeof window === "undefined") return null
    const w = window as any
    if (!w.__yohakuBGM) w.__yohakuBGM = createBGM()
    return w.__yohakuBGM
}

// ---------------------------------------------------------------- control

const STYLE_ID = "yohaku-sound-style"
const CSS = `
.ys-range{-webkit-appearance:none;appearance:none;background:transparent;width:100%;height:18px;margin:0;cursor:pointer;display:block}
.ys-range:focus{outline:none}
.ys-range::-webkit-slider-runnable-track{height:1px;background:linear-gradient(to right,currentColor var(--v),color-mix(in srgb,currentColor 30%,transparent) var(--v))}
.ys-range::-moz-range-track{height:1px;background:color-mix(in srgb,currentColor 30%,transparent)}
.ys-range::-moz-range-progress{height:1px;background:currentColor}
.ys-range::-webkit-slider-thumb{-webkit-appearance:none;width:7px;height:7px;border-radius:50%;background:currentColor;border:0;margin-top:-3px}
.ys-range::-moz-range-thumb{width:7px;height:7px;border-radius:50%;background:currentColor;border:0}
.ys-range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px color-mix(in srgb,currentColor 25%,transparent)}
.ys-btn:focus-visible{outline:1px solid currentColor;outline-offset:6px}
`

function useStyle() {
    useEffect(() => {
        if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return
        const s = document.createElement("style")
        s.id = STYLE_ID
        s.textContent = CSS
        document.head.appendChild(s)
    }, [])
}

export default function YohakuSound(props) {
    const { sound, labelOn, labelOff, color, blend = true, style } = props
    useStyle()
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const bgm = isCanvas ? null : getBGM()
    const [s, setS] = useState<State>(
        bgm ? { ...bgm.state } : { playing: isCanvas, volume: 0.6, pref: null, canVolume: true }
    )
    const [open, setOpen] = useState(isCanvas)
    const pathRef = useRef<SVGPathElement>(null)
    const amp = useRef(0)
    const hideTimer = useRef<any>(0)
    const hovering = useRef(false)

    useEffect(() => {
        if (!bgm) return
        const off = bgm.subscribe(setS)
        bgm.setSource(sound)
        // オープニングを見終えたあとの再読み込みなど: 選んだとおりにする
        let seen = false
        try {
            seen = sessionStorage.getItem("yohaku-opening-seen") === "1"
        } catch (e) {}
        if (bgm.state.pref === "on" && !bgm.state.playing && (seen || !document.querySelector("[data-yohaku-opening]")))
            bgm.play()
        else if (bgm.state.pref === "on" && bgm.state.playing) bgm.setSource(sound)
        setS({ ...bgm.state })
        return () => {
            off()
        }
    }, [sound])

    // 波の線: 鳴っているあいだだけ、音量に合わせてゆるく揺れる
    useEffect(() => {
        let raf = 0
        const W = 22
        const loop = (t: number) => {
            const target = s.playing ? 0.35 + 0.65 * s.volume : 0
            amp.current += (target - amp.current) * 0.06
            const a = amp.current * 3.4
            let d = ""
            for (let x = 0; x <= W; x += 1) {
                const y = 6 + Math.sin(x * 0.55 - t / 520) * a * Math.sin((x / W) * Math.PI)
                d += (x ? " L " : "M ") + x + " " + y.toFixed(2)
            }
            if (pathRef.current) pathRef.current.setAttribute("d", d)
            raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(raf)
    }, [s.playing, s.volume])

    // 白黒の反転で紙の上でも映像の上でも読めるように、Framer の Fixed の枠ごと重ねる
    const rootRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (isCanvas || !blend || !rootRef.current) return
        let el = rootRef.current.parentElement
        const touched: HTMLElement[] = []
        while (el && el !== document.body) {
            if (getComputedStyle(el).position === "fixed") {
                el.style.mixBlendMode = "difference"
                touched.push(el)
                break
            }
            el = el.parentElement
        }
        return () => touched.forEach((t) => (t.style.mixBlendMode = ""))
    }, [blend, isCanvas])

    const peek = (ms: number) => {
        clearTimeout(hideTimer.current)
        setOpen(true)
        hideTimer.current = setTimeout(() => !hovering.current && setOpen(false), ms)
    }

    const sans = `"Zen Kaku Gothic New", "Hiragino Sans", sans-serif`
    const serif = `"Instrument Serif", "Times New Roman", serif`
    const showSlider = open && s.canVolume

    return (
        <div
            ref={rootRef}
            role="group"
            aria-label="BGM"
            onPointerEnter={(e) => {
                if (e.pointerType === "mouse") {
                    hovering.current = true
                    clearTimeout(hideTimer.current)
                    setOpen(true)
                }
            }}
            onPointerLeave={(e) => {
                if (e.pointerType === "mouse") {
                    hovering.current = false
                    peek(900)
                }
            }}
            onFocus={() => {
                clearTimeout(hideTimer.current)
                setOpen(true)
            }}
            onBlur={() => peek(1200)}
            style={{
                ...style,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 14,
                color,
                mixBlendMode: blend ? "difference" : "normal",
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
            }}
        >
            <div
                style={{
                    width: showSlider ? 76 : 0,
                    opacity: showSlider ? 1 : 0,
                    overflow: "hidden",
                    transition: "width .6s cubic-bezier(.2,.7,.2,1), opacity .5s ease",
                    order: 0,
                }}
            >
                <input
                    className="ys-range"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(s.volume * 100)}
                    aria-label="音量"
                    tabIndex={showSlider ? 0 : -1}
                    onChange={(e) => {
                        const v = Number(e.currentTarget.value) / 100
                        bgm && bgm.setVolume(v)
                        if (bgm && v > 0 && !bgm.state.playing) bgm.play()
                        peek(2600)
                    }}
                    style={{ width: 76, color, ["--v" as any]: `${Math.round(s.volume * 100)}%` }}
                />
            </div>
            <button
                className="ys-btn"
                type="button"
                aria-pressed={s.playing}
                aria-label={s.playing ? "音をとめる" : "音を鳴らす"}
                onClick={(e) => {
                    bgm && bgm.toggle()
                    if ((e.nativeEvent as PointerEvent).pointerType !== "mouse") peek(3200)
                }}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "none",
                    border: 0,
                    padding: "10px 0",
                    margin: 0,
                    cursor: "pointer",
                    color: "inherit",
                }}
            >
                <svg width={22} height={12} viewBox="0 0 22 12" aria-hidden style={{ overflow: "visible", display: "block" }}>
                    <path ref={pathRef} d="M 0 6 L 22 6" stroke="currentColor" strokeWidth={1} fill="none" vectorEffect="non-scaling-stroke" />
                </svg>
                <span style={{ fontFamily: sans, fontSize: 11, letterSpacing: "0.14em", lineHeight: "16px" }}>音</span>
                <span
                    style={{
                        fontFamily: serif,
                        fontStyle: "italic",
                        fontSize: 14,
                        lineHeight: "16px",
                        minWidth: 26,
                        textAlign: "left",
                        opacity: s.playing ? 1 : 0.55,
                        transition: "opacity .5s ease",
                    }}
                >
                    {s.playing ? labelOn : labelOff}
                </span>
            </button>
        </div>
    )
}

YohakuSound.displayName = "Yohaku Sound"

addPropertyControls(YohakuSound, {
    sound: { type: ControlType.File, title: "Sound", allowedFileTypes: ["mp3", "m4a", "aac", "wav"] },
    labelOn: { type: ControlType.String, title: "Label on", defaultValue: "on" },
    labelOff: { type: ControlType.String, title: "Label off", defaultValue: "off" },
    color: { type: ControlType.Color, title: "Color", defaultValue: "#FFFFFF" },
    blend: { type: ControlType.Boolean, title: "Difference", defaultValue: true },
})

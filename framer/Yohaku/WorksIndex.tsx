import { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * 目録 — a typographic index. Hovering a line lets its image surface
 * beside the cursor, the only place where colour appears.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight auto
 */
export default function WorksIndex(props) {
    const { ink, mute, line, style } = props
    const items = [1, 2, 3, 4, 5, 6]
        .map((n) => ({
            title: props[`title${n}`],
            subtitle: props[`subtitle${n}`],
            note: props[`note${n}`],
            image: props[`image${n}`],
            link: props[`link${n}`],
        }))
        .filter((it) => it.title)
    const rootRef = useRef<HTMLDivElement>(null)
    const floatRef = useRef<HTMLDivElement>(null)
    const [active, setActive] = useState(-1)
    const [hover, setHover] = useState(true)
    const [w, setW] = useState(1200)
    const fine = hover && w >= 640
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    useEffect(() => {
        setHover(window.matchMedia("(hover: hover) and (pointer: fine)").matches)
        const el = rootRef.current
        if (!el) return
        const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    useEffect(() => {
        const root = rootRef.current
        const fl = floatRef.current
        if (!root || !fl || isCanvas || !fine) return
        const t = { x: 0, y: 0 }
        const c = { x: 0, y: 0, vx: 0 }
        let raf = 0
        const loop = () => {
            const px = c.x
            c.x += (t.x - c.x) * 0.12
            c.y += (t.y - c.y) * 0.12
            c.vx += (c.x - px - c.vx) * 0.2
            const rot = Math.max(-8, Math.min(8, c.vx * 0.35))
            fl.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) translate(-50%, -50%) rotate(${rot}deg)`
            raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
        const onMove = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            t.x = e.clientX - r.left
            t.y = e.clientY - r.top
        }
        root.addEventListener("pointermove", onMove)
        return () => {
            cancelAnimationFrame(raf)
            root.removeEventListener("pointermove", onMove)
        }
    }, [isCanvas, fine])

    const mincho = `"Shippori Mincho", "Hiragino Mincho ProN", serif`
    const sans = `"Zen Kaku Gothic New", "Hiragino Sans", sans-serif`
    const current = items[active]

    return (
        <div
            ref={rootRef}
            onPointerLeave={() => setActive(-1)}
            style={{ ...style, position: "relative", width: "100%", borderBottom: `1px solid ${line}` }}
        >
            {items.map((it, i) => {
                const dim = active !== -1 && active !== i
                const Tag: any = it.link ? "a" : "div"
                return (
                    <Tag
                        key={i}
                        href={it.link || undefined}
                        {...(/^https?:\/\//.test(it.link || "") ? { target: "_blank", rel: "noopener" } : {})}
                        onPointerEnter={() => setActive(i)}
                        style={{
                            display: "grid",
                            gridTemplateColumns: fine ? "64px 1fr auto" : "40px 1fr",
                            alignItems: "baseline",
                            columnGap: 16,
                            rowGap: 6,
                            padding: fine ? "30px 0 28px" : "22px 0 20px",
                            borderTop: `1px solid ${line}`,
                            color: ink,
                            textDecoration: "none",
                            opacity: dim ? 0.18 : 1,
                            transition: "opacity .6s cubic-bezier(.2,.7,.2,1)",
                            cursor: it.link ? "pointer" : "default",
                        }}
                    >
                        <span style={{ fontFamily: sans, fontSize: 11, letterSpacing: "0.1em", color: mute }}>
                            {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                            style={{
                                fontFamily: mincho,
                                fontSize: fine ? "clamp(28px, 4.2vw, 56px)" : 26,
                                lineHeight: 1.15,
                                letterSpacing: "0.02em",
                                transform: active === i && fine ? "translateX(14px)" : "none",
                                transition: "transform .7s cubic-bezier(.2,.7,.2,1)",
                            }}
                        >
                            {it.title}
                            {it.subtitle ? (
                                <span
                                    style={{
                                        fontFamily: `"Instrument Serif", serif`,
                                        fontStyle: "italic",
                                        fontSize: "0.5em",
                                        color: mute,
                                        marginLeft: "0.6em",
                                        letterSpacing: 0,
                                    }}
                                >
                                    {it.subtitle}
                                </span>
                            ) : null}
                        </span>
                        <span
                            style={{
                                fontFamily: sans,
                                fontSize: 11,
                                letterSpacing: "0.1em",
                                color: mute,
                                gridColumn: fine ? "auto" : "2",
                                textAlign: fine ? "right" : "left",
                            }}
                        >
                            {it.note}
                        </span>
                        {!fine && it.image?.src ? (
                            <img
                                src={it.image.src}
                                alt={it.image.alt || ""}
                                loading="lazy"
                                style={{ gridColumn: "2", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", marginTop: 12 }}
                            />
                        ) : null}
                    </Tag>
                )
            })}

            {fine ? (
                <div
                    ref={floatRef}
                    aria-hidden
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: 300,
                        aspectRatio: "4 / 5",
                        pointerEvents: "none",
                        zIndex: 2,
                        transform: "translate3d(-999px,-999px,0)",
                    }}
                >
                    {items.map((it, i) => (
                        <img
                            key={i}
                            src={it.image?.src}
                            alt=""
                            style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                opacity: active === i ? 1 : 0,
                                clipPath: active === i ? "inset(0% 0% 0% 0%)" : "inset(50% 0% 50% 0%)",
                                transition:
                                    "opacity .5s ease, clip-path .8s cubic-bezier(.2,.7,.2,1)",
                            }}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    )
}

WorksIndex.displayName = "Works Index"

const slot = (n: number, d: string[] = ["", "", ""]) => ({
    [`title${n}`]: { type: ControlType.String, title: `${n} Title`, defaultValue: d[0] },
    [`subtitle${n}`]: { type: ControlType.String, title: `${n} Subtitle`, defaultValue: d[1] },
    [`note${n}`]: { type: ControlType.String, title: `${n} Note`, defaultValue: d[2] },
    [`image${n}`]: { type: ControlType.ResponsiveImage, title: `${n} Image` },
    [`link${n}`]: { type: ControlType.Link, title: `${n} Link` },
})

addPropertyControls(WorksIndex, {
    ...slot(1, ["製品", "Our Products", "Objects"]),
    ...slot(2),
    ...slot(3),
    ...slot(4),
    ...slot(5),
    ...slot(6),
    ink: { type: ControlType.Color, title: "Ink", defaultValue: "#111111" },
    mute: { type: ControlType.Color, title: "Mute", defaultValue: "#8C8B87" },
    line: { type: ControlType.Color, title: "Line", defaultValue: "rgba(17,17,17,0.14)" },
})

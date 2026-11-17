import { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * 目録 — a typographic index. Hovering a line lets a small image
 * appear quietly at the end of that line, the only place where colour appears.
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

    // the small print rests at the end of the hovered line and glides between lines
    const rowRefs = useRef<(HTMLElement | null)[]>([])
    const [pos, setPos] = useState({ top: 0, h: 0 })
    useEffect(() => {
        const row = rowRefs.current[active]
        if (row) setPos({ top: row.offsetTop, h: row.offsetHeight })
    }, [active, w])

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
                        ref={(el) => (rowRefs.current[i] = el)}
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
                        right: 120,
                        top: pos.top + pos.h / 2,
                        width: 64,
                        aspectRatio: "4 / 5",
                        pointerEvents: "none",
                        zIndex: 2,
                        transform: "translateY(-50%)",
                        opacity: active === -1 ? 0 : 1,
                        transition: `top .7s cubic-bezier(.2,.7,.2,1)${active === -1 ? ", opacity .4s ease" : ", opacity .5s ease .1s"}`,
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
                                transition: "opacity .5s ease",
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

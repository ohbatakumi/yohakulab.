// Yohaku no Niwa GIN — purchase.
// A quiet line under the bottle. Before payment, one sheet asks for the date of birth
// (二十歳未満の者の飲酒防止に関する表示基準: 申込画面に年齢記載欄と表示), the delivery region,
// and a glance at the legal notice. Payment itself happens on Square's checkout link —
// one link per region, because a Square link carries one fixed shipping fee.
// A region with no fee is answered by email instead (overseas, special requests),
// and the same quiet letter form can be opened from under the button at any time.
import * as React from "react"
import { createPortal } from "react-dom"
import { addPropertyControls, ControlType, RenderTarget } from "framer"


// Framer hands colours over as "rgb(r, g, b)", so alpha is applied here rather than by appending hex digits.
function tint(c: string, hex: string) {
    const a = parseInt(hex, 16) / 255
    const m = String(c).match(/rgba?\(([^)]+)\)/)
    if (m) {
        const [r, g, b] = m[1].split(",").map((v) => parseFloat(v))
        return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`
    }
    if (/^#[0-9a-f]{6}$/i.test(c)) return c + hex
    return c
}

const FONT_HREF =
    "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Shippori+Mincho:wght@400&family=Zen+Kaku+Gothic+New:wght@400&display=swap"

const AGE_NOTICE = "20歳未満の者の飲酒は法律で禁止されています。"

function ensureFonts() {
    if (typeof document === "undefined") return
    if (document.querySelector("link[data-yohaku-purchase]")) return
    const l = document.createElement("link")
    l.rel = "stylesheet"
    l.href = FONT_HREF
    l.setAttribute("data-yohaku-purchase", "")
    document.head.appendChild(l)
}

type Props = {
    name: string
    accent: string
    spec: string
    price: string
    releaseAt: string
    releaseText: string
    soldOut: boolean
    previewOpen: boolean
    regionALabel: string
    regionAFee: string
    regionAUrl: string
    regionBLabel: string
    regionBFee: string
    regionBUrl: string
    regionCLabel: string
    regionCFee: string
    regionCUrl: string
    regionDLabel: string
    regionDFee: string
    regionDUrl: string
    contactEmail: string
    contactLabel: string
    contactHint: string
    legalHref: string
    paper: string
    ink: string
    mute: string
    style?: React.CSSProperties
}

const serif = `"Instrument Serif", "Shippori Mincho", serif`
const mincho = `"Shippori Mincho", serif`
const gothic = `"Zen Kaku Gothic New", sans-serif`

function ageOn(y: number, m: number, d: number, now: Date) {
    let age = now.getFullYear() - y
    const mm = now.getMonth() + 1
    if (mm < m || (mm === m && now.getDate() < d)) age -= 1
    return age
}

function validDate(y: number, m: number, d: number) {
    if (!y || !m || !d) return false
    const dt = new Date(y, m - 1, d)
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d && y > 1900
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export default function YohakuPurchase(props: Props) {
    const {
        name, accent, spec, price, releaseAt, releaseText, soldOut, previewOpen,
        regionALabel, regionAFee, regionAUrl, regionBLabel, regionBFee, regionBUrl,
        regionCLabel, regionCFee, regionCUrl, regionDLabel, regionDFee, regionDUrl,
        contactEmail, contactLabel, contactHint, legalHref, paper, ink, mute,
    } = props
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const hostRef = React.useRef<HTMLDivElement>(null)
    const [w, setW] = React.useState(1200)
    const [now, setNow] = React.useState<Date | null>(null)
    const [open, setOpen] = React.useState<null | "buy" | "contact">(null)

    React.useEffect(() => {
        ensureFonts()
        setNow(new Date())
        const el = hostRef.current
        if (!el) return
        const ro = new ResizeObserver(() => setW(el.getBoundingClientRect().width))
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const phone = w < 760
    const releaseTime = Date.parse(releaseAt)
    const released = previewOpen || (now !== null && !isNaN(releaseTime) && now.getTime() >= releaseTime)
    const canBuy = released && !soldOut

    let buttonText = "購入する"
    if (soldOut) buttonText = "完売いたしました"
    else if (!released) buttonText = releaseText

    return (
        <div
            ref={hostRef}
            style={{
                ...props.style,
                width: "100%",
                height: "100%",
                background: paper,
                color: ink,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: phone ? "72px 24px" : "96px 32px",
                boxSizing: "border-box",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    left: phone ? 24 : 40,
                    top: phone ? 32 : 48,
                    fontFamily: gothic,
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    color: mute,
                }}
            >
                (Purchase)
            </div>

            <div style={{ fontFamily: serif, fontWeight: 400, fontSize: phone ? 38 : 52, lineHeight: 1.05, letterSpacing: "-0.015em", textAlign: "center" }}>
                {name}
                {accent && <span style={{ fontStyle: "italic", marginLeft: "0.2em", letterSpacing: "0.015em" }}>{accent}</span>}
            </div>
            <div style={{ fontFamily: gothic, fontSize: 12, letterSpacing: "0.12em", color: mute, marginTop: 14 }}>{spec}</div>
            <div style={{ fontFamily: serif, fontSize: phone ? 22 : 26, marginTop: 28, letterSpacing: "0.04em" }}>
                {price ? (
                    <>
                        ¥{price}
                        <span style={{ fontFamily: gothic, fontSize: 11, color: mute, marginLeft: 8, letterSpacing: "0.1em" }}>税込・送料別</span>
                    </>
                ) : (
                    <span style={{ fontFamily: gothic, fontSize: 12, color: mute, letterSpacing: "0.12em" }}>価格は発売前にお知らせします</span>
                )}
            </div>

            <button
                type="button"
                disabled={!canBuy || isCanvas}
                onClick={() => canBuy && setOpen("buy")}
                style={{
                    marginTop: 40,
                    minWidth: phone ? 220 : 260,
                    padding: "16px 28px",
                    background: "transparent",
                    color: canBuy ? ink : mute,
                    border: `1px solid ${canBuy ? ink : mute}`,
                    borderRadius: 0,
                    fontFamily: canBuy ? mincho : serif,
                    fontStyle: canBuy ? "normal" : "italic",
                    fontSize: canBuy ? 15 : 18,
                    letterSpacing: canBuy ? "0.3em" : "0.06em",
                    cursor: canBuy ? "pointer" : "default",
                    transition: "background .4s ease, color .4s ease",
                }}
                onMouseEnter={(e) => {
                    if (!canBuy) return
                    e.currentTarget.style.background = ink
                    e.currentTarget.style.color = paper
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.color = canBuy ? ink : mute
                }}
            >
                {buttonText}
            </button>

            {contactEmail && contactLabel ? (
                <>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, width: phone ? 220 : 260, marginTop: 18, color: mute }}>
                        <span style={{ flex: 1, height: 1, background: tint(mute, "55") }} />
                        <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 15 }}>or</span>
                        <span style={{ flex: 1, height: 1, background: tint(mute, "55") }} />
                    </div>
                    <button
                        type="button"
                        disabled={isCanvas}
                        onClick={() => setOpen("contact")}
                        style={{
                            marginTop: 18,
                            minWidth: phone ? 220 : 260,
                            padding: "13px 28px",
                            background: "transparent",
                            color: ink,
                            border: `1px solid ${tint(mute, "88")}`,
                            borderRadius: 0,
                            fontFamily: mincho,
                            fontSize: 14,
                            letterSpacing: "0.24em",
                            cursor: "pointer",
                            transition: "border-color .4s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = ink)}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = tint(mute, "88"))}
                    >
                        {contactLabel}
                    </button>
                    {contactHint ? (
                        <div style={{ fontFamily: gothic, fontSize: 11, color: mute, letterSpacing: "0.1em", marginTop: 10, textAlign: "center", lineHeight: 1.8 }}>{contactHint}</div>
                    ) : null}
                </>
            ) : null}

            <div style={{ fontFamily: gothic, fontSize: 13, color: ink, marginTop: 32, letterSpacing: "0.06em", textAlign: "center" }}>
                {AGE_NOTICE}
            </div>
            <a
                href={legalHref}
                style={{ fontFamily: gothic, fontSize: 11, color: mute, marginTop: 12, letterSpacing: "0.1em", textDecoration: "none", borderBottom: `1px solid ${tint(mute, "55")}`, paddingBottom: 2 }}
            >
                特定商取引法に基づく表記・お届けについて
            </a>

            {open && typeof document !== "undefined"
                ? createPortal(
                      <Sheet
                          onClose={() => setOpen(null)}
                          startContact={open === "contact"}
                          email={contactEmail}
                          productName={[name, accent].filter(Boolean).join(" ")}
                          phone={phone}
                          regions={[
                              { label: regionALabel, fee: regionAFee, url: regionAUrl },
                              { label: regionBLabel, fee: regionBFee, url: regionBUrl },
                              { label: regionCLabel, fee: regionCFee, url: regionCUrl },
                              { label: regionDLabel, fee: regionDFee, url: regionDUrl },
                          ].filter((r) => r.label)}
                          legalHref={legalHref}
                          paper={paper}
                          ink={ink}
                          mute={mute}
                      />,
                      document.body
                  )
                : null}
        </div>
    )
}

type Region = { label: string; fee: string; url: string }

type SheetProps = {
    onClose: () => void
    startContact: boolean
    email: string
    productName: string
    phone: boolean
    regions: Region[]
    legalHref: string
    paper: string
    ink: string
    mute: string
}

function Sheet(p: SheetProps) {
    const { onClose, startContact, email, productName, phone, regions, legalHref, paper, ink, mute } = p
    const [mode, setMode] = React.useState<"buy" | "contact">(startContact ? "contact" : "buy")
    const [y, setY] = React.useState("")
    const [m, setM] = React.useState("")
    const [d, setD] = React.useState("")
    const [region, setRegion] = React.useState(-1)
    const [agreed, setAgreed] = React.useState(false)
    const [shown, setShown] = React.useState(false)
    const boxRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const t = requestAnimationFrame(() => setShown(true))
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
        window.addEventListener("keydown", onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            cancelAnimationFrame(t)
            window.removeEventListener("keydown", onKey)
            document.body.style.overflow = prev
        }
    }, [])

    React.useEffect(() => {
        if (boxRef.current) boxRef.current.scrollTop = 0
    }, [mode])

    const yn = parseInt(y, 10), mn = parseInt(m, 10), dn = parseInt(d, 10)
    const filled = y.length === 4 && m !== "" && d !== ""
    const valid = validDate(yn, mn, dn)
    const age = valid ? ageOn(yn, mn, dn, new Date()) : -1
    const adult = valid && age >= 20
    const under = valid && age < 20
    const chosen = region >= 0 ? regions[region] : undefined
    const byLetter = !!chosen && !chosen.fee && !!email
    const url = chosen?.url || ""
    const ready = adult && !!chosen && (byLetter || (agreed && !!url))

    let goText = "お支払いへ"
    if (byLetter) goText = "メールで相談する"
    else if (chosen && !url) goText = "準備中です"

    const input: React.CSSProperties = {
        width: "100%",
        boxSizing: "border-box",
        padding: "12px 0 8px",
        border: "none",
        borderBottom: `1px solid ${ink}`,
        background: "transparent",
        color: ink,
        fontFamily: serif,
        fontSize: 22,
        textAlign: "center",
        outline: "none",
        borderRadius: 0,
    }
    const small: React.CSSProperties = { fontFamily: gothic, fontSize: 11, color: mute, letterSpacing: "0.12em" }
    const digits = (v: string, n: number) => v.replace(/[^0-9０-９]/g, "").replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).slice(0, n)

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={mode === "buy" ? "ご購入の前に" : "メールでのご相談"}
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1000,
                background: "rgba(17,17,17,0.42)",
                display: "flex",
                alignItems: phone ? "flex-end" : "center",
                justifyContent: "center",
                opacity: shown ? 1 : 0,
                transition: "opacity .5s ease",
            }}
        >
            <div
                ref={boxRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: phone ? "100%" : 480,
                    maxHeight: phone ? "92vh" : "90vh",
                    overflowY: "auto",
                    background: paper,
                    color: ink,
                    padding: phone ? "40px 24px 32px" : "56px 56px 44px",
                    boxSizing: "border-box",
                    transform: shown ? "none" : phone ? "translateY(40px)" : "translateY(12px)",
                    transition: "transform .6s cubic-bezier(.2,.7,.2,1)",
                    position: "relative",
                }}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="閉じる"
                    style={{ position: "absolute", right: 20, top: 16, background: "none", border: "none", color: mute, fontFamily: serif, fontStyle: "italic", fontSize: 16, cursor: "pointer" }}
                >
                    close
                </button>

                {mode === "contact" ? (
                    <Letter
                        email={email}
                        productName={productName}
                        regionLabel={chosen && !chosen.fee ? chosen.label : ""}
                        birth={adult ? `${yn}年${mn}月${dn}日` : ""}
                        onBack={startContact ? null : () => setMode("buy")}
                        ink={ink}
                        mute={mute}
                        paper={paper}
                    />
                ) : (
                    <>
                        <div style={{ ...small, fontFamily: serif, fontStyle: "italic", fontSize: 15, letterSpacing: "0.04em" }}>(Before you buy)</div>
                        <div style={{ fontFamily: mincho, fontSize: 22, marginTop: 10, letterSpacing: "0.08em" }}>ご購入の前に</div>
                        <p style={{ fontFamily: gothic, fontSize: 13, lineHeight: 1.9, marginTop: 20, marginBottom: 0 }}>
                            20歳未満の方には、酒類を販売いたしません。
                            <br />
                            生年月日をご入力ください。
                        </p>

                        <div style={{ ...small, marginTop: 28 }}>生年月日（必須）</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1.6fr auto 1fr auto 1fr auto", alignItems: "end", gap: 8, marginTop: 4 }}>
                            <input aria-label="年" inputMode="numeric" placeholder="1990" value={y} onChange={(e) => setY(digits(e.target.value, 4))} style={input} />
                            <span style={small}>年</span>
                            <input aria-label="月" inputMode="numeric" placeholder="1" value={m} onChange={(e) => setM(digits(e.target.value, 2))} style={input} />
                            <span style={small}>月</span>
                            <input aria-label="日" inputMode="numeric" placeholder="1" value={d} onChange={(e) => setD(digits(e.target.value, 2))} style={input} />
                            <span style={small}>日</span>
                        </div>
                        <div style={{ fontFamily: gothic, fontSize: 13, marginTop: 14, letterSpacing: "0.04em" }}>{AGE_NOTICE}</div>
                        {filled && !valid ? <div style={{ ...small, marginTop: 8 }}>日付をご確認ください。</div> : null}
                        {under ? (
                            <div style={{ fontFamily: gothic, fontSize: 13, lineHeight: 1.9, marginTop: 16 }}>
                                申し訳ございません。
                                <br />
                                20歳未満の方にはお売りすることができません。
                            </div>
                        ) : null}

                        <div style={{ opacity: adult ? 1 : 0.35, pointerEvents: adult ? "auto" : "none", transition: "opacity .5s ease" }}>
                            <div style={{ ...small, marginTop: 32 }}>お届け先の地域</div>
                            <div style={{ marginTop: 6 }}>
                                {regions.map((r, i) => (
                                    <label
                                        key={i}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: 12,
                                            padding: "14px 0",
                                            borderBottom: `1px solid ${tint(mute, "44")}`,
                                            cursor: "pointer",
                                            fontFamily: gothic,
                                            fontSize: 13,
                                        }}
                                    >
                                        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <span
                                                style={{
                                                    flex: "none",
                                                    width: 11,
                                                    height: 11,
                                                    borderRadius: "50%",
                                                    border: `1px solid ${ink}`,
                                                    background: region === i ? ink : "transparent",
                                                    transition: "background .3s",
                                                }}
                                            />
                                            <input type="radio" name="yohaku-region" checked={region === i} onChange={() => setRegion(i)} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
                                            {r.label}
                                        </span>
                                        <span style={{ color: mute, fontSize: 12, whiteSpace: "nowrap" }}>
                                            {r.fee ? `送料 ¥${r.fee}` : <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 15 }}>by letter</span>}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            {byLetter ? (
                                <p style={{ fontFamily: gothic, fontSize: 12, lineHeight: 1.9, marginTop: 18, marginBottom: 0, wordBreak: "keep-all", overflowWrap: "anywhere" }}>
                                    この地域へは、お届けの方法と送料をメールでご案内しています。
                                    <br />
                                    国や地域によって、お酒を送れない場合もございます。
                                </p>
                            ) : (
                                <label style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 22, cursor: "pointer", fontFamily: gothic, fontSize: 12, lineHeight: 1.8 }}>
                                    <span
                                        style={{
                                            flex: "none",
                                            width: 11,
                                            height: 11,
                                            marginTop: 5,
                                            border: `1px solid ${ink}`,
                                            background: agreed ? ink : "transparent",
                                            transition: "background .3s",
                                        }}
                                    />
                                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
                                    <span>
                                        <a href={legalHref} target="_blank" rel="noopener" style={{ color: ink }}>
                                            特定商取引法に基づく表記
                                        </a>
                                        （お届け・返品・取消について）を確認しました。
                                    </span>
                                </label>
                            )}
                        </div>

                        <button
                            type="button"
                            disabled={!ready}
                            onClick={() => {
                                if (!ready) return
                                if (byLetter) setMode("contact")
                                else if (url) window.location.href = url
                            }}
                            style={{
                                width: "100%",
                                marginTop: 32,
                                padding: "17px 0",
                                background: ready ? ink : "transparent",
                                color: ready ? paper : mute,
                                border: `1px solid ${ready ? ink : tint(mute, "88")}`,
                                borderRadius: 0,
                                fontFamily: mincho,
                                fontSize: 15,
                                letterSpacing: "0.3em",
                                cursor: ready ? "pointer" : "default",
                                transition: "background .4s, color .4s",
                            }}
                        >
                            {goText}
                        </button>
                        <div style={{ ...small, marginTop: 14, lineHeight: 1.8, textAlign: "center" }}>
                            {byLetter ? "お返事まで、少しお時間をいただくことがあります。" : "ご住所とお支払いは、Square の画面でご入力いただきます。"}
                        </div>
                        {email && !byLetter ? (
                            <div style={{ textAlign: "center", marginTop: 22 }}>
                                <button
                                    type="button"
                                    onClick={() => setMode("contact")}
                                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: ink, fontFamily: gothic, fontSize: 12, letterSpacing: "0.08em" }}
                                >
                                    <span style={{ color: mute }}>ギフトや本数のご相談は　</span>
                                    <span style={{ borderBottom: `1px solid ${tint(ink, "55")}`, paddingBottom: 2 }}>メールでも承ります</span>
                                </button>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    )
}

// A short letter instead of a form: it opens the visitor's own mail app, already written.
// No server, nothing stored on the site. The address stays visible to copy, in case no mail app opens.
function Letter(p: {
    email: string
    productName: string
    regionLabel: string
    birth: string
    onBack: null | (() => void)
    ink: string
    mute: string
    paper: string
}) {
    const { email, productName, regionLabel, birth, onBack, ink, mute, paper } = p
    const [name, setName] = React.useState("")
    const [place, setPlace] = React.useState("")
    const [count, setCount] = React.useState("1")
    const [note, setNote] = React.useState("")
    const [copied, setCopied] = React.useState(false)
    const [sent, setSent] = React.useState(false)

    const field: React.CSSProperties = {
        width: "100%",
        boxSizing: "border-box",
        padding: "10px 0 8px",
        border: "none",
        borderBottom: `1px solid ${ink}`,
        background: "transparent",
        color: ink,
        fontFamily: gothic,
        fontSize: 15,
        outline: "none",
        borderRadius: 0,
    }
    const small: React.CSSProperties = { fontFamily: gothic, fontSize: 11, color: mute, letterSpacing: "0.12em", display: "block", marginTop: 24 }

    const subject = `${productName} — ご相談`
    const lines = [
        "余白研究室 御中",
        "",
        `お名前：${name}`,
        `お届け先（国・地域）：${place || regionLabel}`,
        `本数：${count}`,
        birth ? `生年月日：${birth}` : "生年月日：",
        "",
        note,
        "",
    ]
    const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(email)
            setCopied(true)
            setTimeout(() => setCopied(false), 2400)
        } catch (e) {}
    }

    return (
        <div>
            {onBack ? (
                <button
                    type="button"
                    onClick={onBack}
                    style={{ position: "absolute", left: 20, top: 16, background: "none", border: "none", color: mute, fontFamily: serif, fontStyle: "italic", fontSize: 16, cursor: "pointer", padding: 0 }}
                >
                    ← back
                </button>
            ) : null}
            <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 15, color: mute, letterSpacing: "0.04em", marginTop: onBack ? 12 : 0 }}>(Write to us)</div>
            <div style={{ fontFamily: mincho, fontSize: 22, marginTop: 10, letterSpacing: "0.08em" }}>メールでのご相談</div>
            <p style={{ fontFamily: gothic, fontSize: 13, lineHeight: 1.95, marginTop: 20, marginBottom: 0, wordBreak: "keep-all", overflowWrap: "anywhere" }}>
                贈りもの、まとまった本数のご注文、お届けのご相談など。
                <br />
                ご希望をそのまま、お聞かせください。
            </p>

            <label style={small} htmlFor="yl-name">お名前</label>
            <input id="yl-name" value={name} onChange={(e) => setName(e.target.value)} style={field} autoComplete="name" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 88px", gap: 20 }}>
                <div>
                    <label style={small} htmlFor="yl-place">お届け先（国・地域）</label>
                    <input id="yl-place" value={place} placeholder={regionLabel || "例 東京都"} onChange={(e) => setPlace(e.target.value)} style={field} />
                </div>
                <div>
                    <label style={small} htmlFor="yl-count">本数</label>
                    <input id="yl-count" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/[^0-9０-９]/g, "").slice(0, 3))} style={{ ...field, textAlign: "center", fontFamily: serif, fontSize: 20 }} />
                </div>
            </div>

            <label style={small} htmlFor="yl-note">ご用件</label>
            <textarea
                id="yl-note"
                value={note}
                rows={3}
                placeholder="お届けの時期、のし・メッセージカードのご希望など"
                onChange={(e) => setNote(e.target.value)}
                style={{ ...field, resize: "none", lineHeight: 1.8, fontSize: 14 }}
            />

            <a
                href={href}
                onClick={() => setSent(true)}
                style={{
                    display: "block",
                    textAlign: "center",
                    marginTop: 32,
                    padding: "17px 0",
                    background: ink,
                    color: paper,
                    border: `1px solid ${ink}`,
                    fontFamily: mincho,
                    fontSize: 15,
                    letterSpacing: "0.3em",
                    textDecoration: "none",
                }}
            >
                メールを書く
            </a>
            <div style={{ fontFamily: gothic, fontSize: 11, color: mute, letterSpacing: "0.1em", lineHeight: 1.9, marginTop: 14, textAlign: "center" }}>
                {sent ? "メールの画面が開かない場合は、下のアドレスへ直接どうぞ。" : "お使いのメールが、書きかけの状態でひらきます。"}
            </div>

            <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 14, marginTop: 18 }}>
                <a href={`mailto:${email}`} style={{ fontFamily: serif, fontSize: 18, color: ink, textDecoration: "none", letterSpacing: "0.01em" }}>
                    {email}
                </a>
                <button
                    type="button"
                    onClick={copy}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: mute, fontFamily: serif, fontStyle: "italic", fontSize: 14 }}
                >
                    {copied ? "copied" : "copy"}
                </button>
            </div>
            <div style={{ fontFamily: gothic, fontSize: 11, color: mute, letterSpacing: "0.06em", lineHeight: 1.9, marginTop: 22, textAlign: "center" }}>
                お酒のご注文には、生年月日を確認させていただいています。
                <br />
                {AGE_NOTICE}
            </div>
        </div>
    )
}

YohakuPurchase.defaultProps = {
    name: "Yohaku no Niwa",
    accent: "GIN",
    spec: "500ml / 40% vol — Forest Distilled Gin",
    price: "7,200",
    releaseAt: "2026-11-28T00:00:00+09:00",
    releaseText: "Nov 28th — 発売",
    soldOut: false,
    previewOpen: false,
    regionALabel: "本州・四国・九州",
    regionAFee: "1,000",
    regionAUrl: "https://square.link/u/rVnclvyF",
    regionBLabel: "北海道・沖縄・離島",
    regionBFee: "1,800",
    regionBUrl: "https://square.link/u/za0hzUAT",
    regionCLabel: "",
    regionCFee: "",
    regionCUrl: "",
    regionDLabel: "",
    regionDFee: "",
    regionDUrl: "",
    contactEmail: "yohaku.ohba@gmail.com",
    contactLabel: "メールで相談する",
    contactHint: "ギフト・まとまった本数・そのほかのお問い合わせ",
    legalHref: "/legal",
    paper: "#F7F7F5",
    ink: "#111111",
    mute: "#8C8B87",
}

addPropertyControls(YohakuPurchase, {
    name: { type: ControlType.String, title: "Name" },
    accent: { type: ControlType.String, title: "Accent" },
    spec: { type: ControlType.String, title: "Spec" },
    price: { type: ControlType.String, title: "Price (税込)", placeholder: "例 8,800" },
    releaseAt: { type: ControlType.String, title: "Release at" },
    releaseText: { type: ControlType.String, title: "Before release" },
    soldOut: { type: ControlType.Boolean, title: "Sold out" },
    previewOpen: { type: ControlType.Boolean, title: "Open early (test)" },
    regionALabel: { type: ControlType.String, title: "Region A" },
    regionAFee: { type: ControlType.String, title: "Region A fee" },
    regionAUrl: { type: ControlType.String, title: "Region A Square link" },
    regionBLabel: { type: ControlType.String, title: "Region B" },
    regionBFee: { type: ControlType.String, title: "Region B fee" },
    regionBUrl: { type: ControlType.String, title: "Region B Square link" },
    regionCLabel: { type: ControlType.String, title: "Region C", placeholder: "空欄 = 表示しない" },
    regionCFee: { type: ControlType.String, title: "Region C fee", placeholder: "空欄 = メールで相談" },
    regionCUrl: { type: ControlType.String, title: "Region C Square link" },
    regionDLabel: { type: ControlType.String, title: "Region D", placeholder: "空欄 = 表示しない" },
    regionDFee: { type: ControlType.String, title: "Region D fee", placeholder: "空欄 = メールで相談" },
    regionDUrl: { type: ControlType.String, title: "Region D Square link" },
    contactEmail: { type: ControlType.String, title: "Contact email" },
    contactLabel: { type: ControlType.String, title: "Contact button", placeholder: "空欄 = 表示しない" },
    contactHint: { type: ControlType.String, title: "Contact hint" },
    legalHref: { type: ControlType.String, title: "Legal page" },
    paper: { type: ControlType.Color, title: "Paper" },
    ink: { type: ControlType.Color, title: "Ink" },
    mute: { type: ControlType.Color, title: "Mute" },
})

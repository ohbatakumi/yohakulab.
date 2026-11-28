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
    couponCode: string
    couponNote: string
    coupon2Code: string
    coupon2Url: string
    ageMode: string
    regionA2Url: string
    regionB2Url: string
    regionC2Url: string
    regionD2Url: string
    bulkNote: string
    regionACouponUrl: string
    regionBCouponUrl: string
    regionCCouponUrl: string
    regionDCouponUrl: string
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
        couponCode, couponNote, coupon2Code, coupon2Url, ageMode, regionA2Url, regionB2Url, regionC2Url, regionD2Url, bulkNote, regionACouponUrl, regionBCouponUrl, regionCCouponUrl, regionDCouponUrl,
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
                    {bulkNote ? (
                        <div style={{ fontFamily: gothic, fontSize: 12, color: ink, letterSpacing: "0.08em", marginTop: 4, textAlign: "center", lineHeight: 1.8 }}>{bulkNote}</div>
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
                          price={price}
                          couponCode={couponCode}
                          couponNote={couponNote}
                          coupon2Code={coupon2Code}
                          coupon2Url={coupon2Url}
                          ageCheckOnly={ageMode !== "birthdate"}
                          bulkNote={bulkNote}
                          productName={[name, accent].filter(Boolean).join(" ")}
                          phone={phone}
                          regions={[
                              { label: regionALabel, fee: regionAFee, url: regionAUrl, couponUrl: regionACouponUrl, url2: regionA2Url },
                              { label: regionBLabel, fee: regionBFee, url: regionBUrl, couponUrl: regionBCouponUrl, url2: regionB2Url },
                              { label: regionCLabel, fee: regionCFee, url: regionCUrl, couponUrl: regionCCouponUrl, url2: regionC2Url },
                              { label: regionDLabel, fee: regionDFee, url: regionDUrl, couponUrl: regionDCouponUrl, url2: regionD2Url },
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

// "20歳以上です" — a single required tick, in the same square as the legal-notice tick.
function AgeTick(p: { checked: boolean; onChange: (v: boolean) => void; ink: string }) {
    return (
        <label style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer", fontFamily: gothic, fontSize: 14, letterSpacing: "0.06em", padding: "14px 0 6px" }}>
            <span style={{ flex: "none", width: 13, height: 13, border: `1px solid ${p.ink}`, background: p.checked ? p.ink : "transparent", transition: "background .3s" }} />
            <input type="checkbox" checked={p.checked} onChange={(e) => p.onChange(e.target.checked)} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
            <span>20歳以上です</span>
        </label>
    )
}

type Region = { label: string; fee: string; url: string; couponUrl?: string; url2?: string }

const normCode = (v: string) =>
    String(v || "")
        .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
        .replace(/\s+/g, "")
        .toUpperCase()

type SheetProps = {
    onClose: () => void
    startContact: boolean
    email: string
    price: string
    couponCode: string
    couponNote: string
    coupon2Code: string
    coupon2Url: string
    ageCheckOnly: boolean
    bulkNote: string
    productName: string
    phone: boolean
    regions: Region[]
    legalHref: string
    paper: string
    ink: string
    mute: string
}

function Sheet(p: SheetProps) {
    const { onClose, startContact, email, price, couponCode, couponNote, coupon2Code, coupon2Url, ageCheckOnly, bulkNote, productName, phone, regions, legalHref, paper, ink, mute } = p
    const [mode, setMode] = React.useState<"buy" | "contact">(startContact ? "contact" : "buy")
    const [over20, setOver20] = React.useState(false)
    const [y, setY] = React.useState("")
    const [m, setM] = React.useState("")
    const [d, setD] = React.useState("")
    const [region, setRegion] = React.useState(-1)
    const [coupon, setCoupon] = React.useState("")
    const [count, setCount] = React.useState(1)
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
    const adult = ageCheckOnly ? over20 : valid && age >= 20
    const under = !ageCheckOnly && valid && age < 20
    const chosen = region >= 0 ? regions[region] : undefined
    const byLetter = !!chosen && !chosen.fee && !!email
    // Each Square link carries a fixed quantity (and its own shipping), so 2 bottles go to a separate link.
    // A valid coupon always wins: its Square link lets the buyer change the quantity there.
    const typed = normCode(coupon)
    // Code 1 has its own link per region; code 2 has one link for every region.
    const coupon1On = !!couponCode && !!typed && typed === normCode(couponCode)
    const coupon2On = !!coupon2Code && !!typed && typed === normCode(coupon2Code)
    const couponOn = coupon1On || coupon2On
    const couponWrong = !!typed && !couponOn
    const url = (coupon2On ? coupon2Url : coupon1On ? chosen?.couponUrl : count === 2 ? chosen?.url2 : chosen?.url) || ""
    const unit = parseInt(String(price).replace(/[^0-9]/g, ""), 10) || 0
    const ready = adult && !!chosen && !couponWrong && (byLetter || (agreed && !!url))

    let goText = "お支払いへ"
    if (byLetter) goText = "メールで相談する"
    else if (couponWrong) goText = "コードをご確認ください"
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
            aria-label={mode === "buy" ? "ご購入の前に" : "メールでのご注文・ご相談"}
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
                        price={price}
                        regions={regions}
                        startKind={byLetter ? "ask" : "order"}
                        ageCheckOnly={ageCheckOnly}
                        over20={adult}
                        birth={adult && !ageCheckOnly ? { y, m, d } : { y: "", m: "", d: "" }}
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
                            {ageCheckOnly ? "年齢のご確認をお願いいたします。" : "生年月日をご入力ください。"}
                        </p>

                        {ageCheckOnly ? (
                            <div style={{ marginTop: 20, borderBottom: `1px solid ${tint(mute, "44")}` }}>
                                <div style={small}>年齢の確認（必須）</div>
                                <AgeTick checked={over20} onChange={setOver20} ink={ink} />
                            </div>
                        ) : (
                        <>
                        <div style={{ ...small, marginTop: 28 }}>生年月日（必須）</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1.6fr auto 1fr auto 1fr auto", alignItems: "end", gap: 8, marginTop: 4 }}>
                            <input aria-label="年" inputMode="numeric" placeholder="1990" value={y} onChange={(e) => setY(digits(e.target.value, 4))} style={input} />
                            <span style={small}>年</span>
                            <input aria-label="月" inputMode="numeric" placeholder="1" value={m} onChange={(e) => setM(digits(e.target.value, 2))} style={input} />
                            <span style={small}>月</span>
                            <input aria-label="日" inputMode="numeric" placeholder="1" value={d} onChange={(e) => setD(digits(e.target.value, 2))} style={input} />
                            <span style={small}>日</span>
                        </div>
                        </>
                        )}
                        <div style={{ fontFamily: gothic, fontSize: 13, marginTop: 14, letterSpacing: "0.04em" }}>{AGE_NOTICE}</div>
                        {!ageCheckOnly && filled && !valid ? <div style={{ ...small, marginTop: 8 }}>日付をご確認ください。</div> : null}
                        {under ? (
                            <div style={{ fontFamily: gothic, fontSize: 13, lineHeight: 1.9, marginTop: 16 }}>
                                申し訳ございません。
                                <br />
                                20歳未満の方にはお売りすることができません。
                            </div>
                        ) : null}

                        <div style={{ opacity: adult ? 1 : 0.35, pointerEvents: adult ? "auto" : "none", transition: "opacity .5s ease" }}>
                            <div style={{ ...small, marginTop: 32 }}>本数</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
                                {[1, 2].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        aria-pressed={count === n}
                                        onClick={() => setCount(n)}
                                        style={{
                                            padding: "12px 0 10px",
                                            background: count === n ? ink : "transparent",
                                            color: count === n ? paper : ink,
                                            border: `1px solid ${count === n ? ink : tint(mute, "88")}`,
                                            borderRadius: 0,
                                            cursor: "pointer",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 2,
                                            transition: "background .3s, color .3s",
                                        }}
                                    >
                                        <span style={{ fontFamily: mincho, fontSize: 15, letterSpacing: "0.12em" }}>{n}本</span>
                                        {unit ? <span style={{ fontFamily: serif, fontSize: 14, opacity: 0.75 }}>{"¥" + (unit * n).toLocaleString("ja-JP")}</span> : null}
                                    </button>
                                ))}
                            </div>
                            {bulkNote && email ? (
                                <div style={{ ...small, marginTop: 10, letterSpacing: "0.08em" }}>
                                    {bulkNote.endsWith("メールより承ります。") ? bulkNote.slice(0, -"メールより承ります。".length) : bulkNote + " "}
                                    <button type="button" onClick={() => setMode("contact")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: ink, fontFamily: gothic, fontSize: 11, letterSpacing: "0.08em", borderBottom: `1px solid ${tint(ink, "55")}` }}>
                                        メールより承ります
                                    </button>
                                    。
                                </div>
                            ) : null}

                            <div style={{ ...small, marginTop: 28 }}>お届け先の地域</div>
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

                            {(couponCode || coupon2Code) && !byLetter ? (
                                <div style={{ marginTop: 26 }}>
                                    <label htmlFor="yl-coupon" style={{ ...small, display: "block" }}>
                                        クーポンコード
                                        <span style={{ marginLeft: 8, letterSpacing: "0.06em" }}>お持ちの方のみ</span>
                                    </label>
                                    <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
                                        <input
                                            id="yl-coupon"
                                            value={coupon}
                                            autoCapitalize="characters"
                                            autoComplete="off"
                                            spellCheck={false}
                                            onChange={(e) => setCoupon(e.target.value.slice(0, 32))}
                                            style={{ ...input, textAlign: "left", fontSize: 18, letterSpacing: "0.12em", padding: "10px 0 6px", textTransform: "uppercase" }}
                                        />
                                        <span style={{ flex: "none", fontFamily: serif, fontStyle: "italic", fontSize: 15, color: couponOn ? ink : mute, paddingBottom: 8, minWidth: 54, textAlign: "right" }}>
                                            {couponOn ? "applied" : ""}
                                        </span>
                                    </div>
                                    {couponOn ? (
                                        <div style={{ fontFamily: gothic, fontSize: 12, lineHeight: 1.9, marginTop: 10, wordBreak: "keep-all", overflowWrap: "anywhere", whiteSpace: "pre-line" }}>{couponNote}</div>
                                    ) : couponWrong && typed.length >= Math.min(...[couponCode, coupon2Code].filter(Boolean).map((c) => normCode(c).length)) ? (
                                        <div style={{ ...small, marginTop: 10 }}>このコードは見つかりませんでした。空欄のままでもご購入いただけます。</div>
                                    ) : null}
                                </div>
                            ) : null}

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
                                    <span style={{ color: mute }}>銀行振込でのご注文・ご相談は　</span>
                                    <span style={{ borderBottom: `1px solid ${tint(ink, "55")}`, paddingBottom: 2 }}>メールで承ります</span>
                                </button>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    )
}

// A letter instead of a form: it opens the visitor's own mail app, already written to us.
// Two kinds — an order paid by bank transfer (every field the shop needs, age check included,
// with the total worked out), or a free question. Nothing is sent or stored by the site itself.
type Kind = "order" | "ask"

function yen(n: number) {
    return "¥" + n.toLocaleString("ja-JP")
}

function Letter(p: {
    email: string
    productName: string
    price: string
    regions: Region[]
    startKind: Kind
    birth: { y: string; m: string; d: string }
    ageCheckOnly: boolean
    over20: boolean
    onBack: null | (() => void)
    ink: string
    mute: string
    paper: string
}) {
    const { email, productName, price, regions, startKind, onBack, ink, mute, paper } = p
    const shipRegions = regions.filter((r) => r.fee)
    const [kind, setKind] = React.useState<Kind>(startKind)
    const [name, setName] = React.useState("")
    const [kana, setKana] = React.useState("")
    const [over20, setOver20] = React.useState(p.over20)
    const [y, setY] = React.useState(p.birth.y)
    const [m, setM] = React.useState(p.birth.m)
    const [d, setD] = React.useState(p.birth.d)
    const [zip, setZip] = React.useState("")
    const [addr, setAddr] = React.useState("")
    const [tel, setTel] = React.useState("")
    const [region, setRegion] = React.useState(shipRegions.length === 1 ? 0 : -1)
    const [count, setCount] = React.useState(1)
    const [when, setWhen] = React.useState("")
    const [note, setNote] = React.useState("")
    const [tried, setTried] = React.useState(false)
    const [copied, setCopied] = React.useState(false)
    const [sent, setSent] = React.useState(false)

    const toHalf = (v: string) => v.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    const digits = (v: string, n: number) => toHalf(v).replace(/[^0-9]/g, "").slice(0, n)

    const yn = parseInt(y, 10), mn = parseInt(m, 10), dn = parseInt(d, 10)
    const birthValid = validDate(yn, mn, dn)
    const age = birthValid ? ageOn(yn, mn, dn, new Date()) : -1
    const adult = p.ageCheckOnly ? over20 : birthValid && age >= 20
    const under = !p.ageCheckOnly && birthValid && age < 20

    const unit = parseInt(String(price).replace(/[^0-9]/g, ""), 10) || 0
    const r = region >= 0 ? shipRegions[region] : undefined
    const fee = r ? parseInt(r.fee.replace(/[^0-9]/g, ""), 10) || 0 : 0
    const subtotal = unit * count
    const total = subtotal + fee

    const missing: string[] = []
    if (kind === "order") {
        if (!name.trim()) missing.push("お名前")
        if (!adult) missing.push(p.ageCheckOnly ? "年齢の確認" : "生年月日")
        if (digits(zip, 7).length !== 7) missing.push("郵便番号")
        if (!addr.trim()) missing.push("ご住所")
        if (digits(tel, 11).length < 10) missing.push("電話番号")
        if (!r) missing.push("お届けの地域")
    } else {
        if (!name.trim()) missing.push("お名前")
    }
    const ok = missing.length === 0

    const zip7 = digits(zip, 7)
    const zipText = zip7.length === 7 ? `${zip7.slice(0, 3)}-${zip7.slice(3)}` : zip
    let subject = ""
    let lines: string[] = []
    if (kind === "order") {
        subject = `【銀行振込でのご注文】${productName} ×${count}`
        lines = [
            "余白研究室 御中",
            "",
            "銀行振込で、下記のとおり注文します。",
            "",
            "■ ご注文",
            `商品：${productName}`,
            `本数：${count}本`,
            unit ? `商品代金：${yen(subtotal)}（税込）` : "",
            r ? `送料：${yen(fee)}（${r.label}）` : "",
            unit && r ? `合計：${yen(total)}` : "",
            "",
            "■ お届け先",
            `お名前：${name}`,
            `フリガナ：${kana}`,
            `〒${zipText}`,
            `ご住所：${addr}`,
            `電話番号：${tel}`,
            `お届け日のご希望：${when || "指定なし"}`,
            "",
            "■ 年齢確認",
            p.ageCheckOnly ? "20歳以上です（確認済み）" : `生年月日：${birthValid ? `${yn}年${mn}月${dn}日` : ""}（20歳以上です）`,
            "",
            "■ ご連絡事項",
            note,
            "",
        ].filter((l, i, a) => l !== "" || a[i - 1] !== "")
    } else {
        subject = `${productName} — ご相談`
        lines = [
            "余白研究室 御中",
            "",
            `お名前：${name}`,
            tel ? `電話番号：${tel}` : "",
            "",
            note,
            "",
        ].filter((l, i, a) => l !== "" || a[i - 1] !== "")
    }
    const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(email)
            setCopied(true)
            setTimeout(() => setCopied(false), 2400)
        } catch (e) {}
    }

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
    const num: React.CSSProperties = { ...field, textAlign: "center", fontFamily: serif, fontSize: 20 }
    const label = (t: string, req = false): React.CSSProperties => ({ fontFamily: gothic, fontSize: 11, color: mute, letterSpacing: "0.12em", display: "block", marginTop: 24 })
    const Req = () => <span style={{ marginLeft: 6, fontSize: 10, letterSpacing: "0.08em" }}>必須</span>
    const small: React.CSSProperties = { fontFamily: gothic, fontSize: 11, color: mute, letterSpacing: "0.1em", lineHeight: 1.9 }
    const tab = (k: Kind, t: string) => (
        <button
            type="button"
            onClick={() => {
                setKind(k)
                setTried(false)
            }}
            aria-pressed={kind === k}
            style={{
                flex: 1,
                background: "none",
                border: "none",
                borderBottom: `1px solid ${kind === k ? ink : tint(mute, "44")}`,
                padding: "0 0 10px",
                color: kind === k ? ink : mute,
                fontFamily: mincho,
                fontSize: 14,
                letterSpacing: "0.12em",
                cursor: "pointer",
                transition: "color .3s, border-color .3s",
            }}
        >
            {t}
        </button>
    )

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
            <div style={{ fontFamily: mincho, fontSize: 22, marginTop: 10, letterSpacing: "0.08em" }}>メールでのご注文・ご相談</div>

            <div style={{ display: "flex", gap: 20, marginTop: 28 }}>
                {tab("order", "銀行振込でご注文")}
                {tab("ask", "ご相談・お問い合わせ")}
            </div>

            <p style={{ fontFamily: gothic, fontSize: 13, lineHeight: 1.95, marginTop: 22, marginBottom: 0, wordBreak: "keep-all", overflowWrap: "anywhere" }}>
                {kind === "order" ? (
                    <>
                        必要なところだけ、ご記入ください。
                        <br />
                        ご注文のメールが、書きあがった状態でひらきます。
                    </>
                ) : (
                    <>
                        ギフト、まとまった本数、そのほかのことも。
                        <br />
                        ご希望をそのまま、お聞かせください。
                    </>
                )}
            </p>

            <label style={label("")} htmlFor="yl-name">
                お名前
                <Req />
            </label>
            <input id="yl-name" value={name} onChange={(e) => setName(e.target.value)} style={field} autoComplete="name" />

            {kind === "order" ? (
                <>
                    <label style={label("")} htmlFor="yl-kana">フリガナ</label>
                    <input id="yl-kana" value={kana} onChange={(e) => setKana(e.target.value)} style={field} />

                    {p.ageCheckOnly ? (
                        <div style={{ borderBottom: `1px solid ${ink}` }}>
                            <span style={label("")}>
                                年齢の確認
                                <Req />
                            </span>
                            <AgeTick checked={over20} onChange={setOver20} ink={ink} />
                        </div>
                    ) : (
                    <>
                    <span style={label("")}>
                        生年月日
                        <Req />
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "1.6fr auto 1fr auto 1fr auto", alignItems: "end", gap: 8 }}>
                        <input aria-label="年" inputMode="numeric" placeholder="1990" value={y} onChange={(e) => setY(digits(e.target.value, 4))} style={num} />
                        <span style={small}>年</span>
                        <input aria-label="月" inputMode="numeric" placeholder="1" value={m} onChange={(e) => setM(digits(e.target.value, 2))} style={num} />
                        <span style={small}>月</span>
                        <input aria-label="日" inputMode="numeric" placeholder="1" value={d} onChange={(e) => setD(digits(e.target.value, 2))} style={num} />
                        <span style={small}>日</span>
                    </div>
                    </>
                    )}
                    {under ? (
                        <div style={{ fontFamily: gothic, fontSize: 12, lineHeight: 1.9, marginTop: 10 }}>申し訳ございません。20歳未満の方にはお売りすることができません。</div>
                    ) : null}

                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 20 }}>
                        <div>
                            <label style={label("")} htmlFor="yl-zip">
                                郵便番号
                                <Req />
                            </label>
                            <input id="yl-zip" inputMode="numeric" placeholder="380-0000" value={zip} onChange={(e) => setZip(toHalf(e.target.value).replace(/[^0-9-]/g, "").slice(0, 8))} style={field} autoComplete="postal-code" />
                        </div>
                        <div>
                            <label style={label("")} htmlFor="yl-tel">
                                電話番号
                                <Req />
                            </label>
                            <input id="yl-tel" inputMode="tel" placeholder="090-0000-0000" value={tel} onChange={(e) => setTel(toHalf(e.target.value).replace(/[^0-9-]/g, "").slice(0, 13))} style={field} autoComplete="tel" />
                        </div>
                    </div>

                    <label style={label("")} htmlFor="yl-addr">
                        ご住所
                        <Req />
                    </label>
                    <textarea id="yl-addr" rows={2} value={addr} placeholder="都道府県から、建物名・部屋番号まで" onChange={(e) => setAddr(e.target.value)} style={{ ...field, resize: "none", lineHeight: 1.7 }} autoComplete="street-address" />

                    <span style={label("")}>
                        お届けの地域
                        <Req />
                    </span>
                    {shipRegions.map((rg, i) => (
                        <label
                            key={i}
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${tint(mute, "44")}`, cursor: "pointer", fontFamily: gothic, fontSize: 13 }}
                        >
                            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ flex: "none", width: 11, height: 11, borderRadius: "50%", border: `1px solid ${ink}`, background: region === i ? ink : "transparent", transition: "background .3s" }} />
                                <input type="radio" name="yohaku-letter-region" checked={region === i} onChange={() => setRegion(i)} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
                                {rg.label}
                            </span>
                            <span style={{ color: mute, fontSize: 12, whiteSpace: "nowrap" }}>送料 ¥{rg.fee}</span>
                        </label>
                    ))}

                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 20, alignItems: "end" }}>
                        <div>
                            <span style={label("")}>本数</span>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${ink}`, padding: "4px 0 2px" }}>
                                <button type="button" aria-label="減らす" onClick={() => setCount(Math.max(1, count - 1))} style={{ background: "none", border: "none", color: ink, fontFamily: serif, fontSize: 22, cursor: "pointer", padding: "0 6px" }}>
                                    −
                                </button>
                                <span style={{ fontFamily: serif, fontSize: 20 }}>{count}</span>
                                <button type="button" aria-label="増やす" onClick={() => setCount(Math.min(24, count + 1))} style={{ background: "none", border: "none", color: ink, fontFamily: serif, fontSize: 22, cursor: "pointer", padding: "0 6px" }}>
                                    +
                                </button>
                            </div>
                        </div>
                        <div>
                            <label style={label("")} htmlFor="yl-when">お届け日のご希望</label>
                            <input id="yl-when" value={when} placeholder="指定なし" onChange={(e) => setWhen(e.target.value)} style={field} />
                        </div>
                    </div>

                    {unit ? (
                        <div style={{ marginTop: 26, paddingTop: 14, borderTop: `1px solid ${tint(mute, "44")}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", ...small }}>
                                <span>商品代金（税込）</span>
                                <span>{yen(subtotal)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", ...small }}>
                                <span>送料</span>
                                <span>{r ? yen(fee) : "—"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
                                <span style={{ fontFamily: gothic, fontSize: 12, letterSpacing: "0.12em" }}>お振込み金額</span>
                                <span style={{ fontFamily: serif, fontSize: 24 }}>{r ? yen(total) : "—"}</span>
                            </div>
                        </div>
                    ) : null}
                </>
            ) : null}

            <label style={label("")} htmlFor="yl-note">{kind === "order" ? "ご連絡事項" : "ご用件"}</label>
            <textarea
                id="yl-note"
                value={note}
                rows={3}
                placeholder={kind === "order" ? "のし・メッセージカード、領収書のご希望など" : "ギフトのご相談、本数、お届けの時期など"}
                onChange={(e) => setNote(e.target.value)}
                style={{ ...field, resize: "none", lineHeight: 1.8, fontSize: 14 }}
            />

            <a
                href={ok ? href : undefined}
                role="button"
                aria-disabled={!ok}
                onClick={(e) => {
                    if (!ok) {
                        e.preventDefault()
                        setTried(true)
                        return
                    }
                    setSent(true)
                }}
                style={{
                    display: "block",
                    textAlign: "center",
                    marginTop: 32,
                    padding: "17px 0",
                    background: ok ? ink : "transparent",
                    color: ok ? paper : mute,
                    border: `1px solid ${ok ? ink : tint(mute, "88")}`,
                    fontFamily: mincho,
                    fontSize: 15,
                    letterSpacing: "0.3em",
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "background .4s, color .4s",
                }}
            >
                {kind === "order" ? "注文のメールを書く" : "メールを書く"}
            </a>
            <div style={{ ...small, marginTop: 14, textAlign: "center" }}>
                {tried && !ok
                    ? `${missing.join("・")}をご記入ください。`
                    : sent
                      ? "メールの画面が開かない場合は、下のアドレスへ直接どうぞ。"
                      : "お使いのメールが、書きかけの状態でひらきます。送信してはじめて届きます。"}
            </div>
            {kind === "order" ? (
                <div style={{ ...small, marginTop: 18, textAlign: "center", wordBreak: "keep-all", overflowWrap: "anywhere" }}>
                    お振込先は、ご注文を確認したのちメールでお知らせします。
                    <br />
                    ご入金を確認してから、発送いたします。
                </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 14, marginTop: 22 }}>
                <a href={`mailto:${email}`} style={{ fontFamily: serif, fontSize: 18, color: ink, textDecoration: "none", letterSpacing: "0.01em" }}>
                    {email}
                </a>
                <button type="button" onClick={copy} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: mute, fontFamily: serif, fontStyle: "italic", fontSize: 14 }}>
                    {copied ? "copied" : "copy"}
                </button>
            </div>
            <div style={{ fontFamily: gothic, fontSize: 11, color: mute, letterSpacing: "0.06em", lineHeight: 1.9, marginTop: 18, textAlign: "center" }}>{AGE_NOTICE}</div>
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
    couponCode: "YOHAKU2026",
    couponNote: "クーポンが適用されます。\nお支払いの画面で、金額をご確認ください。",
    coupon2Code: "YOHAKU0909",
    coupon2Url: "https://square.link/u/cAoRtF2H",
    ageMode: "check",
    regionA2Url: "https://square.link/u/ZsFBMpsg",
    regionB2Url: "https://square.link/u/WBCqq4lk",
    regionC2Url: "",
    regionD2Url: "",
    bulkNote: "3本以上のご購入は、メールより承ります。",
    regionACouponUrl: "https://square.link/u/rcdG5qug",
    regionBCouponUrl: "https://square.link/u/rjQQWhyz",
    regionCCouponUrl: "",
    regionDCouponUrl: "",
    contactEmail: "yohaku.ohba@gmail.com",
    contactLabel: "メールでのご注文・ご相談",
    contactHint: "銀行振込でのご注文・ギフト・まとまった本数など",
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
    couponCode: { type: ControlType.String, title: "Coupon code", placeholder: "空欄 = 欄を表示しない" },
    couponNote: { type: ControlType.String, title: "Coupon message", displayTextArea: true },
    coupon2Code: { type: ControlType.String, title: "Coupon 2 code", placeholder: "空欄 = 使わない" },
    regionA2Url: { type: ControlType.String, title: "Region A 2本 link" },
    regionB2Url: { type: ControlType.String, title: "Region B 2本 link" },
    regionC2Url: { type: ControlType.String, title: "Region C 2本 link" },
    regionD2Url: { type: ControlType.String, title: "Region D 2本 link" },
    bulkNote: { type: ControlType.String, title: "3本以上の案内" },
    ageMode: { type: ControlType.Enum, title: "Age check", options: ["check", "birthdate"], optionTitles: ["20歳以上のチェック", "生年月日の入力"] },
    coupon2Url: { type: ControlType.String, title: "Coupon 2 link (全地域)" },
    regionACouponUrl: { type: ControlType.String, title: "Region A coupon link" },
    regionBCouponUrl: { type: ControlType.String, title: "Region B coupon link" },
    regionCCouponUrl: { type: ControlType.String, title: "Region C coupon link" },
    regionDCouponUrl: { type: ControlType.String, title: "Region D coupon link" },
    contactEmail: { type: ControlType.String, title: "Contact email" },
    contactLabel: { type: ControlType.String, title: "Contact button", placeholder: "空欄 = 表示しない" },
    contactHint: { type: ControlType.String, title: "Contact hint" },
    legalHref: { type: ControlType.String, title: "Legal page" },
    paper: { type: ControlType.Color, title: "Paper" },
    ink: { type: ControlType.Color, title: "Ink" },
    mute: { type: ControlType.Color, title: "Mute" },
})

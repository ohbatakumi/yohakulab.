// Yohaku no Niwa GIN — a slowly turning bottle in front of its own name.
// When the back label faces you, its words surface in the whitespace beside it.
import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import * as THREE from "https://esm.sh/three@0.169.0"
import { RoomEnvironment } from "https://esm.sh/three@0.169.0/examples/jsm/environments/RoomEnvironment.js"

const FONT_HREF =
    "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Shippori+Mincho:wght@400;500&family=Zen+Kaku+Gothic+New:wght@400&display=swap"

const DEFAULT_FRONT = "https://framerusercontent.com/images/B9O8KI93jOw3dQMzMlgAMYJjroM.jpg"
const DEFAULT_BACK = "https://framerusercontent.com/images/F2DI3lUIIpzQe7Okxz05p1kjiNE.jpg"
const DEFAULT_CAP = "https://framerusercontent.com/images/ZzNXHQo589XiusNoGPJsdoiKbzg.jpg"

const DEFAULT_TEXT = `就寝前の静かなひと時、
深い森の中で深呼吸をするようにヒノキが香る。
白檀のお香のような燻煙は森の霧のような余韻を残す。
廃材になるはずだったヒノキは今ここに意味をもたらし、
あなたの思考に、暮らしに余白を作る。
余白の美の概念をここに。`

// bottle proportions, measured from the photographs (body radius = 1)
const BODY_H = 2.7
const FRONT_ARC = 1.73
const BACK_ARC = 1.5
const LABEL_Y0 = 0.46
const FRONT_H = 2.1
const BACK_H = 2.05
const TOTAL_H = 4.14
const BACK_WINDOW_IN = 0.62
const BACK_WINDOW_OUT = 0.8

function ensureFonts() {
    if (typeof document === "undefined") return
    if (document.querySelector("link[data-yohaku-gin]")) return
    const l = document.createElement("link")
    l.rel = "stylesheet"
    l.href = FONT_HREF
    l.setAttribute("data-yohaku-gin", "")
    document.head.appendChild(l)
}

function bottleProfile() {
    const p: [number, number][] = [
        [0, 0],
        [0.86, 0],
        [0.95, 0.015],
        [0.99, 0.06],
        [1.0, 0.14],
        [1.0, BODY_H],
        [0.985, 2.8],
        [0.94, 2.9],
        [0.84, 3.0],
        [0.68, 3.09],
        [0.5, 3.16],
        [0.38, 3.22],
        [0.345, 3.3],
        [0.34, 3.72],
        [0.4, 3.73],
        [0.42, 3.78],
        [0.0, 3.78],
    ]
    return p.map(([r, y]) => new THREE.Vector2(r, y))
}

function capProfile() {
    const h = 0.38
    const r = 0.47
    const pts: [number, number][] = [[0, 0], [r - 0.01, 0], [r, 0.02]]
    pts.push([r, h - 0.05])
    for (let i = 1; i <= 6; i++) {
        const a = (i / 6) * (Math.PI / 2)
        pts.push([r - 0.05 + Math.cos(a) * 0.05, h - 0.05 + Math.sin(a) * 0.05])
    }
    pts.push([0, h])
    return pts.map(([x, y]) => new THREE.Vector2(x, y))
}

function loadTex(loader: THREE.TextureLoader, url: string) {
    return new Promise<THREE.Texture | null>((res) => {
        if (!url) return res(null)
        loader.load(
            url,
            (t: any) => {
                t.colorSpace = THREE.SRGBColorSpace
                t.anisotropy = 8
                res(t)
            },
            undefined,
            () => res(null)
        )
    })
}

const bgVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
const bgFrag = `
uniform sampler2D uMask; uniform vec3 uPaper; uniform vec3 uInk; uniform float uText; uniform float uShadow;
varying vec2 vUv;
void main(){
  vec4 m = texture2D(uMask, vUv);
  vec3 c = mix(uPaper, uInk, m.r * uText);
  c *= 1.0 - m.g * uShadow;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`

type Props = {
    frontLabel?: { src: string } | string
    backLabel?: { src: string } | string
    capImage?: { src: string } | string
    title: string
    description: string
    topLeft: string
    topRight: string
    bottomLeft: string
    bottomRight: string
    paper: string
    ink: string
    mute: string
    seconds: number
    startAngle?: number
    style?: React.CSSProperties
}

const srcOf = (v: any) => (typeof v === "string" ? v : v?.src || "")

export default function YohakuGin(props: Props) {
    const {
        title,
        description,
        topLeft,
        topRight,
        bottomLeft,
        bottomRight,
        paper,
        ink,
        mute,
        seconds,
        startAngle = 20,
    } = props
    const front = srcOf(props.frontLabel) || DEFAULT_FRONT
    const back = srcOf(props.backLabel) || DEFAULT_BACK
    const cap = srcOf(props.capImage) || DEFAULT_CAP

    const hostRef = React.useRef<HTMLDivElement>(null)
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const [showBack, setShowBack] = React.useState(false)
    const [narrow, setNarrow] = React.useState(false)
    const [descPos, setDescPos] = React.useState({ x: 0.76, y: 0.5 })
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const lines = React.useMemo(
        () => description.split("\n").map((s) => s.trim()).filter(Boolean),
        [description]
    )

    React.useEffect(() => {
        ensureFonts()
    }, [])

    React.useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return
        let disposed = false
        let raf = 0
        let visible = true

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.NoToneMapping
        renderer.toneMappingExposure = 1.0
        const paperCol = new THREE.Color(paper)
        renderer.setClearColor(paperCol, 1)

        const scene = new THREE.Scene()
        const pmrem = new THREE.PMREMGenerator(renderer)
        const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
        scene.environment = env
        scene.environmentIntensity = 1.0

        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
        camera.position.set(0, 0.35, 10.4)
        camera.lookAt(0, 0.05, 0)

        // ---- background: the name, drawn into a mask so the glass can refract it
        const maskCanvas = document.createElement("canvas")
        const maskTex = new THREE.CanvasTexture(maskCanvas)
        maskTex.colorSpace = THREE.NoColorSpace
        maskTex.minFilter = THREE.LinearFilter
        maskTex.generateMipmaps = false
        const bgMat = new THREE.ShaderMaterial({
            vertexShader: bgVert,
            fragmentShader: bgFrag,
            uniforms: {
                uMask: { value: maskTex },
                uPaper: { value: paperCol.clone() },
                uInk: { value: new THREE.Color(ink) },
                uText: { value: 1 },
                uShadow: { value: 0.1 },
            },
            toneMapped: false,
            depthWrite: false,
        })
        const bgDist = 14
        const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bgMat)
        bg.renderOrder = -1
        camera.add(bg)
        bg.position.set(0, 0, -bgDist)
        scene.add(camera)

        // ---- bottle
        const bottle = new THREE.Group()
        bottle.position.y = -TOTAL_H / 2
        scene.add(bottle)

        const glass = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0,
            roughness: 0,
            transmission: 1,
            thickness: 0.6,
            ior: 1.4,
            specularIntensity: 0.5,
            envMapIntensity: 0.22,
            attenuationColor: new THREE.Color("#e8ece4"),
            attenuationDistance: 12,
        })
        const glassMesh = new THREE.Mesh(new THREE.LatheGeometry(bottleProfile(), 128), glass)
        bottle.add(glassMesh)
        // the darker edge glass shows against a pale wall
        const rimMat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: { uCol: { value: new THREE.Color("#3f3d39") } },
            vertexShader: `varying vec3 vN; varying vec3 vV;
              void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
            fragmentShader: `uniform vec3 uCol; varying vec3 vN; varying vec3 vV;
              void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float a = pow(f, 1.9) * 0.6; gl_FragColor = vec4(uCol, a);
              #include <colorspace_fragment>
              }`,
        })
        const rim = new THREE.Mesh(glassMesh.geometry, rimMat)
        rim.scale.setScalar(1.002)
        rim.renderOrder = 2
        bottle.add(rim)

        const cork = new THREE.Mesh(
            new THREE.CylinderGeometry(0.255, 0.255, 0.48, 48),
            new THREE.MeshStandardMaterial({ color: "#8f7c62", roughness: 1 })
        )
        cork.position.y = 3.52
        bottle.add(cork)

        const woodMat = new THREE.MeshStandardMaterial({ color: "#d9c3a2", roughness: 0.75 })
        const capMesh = new THREE.Mesh(new THREE.LatheGeometry(capProfile(), 96), woodMat)
        capMesh.position.y = 3.76
        bottle.add(capMesh)

        const paperInside = new THREE.MeshBasicMaterial({ color: "#ebeae5", side: THREE.BackSide })
        const makeLabel = (arc: number, h: number, start: number) => {
            const g = new THREE.CylinderGeometry(1.004, 1.004, h, 96, 1, true, start, arc)
            const mat = new THREE.MeshStandardMaterial({ color: "#e9e7e0", roughness: 1, envMapIntensity: 0.55, side: THREE.FrontSide })
            const m = new THREE.Mesh(g, mat)
            const inner = new THREE.Mesh(g, paperInside)
            m.position.y = inner.position.y = LABEL_Y0 + h / 2
            bottle.add(m, inner)
            return mat
        }
        const frontMat = makeLabel(FRONT_ARC, FRONT_H, -FRONT_ARC / 2)
        const backMat = makeLabel(BACK_ARC, BACK_H, Math.PI - BACK_ARC / 2)

        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin("anonymous")
        Promise.all([loadTex(loader, front), loadTex(loader, back), loadTex(loader, cap)]).then(([f, b, c]) => {
            if (disposed) return
            if (f) { frontMat.map = f; frontMat.color.set("#ffffff"); frontMat.needsUpdate = true }
            if (b) { backMat.map = b; backMat.color.set("#ffffff"); backMat.needsUpdate = true }
            if (c) {
                c.wrapS = THREE.MirroredRepeatWrapping
                c.repeat.set(3, 1)
                woodMat.map = c
                woodMat.color.set("#ffffff")
                woodMat.needsUpdate = true
            }
            if (isCanvas) renderOnce()
        })

        // light: a soft key so the labels read as paper
        const key = new THREE.DirectionalLight(0xffffff, 0.9)
        key.position.set(-4, 6, 8)
        scene.add(key)
        scene.add(new THREE.AmbientLight(0xffffff, 0.35))

        // ---- layout
        let W = 1, H = 1, dpr = 1, isNarrow = false
        const project = (x: number, y: number, z: number) => {
            const v = new THREE.Vector3(x, y, z).project(camera)
            return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H }
        }

        const drawMask = () => {
            maskCanvas.width = Math.round(W * dpr)
            maskCanvas.height = Math.round(H * dpr)
            const ctx = maskCanvas.getContext("2d")!
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.fillStyle = "#000"
            ctx.fillRect(0, 0, W, H)

            // shadow (green channel) — static, the bottle turns on its own axis
            const base = project(0, bottle.position.y, 0)
            const edge = project(1, bottle.position.y, 0)
            const rx = (edge.x - base.x) * 1.35
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
            g.addColorStop(0, "rgba(0,255,0,0.9)")
            g.addColorStop(0.55, "rgba(0,255,0,0.35)")
            g.addColorStop(1, "rgba(0,255,0,0)")
            ctx.save()
            ctx.translate(base.x, base.y + 2)
            ctx.scale(rx, rx * 0.12)
            ctx.fillStyle = g
            ctx.beginPath()
            ctx.arc(0, 0, 1, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()

            // the name (red channel)
            ctx.fillStyle = "#f00"
            ctx.textAlign = "center"
            ctx.textBaseline = "alphabetic"
            const center = project(0, bottle.position.y + LABEL_Y0 + FRONT_H * 0.55, 0)
            if (!isNarrow) {
                ctx.font = `400 100px "Instrument Serif", "Cormorant Garamond", serif`
                const w = ctx.measureText(title).width || 1
                const size = Math.min((W * 0.9 * 100) / w, H * 0.32)
                ctx.font = `400 ${size}px "Instrument Serif", "Cormorant Garamond", serif`
                ctx.fillText(title, W / 2, center.y + size * 0.3)
            } else {
                const words = title.split(" ")
                const rows = words.length >= 4
                    ? [words.slice(0, 1).join(" "), words.slice(1, words.length - 1).join(" "), words[words.length - 1]]
                    : [title]
                ctx.font = `400 100px "Instrument Serif", serif`
                const maxW = Math.max(...rows.map((r) => ctx.measureText(r).width)) || 1
                const size = Math.min((W * 0.86 * 100) / maxW, H * 0.16)
                ctx.font = `400 ${size}px "Instrument Serif", serif`
                const lh = size * 0.92
                const top = center.y - (lh * (rows.length - 1)) / 2 + size * 0.3
                rows.forEach((r, i) => ctx.fillText(r, W / 2, top + i * lh))
            }
            maskTex.needsUpdate = true
        }

        const resize = () => {
            const r = host.getBoundingClientRect()
            W = Math.max(1, r.width)
            H = Math.max(1, r.height)
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            isNarrow = W < 720
            renderer.setPixelRatio(dpr)
            renderer.setSize(W, H, false)
            camera.aspect = W / H
            // fit the bottle by height; on narrow screens lift it to leave room for the words below
            const fill = isNarrow ? 0.54 : 0.74
            const tanH = Math.tan((camera.fov * Math.PI) / 360)
            const d = TOTAL_H / fill / (2 * tanH)
            camera.position.set(0, 0, d)
            camera.lookAt(0, 0, 0)
            const vh0 = 2 * d * tanH
            bottle.position.y = -TOTAL_H / 2 + (isNarrow ? 0.13 * vh0 : 0)
            camera.updateProjectionMatrix()
            camera.updateMatrixWorld()
            const vh = 2 * bgDist * Math.tan((camera.fov * Math.PI) / 360)
            bg.scale.set(vh * camera.aspect, vh, 1)
            setNarrow(isNarrow)
            const edge = project(1, 0, 0).x
            setDescPos({ x: Math.min(0.86, (edge + (W - edge) * 0.48) / W), y: 0.5 })
            drawMask()
            if (document.fonts && document.fonts.load) {
                Promise.all([
                    document.fonts.load(`400 80px "Instrument Serif"`),
                ]).then(() => !disposed && (drawMask(), isCanvas && renderOnce()))
            }
            if (isCanvas) renderOnce()
        }

        // ---- motion: slow near front and back, quicker in between
        let theta = startAngle * Math.PI / 180
        let vel = 0
        let dragging = false
        let lastX = 0
        let lastT = 0
        let backShown = false
        let textAmt = 1
        const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        const period = Math.max(6, seconds) * (reduce ? 1.8 : 1)
        const omega = (2 * Math.PI) / period / 0.675

        const onDown = (e: PointerEvent) => {
            dragging = true
            lastX = e.clientX
            vel = 0
            host.style.cursor = "grabbing"
        }
        const onMove = (e: PointerEvent) => {
            if (!dragging) return
            const dx = e.clientX - lastX
            lastX = e.clientX
            const d = (dx / Math.max(W, 1)) * Math.PI * 1.6
            theta += d
            vel = d * 60
        }
        const onUp = () => {
            dragging = false
            host.style.cursor = "grab"
        }
        host.addEventListener("pointerdown", onDown)
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const renderOnce = () => {
            bottle.rotation.y = -theta
            renderer.render(scene, camera)
        }

        const tick = (t: number) => {
            raf = requestAnimationFrame(tick)
            if (!visible) { lastT = t; return }
            const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016)
            lastT = t
            if (!dragging) {
                const s = Math.sin(theta)
                const auto = omega * (0.35 + 0.65 * s * s)
                vel += (auto - vel) * Math.min(1, dt * 1.6)
                theta += vel * dt
            }
            // how far the back label is from facing us
            const a = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
            const off = Math.abs(a - Math.PI)
            const want = backShown ? off < BACK_WINDOW_OUT : off < BACK_WINDOW_IN
            if (want !== backShown) {
                backShown = want
                setShowBack(want)
            }
            const target = backShown ? 0.08 : 1
            textAmt += (target - textAmt) * Math.min(1, dt * 2.2)
            bgMat.uniforms.uText.value = textAmt
            renderOnce()
        }

        const ro = new ResizeObserver(resize)
        ro.observe(host)
        resize()
        const io = new IntersectionObserver((es) => (visible = es[0].isIntersecting), { rootMargin: "120px" })
        io.observe(host)
        if (isCanvas) renderOnce()
        else raf = requestAnimationFrame(tick)

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            ro.disconnect()
            io.disconnect()
            host.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            scene.traverse((o: any) => {
                o.geometry?.dispose?.()
                const m = o.material
                if (m) (Array.isArray(m) ? m : [m]).forEach((mm: any) => { mm.map?.dispose?.(); mm.dispose?.() })
            })
            maskTex.dispose()
            env.dispose()
            pmrem.dispose()
            renderer.dispose()
        }
    }, [front, back, cap, title, paper, ink, seconds, startAngle, isCanvas])

    const corner: React.CSSProperties = {
        position: "absolute",
        fontFamily: `"Zen Kaku Gothic New", sans-serif`,
        fontSize: 11,
        letterSpacing: "0.14em",
        color: mute,
        pointerEvents: "none",
        whiteSpace: "nowrap",
    }
    const pad = narrow ? 20 : 40
    const ease = "cubic-bezier(.22,.61,.36,1)"

    return (
        <div
            ref={hostRef}
            style={{
                ...props.style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: paper,
                cursor: "grab",
                touchAction: "pan-y",
                userSelect: "none",
            }}
        >
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />

            {topLeft && <div style={{ ...corner, left: pad, top: pad }}>{topLeft}</div>}
            {topRight && <div style={{ ...corner, right: pad, top: pad, fontFamily: `"Instrument Serif", serif`, fontStyle: "italic", fontSize: 15, letterSpacing: "0.02em" }}>{topRight}</div>}
            {bottomLeft && <div style={{ ...corner, left: pad, bottom: narrow ? pad + 20 : pad }}>{bottomLeft}</div>}
            {bottomRight && <div style={narrow ? { ...corner, left: pad, bottom: pad } : { ...corner, right: pad, bottom: pad }}>{bottomRight}</div>}

            <div
                aria-live="polite"
                style={
                    narrow
                        ? {
                              position: "absolute",
                              left: 24,
                              right: 24,
                              bottom: 96,
                              textAlign: "center",
                              pointerEvents: "none",
                          }
                        : {
                              position: "absolute",
                              left: `${descPos.x * 100}%`,
                              top: "50%",
                              transform: "translate(-50%, -50%)",
                              writingMode: "vertical-rl",
                              pointerEvents: "none",
                          }
                }
            >
                {lines.map((l, i) => (
                    <p
                        key={i}
                        style={{
                            margin: 0,
                            fontFamily: `"Shippori Mincho", serif`,
                            fontSize: narrow ? 12.5 : 15,
                            lineHeight: narrow ? 2.1 : 2.6,
                            letterSpacing: narrow ? "0.06em" : "0.22em",
                            color: ink,
                            whiteSpace: "nowrap",
                            opacity: showBack || isCanvas ? 1 : 0,
                            filter: showBack || isCanvas ? "blur(0px)" : "blur(6px)",
                            transform: showBack || isCanvas ? "translate(0,0)" : narrow ? "translateY(6px)" : "translateY(-10px)",
                            transition: `opacity 1.6s ${ease}, filter 1.6s ${ease}, transform 1.8s ${ease}`,
                            transitionDelay: showBack ? `${0.25 + i * 0.32}s` : `${(lines.length - 1 - i) * 0.06}s`,
                        }}
                    >
                        {l}
                    </p>
                ))}
            </div>
        </div>
    )
}

YohakuGin.displayName = "Yohaku no Niwa GIN"

YohakuGin.defaultProps = {
    title: "Yohaku no Niwa GIN",
    description: DEFAULT_TEXT,
    topLeft: "",
    topRight: "",
    bottomLeft: "Forest Distilled Gin — Hinoki Leaves, Nagano",
    bottomRight: "500ml / 40% vol",
    paper: "#F7F7F5",
    ink: "#111111",
    mute: "#8C8B87",
    seconds: 26,
    startAngle: 20,
}

addPropertyControls(YohakuGin, {
    frontLabel: { type: ControlType.ResponsiveImage, title: "Front Label" },
    backLabel: { type: ControlType.ResponsiveImage, title: "Back Label" },
    capImage: { type: ControlType.ResponsiveImage, title: "Cap Wood" },
    title: { type: ControlType.String, title: "Title" },
    description: { type: ControlType.String, title: "Back Text", displayTextArea: true },
    topLeft: { type: ControlType.String, title: "Top Left" },
    topRight: { type: ControlType.String, title: "Top Right" },
    bottomLeft: { type: ControlType.String, title: "Bottom Left" },
    bottomRight: { type: ControlType.String, title: "Bottom Right" },
    seconds: { type: ControlType.Number, title: "Turn (s)", min: 8, max: 80, step: 1 },
    startAngle: { type: ControlType.Number, title: "Start (°)", min: 0, max: 359, step: 1 },
    paper: { type: ControlType.Color, title: "Paper" },
    ink: { type: ControlType.Color, title: "Ink" },
    mute: { type: ControlType.Color, title: "Mute" },
})

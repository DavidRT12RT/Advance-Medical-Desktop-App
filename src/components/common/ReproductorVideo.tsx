import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Select, Slider } from "antd";
import {
  CaretRightOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  PauseOutlined,
} from "@ant-design/icons";

const formatoTiempo = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "00:00";
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const seg = total % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = seg.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** Botón de control del reproductor (icono blanco sobre fondo translúcido). */
const BotonControl: React.FC<{
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  grande?: boolean;
}> = ({ onClick, title, children, grande }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`flex items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 active:bg-white/30 ${
      grande ? "w-11 h-11 text-2xl" : "w-9 h-9 text-lg"
    }`}
  >
    {children}
  </button>
);

/**
 * Reproductor de video de la app: controles superpuestos que se ocultan solos
 * durante la reproducción, botón central de play, barra de avance con scrub
 * en vivo, saltos de ±10 s, velocidad, pantalla completa y atajos de teclado
 * (espacio, ←/→, F). Corrige además los videos de MediaRecorder, que llegan
 * sin duración en los metadatos (Infinity) y por eso el <video controls>
 * nativo no permitía adelantar/atrasar. El ref expone el <video> interno
 * (p. ej. para capturar fotogramas).
 */
const ReproductorVideo = forwardRef<
  HTMLVideoElement,
  { src: string; crossOrigin?: "" | "anonymous" | "use-credentials" }
>(({ src, crossOrigin }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const marcoRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

  const [reproduciendo, setReproduciendo] = useState(false);
  const [duracion, setDuracion] = useState(0);
  const [tiempo, setTiempo] = useState(0);
  const [velocidad, setVelocidad] = useState(1);
  const [enFullscreen, setEnFullscreen] = useState(false);
  const [controlesVisibles, setControlesVisibles] = useState(true);
  const ocultarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrastrandoRef = useRef(false);

  // --- Estado del <video> -------------------------------------------------
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setTiempo(0);
    setDuracion(0);
    setReproduciendo(false);

    const onMeta = () => {
      if (Number.isFinite(v.duration)) {
        setDuracion(v.duration);
        return;
      }
      // MediaRecorder no escribe la duración: pedir un seek al "infinito"
      // fuerza al navegador a calcularla y dispara durationchange
      const estabaReproduciendo = !v.paused;
      const onDur = () => {
        if (Number.isFinite(v.duration)) {
          setDuracion(v.duration);
          v.removeEventListener("durationchange", onDur);
          v.currentTime = 0;
          // No interrumpir el autoplay por el truco del seek
          if (estabaReproduciendo) v.play().catch(() => undefined);
        }
      };
      v.addEventListener("durationchange", onDur);
      try {
        v.currentTime = 1e10;
      } catch {
        /* sin soporte de seek: se queda sin barra */
      }
    };
    const onTime = () => {
      if (!arrastrandoRef.current) setTiempo(v.currentTime);
      if (Number.isFinite(v.duration)) setDuracion(v.duration);
    };
    const onPlay = () => setReproduciendo(true);
    const onPause = () => setReproduciendo(false);

    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [src]);

  useEffect(() => {
    const onFs = () =>
      setEnFullscreen(document.fullscreenElement === marcoRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // --- Auto-ocultar controles durante la reproducción ---------------------
  const mostrarControles = useCallback(() => {
    setControlesVisibles(true);
    if (ocultarTimerRef.current) clearTimeout(ocultarTimerRef.current);
    ocultarTimerRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused && !arrastrandoRef.current) {
        setControlesVisibles(false);
      }
    }, 2600);
  }, []);

  useEffect(() => {
    if (!reproduciendo) setControlesVisibles(true);
    else mostrarControles();
  }, [reproduciendo, mostrarControles]);

  useEffect(
    () => () => {
      if (ocultarTimerRef.current) clearTimeout(ocultarTimerRef.current);
    },
    [],
  );

  // --- Acciones -----------------------------------------------------------
  const alternar = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  }, []);

  const saltar = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      const tope = Number.isFinite(v.duration) ? v.duration : duracion;
      v.currentTime = Math.min(Math.max(0, v.currentTime + delta), tope || 0);
      setTiempo(v.currentTime);
      mostrarControles();
    },
    [duracion, mostrarControles],
  );

  const scrub = (valor: number) => {
    arrastrandoRef.current = true;
    setTiempo(valor);
    // Scrub en vivo: el cuadro se actualiza mientras se arrastra
    const v = videoRef.current;
    if (v) v.currentTime = valor;
  };

  const finScrub = (valor: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = valor;
    setTiempo(valor);
    arrastrandoRef.current = false;
    mostrarControles();
  };

  const cambiarVelocidad = (valor: number) => {
    setVelocidad(valor);
    if (videoRef.current) videoRef.current.playbackRate = valor;
    mostrarControles();
  };

  const alternarFullscreen = useCallback(() => {
    if (document.fullscreenElement === marcoRef.current) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      marcoRef.current?.requestFullscreen?.().catch(() => undefined);
    }
  }, []);

  const onTeclado = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      alternar();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      saltar(-5);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      saltar(5);
    } else if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      alternarFullscreen();
    }
  };

  const barraVisible = controlesVisibles || !reproduciendo;

  return (
    <div
      ref={marcoRef}
      tabIndex={0}
      onKeyDown={onTeclado}
      onMouseMove={mostrarControles}
      onMouseLeave={() => {
        if (reproduciendo && !arrastrandoRef.current)
          setControlesVisibles(false);
      }}
      className={`relative bg-black rounded-lg overflow-hidden select-none outline-none group ${
        enFullscreen ? "flex items-center justify-center" : ""
      } ${barraVisible ? "" : "cursor-none"}`}
    >
      <video
        ref={videoRef}
        src={src}
        crossOrigin={crossOrigin}
        // Arranca solo al abrir (las grabaciones no llevan audio) y precarga
        // el primer cuadro para no mostrar un rectángulo negro
        autoPlay
        muted
        playsInline
        preload="auto"
        onClick={alternar}
        onDoubleClick={alternarFullscreen}
        className={`w-full object-contain ${
          enFullscreen ? "h-full" : "max-h-[62vh]"
        }`}
        style={enFullscreen ? undefined : { aspectRatio: "16 / 9" }}
      />

      {/* Botón central: aparece en pausa */}
      {!reproduciendo && (
        <button
          type="button"
          onClick={alternar}
          title="Reproducir"
          className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-black/55 hover:bg-black/70 border border-white/25 backdrop-blur-sm flex items-center justify-center transition-colors"
        >
          <CaretRightOutlined className="text-white text-4xl ml-1" />
        </button>
      )}

      {/* Barra de controles superpuesta con degradado */}
      <div
        className={`absolute inset-x-0 bottom-0 z-10 px-3 pb-2 pt-8 bg-gradient-to-t from-black/85 via-black/45 to-transparent transition-opacity duration-200 ${
          barraVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <Slider
          className="!my-1 mx-1"
          min={0}
          max={Math.max(duracion, 0.01)}
          step={0.05}
          value={Math.min(tiempo, duracion || tiempo)}
          tooltip={{ formatter: (v) => formatoTiempo(Number(v)) }}
          onChange={(v: number) => scrub(v)}
          onChangeComplete={(v: number) => finScrub(v)}
          disabled={!duracion}
          trackStyle={{ background: "#00c2c2", height: 5 }}
          railStyle={{ background: "rgba(255,255,255,0.28)", height: 5 }}
        />
        <div className="flex items-center gap-1.5">
          <BotonControl
            grande
            onClick={alternar}
            title={reproduciendo ? "Pausar (espacio)" : "Reproducir (espacio)"}
          >
            {reproduciendo ? <PauseOutlined /> : <CaretRightOutlined />}
          </BotonControl>
          <BotonControl onClick={() => saltar(-10)} title="Retroceder 10 s (←)">
            <span className="text-[13px] font-semibold leading-none">-10</span>
          </BotonControl>
          <BotonControl onClick={() => saltar(10)} title="Adelantar 10 s (→)">
            <span className="text-[13px] font-semibold leading-none">+10</span>
          </BotonControl>

          <span className="font-mono text-[13px] text-white/90 tabular-nums ml-1">
            {formatoTiempo(tiempo)}{" "}
            <span className="text-white/50">/ {formatoTiempo(duracion)}</span>
          </span>

          <div className="flex-1" />

          <Select
            size="small"
            value={velocidad}
            onChange={cambiarVelocidad}
            options={VELOCIDADES.map((vel) => ({
              value: vel,
              label: `${vel}×`,
            }))}
            popupMatchSelectWidth={false}
            // En fullscreen los popups del body no se ven: montarlo dentro
            getPopupContainer={() => marcoRef.current || document.body}
            className="reproductor-velocidad"
            variant="borderless"
            style={{ color: "#fff" }}
          />
          <BotonControl
            onClick={alternarFullscreen}
            title={
              enFullscreen
                ? "Salir de pantalla completa (F)"
                : "Pantalla completa (F)"
            }
          >
            {enFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          </BotonControl>
        </div>
      </div>
    </div>
  );
});

ReproductorVideo.displayName = "ReproductorVideo";

export default ReproductorVideo;

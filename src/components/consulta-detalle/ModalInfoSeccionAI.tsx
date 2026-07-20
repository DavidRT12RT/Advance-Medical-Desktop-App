import React, { useEffect, useRef, useState } from "react";
import { Modal, Button, message, Spin, Progress } from "antd";
import {
  CameraOutlined,
  CloudUploadOutlined,
  FolderOpenOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import FirebaseMedia from "../../features/FirebaseMedia";
import FirebaseEstudios from "../../features/FirebaseEstudios";
import ReproductorVideo from "../common/ReproductorVideo";

interface ModalInfoSeccionAIProps {
  isSessionModalOpen: boolean;
  setIsSessionModalOpen: (open: boolean) => void;
  selectedSessionIndex: number;
  aiSessions: any[];
  // Contexto para poder capturar fotogramas del video y persistirlos
  empresaId?: string;
  pacienteId?: string;
  estudioId?: string;
  onSeccionesActualizadas?: (nuevasSecciones: any[]) => void;
  /** Prefijo legible para las carpetas exportadas (p. ej. "Paciente - Tipo") */
  nombreCarpetaBase?: string;
}

const ModalInfoSeccionAI = ({
  isSessionModalOpen,
  setIsSessionModalOpen,
  selectedSessionIndex,
  aiSessions,
  empresaId,
  pacienteId,
  estudioId,
  onSeccionesActualizadas,
  nombreCarpetaBase,
}: ModalInfoSeccionAIProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [capturando, setCapturando] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fallback al respaldo local: si la sesión aún no tiene video en la nube
  // pero sí en el disco de esta computadora, se carga como blob y se
  // reproduce igual
  const [videoLocal, setVideoLocal] = useState<string | null>(null);
  const [cargandoVideoLocal, setCargandoVideoLocal] = useState(false);
  const [videoLocalNoDisponible, setVideoLocalNoDisponible] = useState(false);

  useEffect(() => {
    let urlCreada: string | null = null;
    setVideoLocal(null);
    setVideoLocalNoDisponible(false);

    const session = aiSessions[selectedSessionIndex];
    if (
      !isSessionModalOpen ||
      !session ||
      session.videoUrl ||
      !session.videoLocalPath
    ) {
      return;
    }

    let cancelado = false;
    setCargandoVideoLocal(true);
    (async () => {
      try {
        const api = (window as any).estudioExport;
        const res = await api?.leerArchivoLocal?.({
          ruta: session.videoLocalPath,
        });
        if (cancelado) return;
        if (!res?.success || !res.dataBase64) {
          setVideoLocalNoDisponible(true);
          return;
        }
        const binario = atob(res.dataBase64);
        const bytes = new Uint8Array(binario.length);
        for (let i = 0; i < binario.length; i++) {
          bytes[i] = binario.charCodeAt(i);
        }
        const esMp4 = String(session.videoLocalPath)
          .toLowerCase()
          .endsWith(".mp4");
        const blob = new Blob([bytes], {
          type: esMp4 ? "video/mp4" : "video/webm",
        });
        urlCreada = URL.createObjectURL(blob);
        setVideoLocal(urlCreada);
      } catch (error) {
        console.error("Error cargando video local:", error);
        if (!cancelado) setVideoLocalNoDisponible(true);
      } finally {
        if (!cancelado) setCargandoVideoLocal(false);
      }
    })();

    return () => {
      cancelado = true;
      if (urlCreada) URL.revokeObjectURL(urlCreada);
    };
  }, [isSessionModalOpen, selectedSessionIndex, aiSessions]);

  // --- Acciones de la sesión: respaldo a la nube y copias a memoria -------
  const [subiendoVideo, setSubiendoVideo] = useState(false);
  const [subida, setSubida] = useState<{
    pct: number;
    mbps: number | null;
    subidoMB: number;
    totalMB: number;
  } | null>(null);
  const muestrasSubidaRef = useRef<Array<{ t: number; bytes: number }>>([]);
  const [exportando, setExportando] = useState<string | null>(null);

  const carpetaSesion = () =>
    `${nombreCarpetaBase || "Estudio"} - Sesión ${
      selectedSessionIndex + 1
    }`.replace(/[\\/:*?"<>|]/g, "-");

  // Vuelve a intentar la subida del video usando el respaldo local en disco
  const subirVideoPendiente = async () => {
    const session = aiSessions[selectedSessionIndex];
    const api = (window as any).estudioExport;
    if (!api?.leerArchivoLocal || !session?.videoLocalPath) return;
    if (!empresaId || !pacienteId || !estudioId) return;
    setSubiendoVideo(true);
    setSubida(null);
    muestrasSubidaRef.current = [];
    try {
      const res = await api.leerArchivoLocal({ ruta: session.videoLocalPath });
      if (!res?.success || !res.dataBase64) {
        message.error(
          "El respaldo local del video no está disponible en esta computadora (se guardó en el equipo donde se hizo el estudio).",
        );
        return;
      }
      const binario = atob(res.dataBase64);
      const bytes = new Uint8Array(binario.length);
      for (let i = 0; i < binario.length; i++) {
        bytes[i] = binario.charCodeAt(i);
      }
      const esMp4 = String(session.videoLocalPath)
        .toLowerCase()
        .endsWith(".mp4");
      const contentType = esMp4 ? "video/mp4" : "video/webm";
      const videoBlob = new Blob([bytes], { type: contentType });

      const videoUrl = await FirebaseMedia.subirVideoDeEstudio(
        empresaId,
        pacienteId,
        estudioId,
        `respaldo_${selectedSessionIndex + 1}`,
        videoBlob,
        (percent, bytesSubidos, total) => {
          if (bytesSubidos === undefined || !total) return;
          const ahora = Date.now();
          const muestras = muestrasSubidaRef.current;
          muestras.push({ t: ahora, bytes: bytesSubidos });
          while (muestras.length > 1 && ahora - muestras[0].t > 5000) {
            muestras.shift();
          }
          const primera = muestras[0];
          const dt = (ahora - primera.t) / 1000;
          setSubida({
            pct: Math.round(percent),
            mbps:
              dt > 0.5
                ? ((bytesSubidos - primera.bytes) * 8) / dt / 1_000_000
                : null,
            subidoMB: bytesSubidos / 1_000_000,
            totalMB: total / 1_000_000,
          });
        },
        { extension: esMp4 ? "mp4" : "webm", contentType },
      );

      const nuevasSecciones = aiSessions.map((s, i) =>
        i === selectedSessionIndex ? { ...s, videoUrl } : s,
      );
      await FirebaseEstudios.actualizarEstudio(
        empresaId,
        pacienteId,
        estudioId,
        { secciones_ai: nuevasSecciones },
      );
      onSeccionesActualizadas?.(nuevasSecciones);
      message.success("Video respaldado en la nube correctamente");
    } catch (error) {
      console.error("Error subiendo el video pendiente:", error);
      message.error(
        "No se pudo subir el video. Revisa tu conexión a internet e inténtalo de nuevo.",
      );
    } finally {
      setSubiendoVideo(false);
      setSubida(null);
    }
  };

  // Copia el video a memoria USB/disco: nube si ya está subido; si no, el
  // respaldo local de esta computadora
  const guardarVideoSesion = async () => {
    const session = aiSessions[selectedSessionIndex];
    const api = (window as any).estudioExport;
    if (!api) return;
    setExportando("video");
    try {
      let res;
      if (session?.videoUrl) {
        const ext = String(session.videoUrl).includes(".mp4") ? "mp4" : "webm";
        res = await api.exportarCarpeta({
          nombreCarpeta: carpetaSesion(),
          archivos: [
            {
              nombre: `video_sesion_${selectedSessionIndex + 1}.${ext}`,
              url: session.videoUrl,
            },
          ],
        });
      } else if (session?.videoLocalPath) {
        res = await api.exportarArchivosLocales({
          nombreCarpeta: carpetaSesion(),
          rutas: [session.videoLocalPath],
        });
      } else {
        return;
      }
      if (res?.canceled) return;
      if (res?.success) {
        message.success(`Video guardado en ${res.destino}`);
      } else {
        message.error("No se pudo guardar el video en la memoria");
      }
    } catch (error) {
      console.error("Error exportando video de sesión:", error);
      message.error("No se pudo guardar el video en la memoria");
    } finally {
      setExportando(null);
    }
  };

  // Copia las capturas (automáticas + manuales) a memoria USB/disco
  const guardarFotosSesion = async () => {
    const session = aiSessions[selectedSessionIndex];
    const api = (window as any).estudioExport;
    if (!api) return;
    const urls: string[] = [
      ...(session?.polypImages || []),
      ...(session?.manualScreenshots || []),
    ].filter((u: any) => typeof u === "string");
    const rutasLocales: string[] = (session?.fotosLocales || []).filter(
      (r: any) => typeof r === "string",
    );
    setExportando("fotos");
    try {
      let res;
      if (urls.length > 0) {
        res = await api.exportarCarpeta({
          nombreCarpeta: carpetaSesion(),
          archivos: urls.map((url, i) => ({
            nombre: `captura_${i + 1}.jpg`,
            url,
          })),
        });
      } else if (rutasLocales.length > 0) {
        res = await api.exportarArchivosLocales({
          nombreCarpeta: carpetaSesion(),
          rutas: rutasLocales,
        });
      } else {
        return;
      }
      if (res?.canceled) return;
      if (res?.success) {
        message.success(
          `${res.guardados} captura(s) guardada(s) en ${res.destino}`,
        );
      } else {
        message.error("No se pudieron guardar las capturas en la memoria");
      }
    } catch (error) {
      console.error("Error exportando capturas de sesión:", error);
      message.error("No se pudieron guardar las capturas en la memoria");
    } finally {
      setExportando(null);
    }
  };

  // Muestra el video local en el explorador de archivos del sistema
  const abrirCarpetaVideoLocal = async () => {
    const session = aiSessions[selectedSessionIndex];
    const api = (window as any).estudioExport;
    if (!session?.videoLocalPath) return;
    if (!api?.mostrarEnCarpeta) {
      message.warning(
        "Cierra y vuelve a abrir la aplicación para habilitar esta función.",
      );
      return;
    }
    const res = await api.mostrarEnCarpeta({ ruta: session.videoLocalPath });
    if (!res?.success) {
      message.info(
        "El video local no está en esta computadora (se guardó en el equipo donde se hizo el estudio).",
      );
    }
  };

  // Captura el fotograma actual del video reproducido y lo agrega a las
  // capturas manuales de la sesión (queda disponible para el reporte)
  const capturarDelVideo = async () => {
    const video = videoRef.current;
    if (!video || !empresaId || !pacienteId || !estudioId) return;
    if (video.readyState < 2) {
      message.warning("El video aún no ha cargado");
      return;
    }
    try {
      setCapturando(true);
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible");
      ctx.drawImage(video, 0, 0);
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("No se pudo extraer el fotograma"))),
          "image/jpeg",
          0.95,
        ),
      );

      const url = await FirebaseMedia.subirFrameDeEstudio(
        empresaId,
        pacienteId,
        estudioId,
        "video_revision",
        Date.now(),
        blob,
      );

      const nuevasSecciones = aiSessions.map((s, i) =>
        i === selectedSessionIndex
          ? {
              ...s,
              manualScreenshots: [
                ...(Array.isArray(s.manualScreenshots)
                  ? s.manualScreenshots
                  : []),
                url,
              ],
            }
          : s,
      );
      await FirebaseEstudios.actualizarEstudio(empresaId, pacienteId, estudioId, {
        secciones_ai: nuevasSecciones,
      });
      onSeccionesActualizadas?.(nuevasSecciones);
      message.success("Fotograma capturado y agregado a las capturas manuales");
    } catch (error) {
      console.error("Error capturando fotograma del video:", error);
      message.error("No se pudo capturar el fotograma");
    } finally {
      setCapturando(false);
    }
  };

  return (
    <Modal
      open={isSessionModalOpen}
      onCancel={() => setIsSessionModalOpen(false)}
      footer={null}
      centered
      width="92vw"
      style={{ maxWidth: 1500 }}
      title={
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-gray-800">
            {`Sesión de IA ${selectedSessionIndex + 1}`}
          </span>
          <span className="text-xs text-gray-500">
            {aiSessions[selectedSessionIndex].timestamp
              ? dayjs(aiSessions[selectedSessionIndex].timestamp).format(
                  "DD/MM/YYYY HH:mm:ss",
                )
              : "Sin fecha registrada"}
          </span>
        </div>
      }
    >
      {(() => {
        const session = aiSessions[selectedSessionIndex];
        const cnn = session?.ia_cnn;
        const cnnSummary = cnn?.summary;
        const segments = cnn?.segments || [];
        const llm = session?.ia_llm;
        const polypImages: string[] = Array.isArray(session?.polypImages)
          ? session.polypImages
          : [];
        const manualScreenshots: string[] = Array.isArray(
          session?.manualScreenshots,
        )
          ? session.manualScreenshots
          : [];
        const videoUrl: string | undefined = session?.videoUrl;
        const videoSrc = videoUrl || videoLocal;
        const hayVideoLocalPendiente =
          !videoUrl && !!session?.videoLocalPath;
        const sessionMode = session?.mode || "unknown";
        const totalCapturas =
          polypImages.length + manualScreenshots.length ||
          (Array.isArray(session?.fotosLocales)
            ? session.fotosLocales.length
            : 0);

        return (
          <div className="space-y-5">
            {(videoSrc ||
              hayVideoLocalPendiente ||
              polypImages.length > 0 ||
              manualScreenshots.length > 0) && (
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 space-y-4">
                {/* Indicador de modo de sesión */}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-[12px] font-semibold ${
                      sessionMode === "with_ai"
                        ? "bg-green-600 text-white"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {sessionMode === "with_ai" ? "Con IA" : "Solo Video"}
                  </span>
                </div>

                {(videoSrc || hayVideoLocalPendiente) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                        Video de la sesión
                        {videoSrc && !videoUrl && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-orange-600 text-white text-[11px] font-semibold normal-case">
                            Local (sin respaldo en la nube)
                          </span>
                        )}
                      </p>
                      {videoSrc && empresaId && pacienteId && estudioId && (
                        <Button
                          size="small"
                          icon={<CameraOutlined />}
                          loading={capturando}
                          onClick={capturarDelVideo}
                          title="Captura el fotograma actual del video y lo agrega a las capturas manuales"
                        >
                          Capturar fotograma
                        </Button>
                      )}
                    </div>
                    {videoSrc ? (
                      <>
                        <ReproductorVideo
                          ref={videoRef}
                          src={videoSrc}
                          crossOrigin={videoUrl ? "anonymous" : undefined}
                        />
                        <p className="text-[12px] text-gray-500">
                          Pausa el video en el momento deseado y pulsa
                          "Capturar fotograma" para agregar esa imagen a las
                          capturas del estudio.
                        </p>
                      </>
                    ) : cargandoVideoLocal ? (
                      <div className="aspect-video w-full rounded-md bg-black/60 flex flex-col items-center justify-center gap-2">
                        <Spin />
                        <p className="text-xs text-gray-400 mb-0">
                          Cargando video local…
                        </p>
                      </div>
                    ) : videoLocalNoDisponible ? (
                      <div className="aspect-video w-full rounded-md bg-black/60 flex items-center justify-center px-6">
                        <p className="text-xs text-gray-400 text-center">
                          El video de esta sesión aún no está en la nube y su
                          respaldo local está en la computadora donde se hizo
                          el estudio.
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Acciones: respaldo a la nube y copias a memoria/disco */}
                <div className="flex flex-wrap items-center gap-2">
                  {hayVideoLocalPendiente && (
                    <Button
                      size="small"
                      type="primary"
                      icon={<CloudUploadOutlined />}
                      loading={subiendoVideo}
                      onClick={subirVideoPendiente}
                    >
                      Subir video a la nube
                    </Button>
                  )}
                  {(videoUrl || session?.videoLocalPath) && (
                    <Button
                      size="small"
                      icon={<VideoCameraOutlined />}
                      loading={exportando === "video"}
                      onClick={guardarVideoSesion}
                    >
                      Guardar video en memoria
                    </Button>
                  )}
                  {totalCapturas > 0 && (
                    <Button
                      size="small"
                      icon={<CameraOutlined />}
                      loading={exportando === "fotos"}
                      onClick={guardarFotosSesion}
                    >
                      Guardar capturas en memoria ({totalCapturas})
                    </Button>
                  )}
                  {session?.videoLocalPath && (
                    <Button
                      size="small"
                      icon={<FolderOpenOutlined />}
                      onClick={abrirCarpetaVideoLocal}
                    >
                      Abrir carpeta del video local
                    </Button>
                  )}
                </div>

                {polypImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-green-300 uppercase tracking-wide">
                        Detecciones IA (Pólipos)
                      </p>
                      <span className="text-[13px] text-gray-400">
                        {polypImages.length === 1
                          ? "1 imagen"
                          : `${polypImages.length} imágenes`}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-auto pr-1">
                      {polypImages.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewImage(url)}
                          className="relative group rounded-md overflow-hidden border-2 border-green-700 hover:border-green-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                        >
                          <img
                            src={url}
                            alt={`Pólipo detectado ${idx + 1}`}
                            className="w-full h-20 object-cover transform group-hover:scale-105 transition"
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-green-600 text-[12px] text-white font-semibold">
                            IA #{idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {manualScreenshots.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
                        Capturas Manuales
                      </p>
                      <span className="text-[13px] text-gray-400">
                        {manualScreenshots.length === 1
                          ? "1 captura"
                          : `${manualScreenshots.length} capturas`}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-auto pr-1">
                      {manualScreenshots.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewImage(url)}
                          className="relative group rounded-md overflow-hidden border-2 border-blue-700 hover:border-blue-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <img
                            src={url}
                            alt={`Captura manual ${idx + 1}`}
                            className="w-full h-20 object-cover transform group-hover:scale-105 transition"
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-[12px] text-white font-semibold">
                            #{idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Análisis de IA: una sola sección. Solo se muestran los
                bloques con datos; sin nada, un único aviso. */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Análisis de IA
              </p>
              {!cnnSummary && !llm ? (
                <p className="text-xs text-gray-500 mb-0">
                  Sin información de IA para esta sesión (se grabó sin el
                  servidor de análisis).
                </p>
              ) : (
                <div
                  className={`grid grid-cols-1 gap-4 ${
                    cnnSummary && llm ? "md:grid-cols-2" : ""
                  }`}
                >
                  {cnnSummary && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">
                        Detección (CNN)
                      </p>
                      <ul className="text-xs text-gray-700 space-y-1">
                        <li>{`Último frame: ${cnnSummary.lastFrame ?? "-"}`}</li>
                        <li>{`Último conteo de pólipos: ${
                          cnnSummary.lastPolypCount ?? 0
                        }`}</li>
                        <li>{`Eventos de pólipos: ${
                          cnnSummary.totalPolypEvents ?? 0
                        }`}</li>
                        <li>{`Segmentos relevantes: ${
                          cnnSummary.totalSegments ?? segments.length
                        }`}</li>
                        <li>{`Tiempo promedio último frame: ${
                          cnnSummary.lastProcessingTimeMs?.toFixed
                            ? cnnSummary.lastProcessingTimeMs.toFixed(2)
                            : cnnSummary.lastProcessingTimeMs || "-"
                        } ms`}</li>
                      </ul>
                    </div>
                  )}
                  {llm && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">
                        Interpretación (LLM)
                      </p>
                      <div className="space-y-1 text-xs text-gray-700">
                        <p>
                          {llm.has_polyp
                            ? "Pólipo detectado"
                            : "Sin pólipos detectados"}
                          {llm.severity && ` · Severidad: ${llm.severity}`}
                          {llm.confidence_level &&
                            ` · Confianza: ${llm.confidence_level}`}
                        </p>
                        {llm.description && (
                          <p className="text-gray-600 mt-1">
                            {llm.description}
                          </p>
                        )}
                        {llm.recommendations &&
                          Array.isArray(llm.recommendations) &&
                          llm.recommendations.length > 0 && (
                            <div className="mt-2">
                              <p className="font-semibold text-gray-600 mb-1">
                                Recomendaciones
                              </p>
                              <ul className="list-disc list-inside space-y-1">
                                {llm.recommendations.map(
                                  (rec: string, idx: number) => (
                                    <li key={idx}>{rec}</li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {segments.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Segmentos detectados
                </p>
                <div className="space-y-2 max-h-56 overflow-auto pr-1">
                  {segments.map((seg: any, idx: number) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">
                          {`Segmento ${idx + 1}`}
                          <span className="text-[13px] text-gray-500 ml-1">
                            {seg.className || "polyp"}
                          </span>
                        </p>
                        <p>{`Frames ${seg.startFrame ?? "-"} – ${
                          seg.endFrame ?? "-"
                        }`}</p>
                      </div>
                      <div className="md:text-right space-y-1">
                        <p>{`Confianza máx: ${
                          seg.maxConfidence
                            ? `${(seg.maxConfidence * 100).toFixed(1)}%`
                            : "-"
                        }`}</p>
                        {seg.startTimestamp && seg.endTimestamp && (
                          <p className="text-[13px] text-gray-500">
                            {dayjs(seg.startTimestamp).format("HH:mm:ss")}
                            {" – "}
                            {dayjs(seg.endTimestamp).format("HH:mm:ss")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewImage && (
              <Modal
                open={!!previewImage}
                footer={null}
                onCancel={() => setPreviewImage(null)}
                centered
                width={900}
              >
                <div className="w-full flex items-center justify-center bg-black rounded-md overflow-hidden">
                  <img
                    src={previewImage}
                    alt="Detalle de pólipo"
                    className="max-h-[75vh] w-auto object-contain"
                  />
                </div>
              </Modal>
            )}
          </div>
        );
      })()}

      {/* Modal bloqueante mientras se sube el video respaldado a la nube */}
      <Modal
        open={subiendoVideo}
        closable={false}
        maskClosable={false}
        keyboard={false}
        footer={null}
        centered
        width={400}
        zIndex={1100}
      >
        <div className="flex flex-col items-center gap-3 py-6">
          <Spin size="large" />
          <p className="text-base font-semibold text-gray-800">
            Subiendo video a la nube…
          </p>
          <Progress
            percent={subida?.pct ?? 0}
            status="active"
            strokeColor="#009b9b"
            className="w-full px-2"
          />
          {subida && subida.totalMB > 0 && (
            <p className="text-sm text-gray-600 text-center leading-relaxed mb-0">
              {subida.mbps !== null
                ? `Velocidad de subida: ${subida.mbps.toFixed(1)} Mbps`
                : "Midiendo velocidad de subida…"}
              <br />
              <span className="text-xs text-gray-400">
                {subida.subidoMB.toFixed(0)} de {subida.totalMB.toFixed(0)} MB
                — la duración depende de la velocidad de internet de este
                equipo
              </span>
            </p>
          )}
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            No cierres la aplicación.
          </p>
        </div>
      </Modal>
    </Modal>
  );
};

export default ModalInfoSeccionAI;

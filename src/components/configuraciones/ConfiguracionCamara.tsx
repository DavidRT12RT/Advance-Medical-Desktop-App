import React, { useEffect, useState } from "react";
import { Slider, Button, Alert, Select, Checkbox, InputNumber } from "antd";
import { UndoOutlined } from "@ant-design/icons";
import {
  AJUSTES_NEUTROS,
  BITRATES_CAPTURA,
  construirFiltro,
  esNeutro,
  resolucionesDisponibles,
  type VideoAjustes,
} from "../../utils/videoAjustes";
import { useVideoAjustes } from "../../hooks/useVideoAjustes";
import FiltrosVideoSVG from "../common/FiltrosVideoSVG";

/**
 * Sección de Configuración > Cámara y Video.
 * Edita los mismos ajustes (perfil del usuario, ver useVideoAjustes) que el
 * botón de ajustes dentro del módulo de detección.
 */
const ConfiguracionCamara: React.FC = () => {
  const { ajustes, actualizarAjustes: actualizar } = useVideoAjustes();

  // Ancho máximo real de la cámara: se consulta con un stream breve (se
  // cierra de inmediato) para listar solo resoluciones que el dispositivo
  // puede dar. Si falla (sin cámara/permiso), se listan todas.
  const [maxAnchoCamara, setMaxAnchoCamara] = useState<number | undefined>();
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        try {
          const caps = stream.getVideoTracks()[0]?.getCapabilities?.();
          if (!cancelado) setMaxAnchoCamara(caps?.width?.max ?? undefined);
        } finally {
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch {
        /* sin cámara o sin permiso: no se filtra el listado */
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const controles: Array<[keyof VideoAjustes, string, string]> = [
    ["brillo", "Brillo", "Ilumina u oscurece la imagen completa"],
    ["contraste", "Contraste", "Diferencia entre zonas claras y oscuras"],
    ["saturacion", "Color (saturación)", "Intensidad de los colores"],
    ["gamma", "Gamma", "Luminosidad de los tonos medios"],
  ];

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      {/* Defs SVG que referencian construirFiltro() para la vista previa
          (balance de color y nitidez) */}
      <FiltrosVideoSVG ajustes={ajustes} />
      <Alert
        type="info"
        showIcon
        message="Ajustes de imagen de la cámara"
        description="Estos ajustes se guardan en tu perfil de usuario — como el resto de configuraciones — y se aplican al video en vivo, a la grabación y a las capturas del procedimiento endoscópico. El análisis de IA siempre usa la imagen original de la cámara, sin ajustes. También puedes modificarlos durante un estudio con el botón de ajustes sobre el video."
        style={{ marginBottom: 24 }}
      />

      <div className="flex flex-col gap-4">
        {/* Resolución de captura: el dispositivo negocia su modo real más
            cercano a la preferencia (no falla si el modo exacto no existe) */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-800">
              Resolución de captura
            </span>
            <p className="text-xs text-gray-400 mt-0.5">
              Resolución del video en vivo, la grabación y las capturas.
              "Automática" usa la máxima que entregue tu cámara o capturadora;
              a mayor resolución, mayor tamaño del video guardado.
            </p>
          </div>
          <Select
            className="w-full max-w-sm"
            value={ajustes.resolucion ?? "auto"}
            onChange={(v) => actualizar({ resolucion: v })}
            options={resolucionesDisponibles(
              maxAnchoCamara,
              ajustes.resolucion,
            ).map((o) => ({ value: o.value, label: o.label }))}
          />
          {maxAnchoCamara && (
            <p className="text-xs text-gray-400 mt-1.5 mb-0">
              Solo se listan resoluciones que tu cámara puede entregar (máximo
              detectado: {maxAnchoCamara}px de ancho).
            </p>
          )}
        </div>

        {/* Calidad (bitrate) de la grabación */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-800">
              Calidad de grabación
            </span>
            <p className="text-xs text-gray-400 mt-0.5">
              Cantidad de datos por segundo (bitrate) del video guardado. En
              "Automático" se calcula según la resolución. Mayor calidad =
              archivo más grande y subida más lenta al finalizar el estudio.
            </p>
          </div>
          <Select
            className="w-full max-w-sm"
            value={ajustes.bitrate ?? "auto"}
            onChange={(v) => actualizar({ bitrate: v })}
            options={BITRATES_CAPTURA.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
        </div>

        {/* Datos quemados en la parte inferior del video grabado */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-800">
              Datos sobre el video grabado
            </span>
            <p className="text-xs text-gray-400 mt-0.5">
              Información que se imprime en la parte inferior del video
              guardado y de las grabaciones. No afecta al análisis de IA.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Checkbox
              checked={ajustes.overlayFechaHora !== false}
              onChange={(e) =>
                actualizar({ overlayFechaHora: e.target.checked })
              }
            >
              Fecha y hora
            </Checkbox>
            <Checkbox
              checked={ajustes.overlayNombre !== false}
              onChange={(e) => actualizar({ overlayNombre: e.target.checked })}
            >
              Nombre del paciente y estudio
            </Checkbox>
          </div>
        </div>

        {controles.map(([clave, etiqueta, descripcion]) => (
          <div
            key={clave}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex justify-between items-center mb-1 gap-2">
              <div>
                <span className="text-sm font-medium text-gray-800">
                  {etiqueta}
                </span>
                <p className="text-xs text-gray-400 mt-0.5">{descripcion}</p>
              </div>
              <span className="flex items-center gap-1 shrink-0">
                <InputNumber
                  min={25}
                  max={200}
                  value={ajustes[clave] as number}
                  onChange={(v) => {
                    if (typeof v === "number")
                      actualizar({ [clave]: Math.round(v) } as Partial<VideoAjustes>);
                  }}
                  addonAfter="%"
                  style={{ width: 110 }}
                />
                <Button
                  type="text"
                  icon={<UndoOutlined />}
                  disabled={ajustes[clave] === 100}
                  onClick={() =>
                    actualizar({ [clave]: 100 } as Partial<VideoAjustes>)
                  }
                  title="Restablecer este ajuste"
                />
              </span>
            </div>
            <Slider
              min={25}
              max={200}
              marks={{ 100: "normal" }}
              value={ajustes[clave]}
              onChange={(v) => actualizar({ [clave]: v } as Partial<VideoAjustes>)}
            />
          </div>
        ))}

        {/* Tono: desplaza todos los colores (grados de rotación de matiz) */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-1 gap-2">
            <div>
              <span className="text-sm font-medium text-gray-800">
                Tono (coloración)
              </span>
              <p className="text-xs text-gray-400 mt-0.5">
                Desplaza todos los colores de la imagen a la vez
              </p>
            </div>
            <span className="flex items-center gap-1 shrink-0">
              <InputNumber
                min={-180}
                max={180}
                value={ajustes.tono ?? 0}
                onChange={(v) => {
                  if (typeof v === "number")
                    actualizar({ tono: Math.round(v) });
                }}
                addonAfter="°"
                style={{ width: 110 }}
              />
              <Button
                type="text"
                icon={<UndoOutlined />}
                disabled={!ajustes.tono}
                onClick={() => actualizar({ tono: 0 })}
                title="Restablecer este ajuste"
              />
            </span>
          </div>
          <Slider
            min={-180}
            max={180}
            marks={{ 0: "normal" }}
            value={ajustes.tono ?? 0}
            onChange={(v) => actualizar({ tono: v })}
            tooltip={{ formatter: (v) => `${v}°` }}
          />
        </div>

        {/* Balance de color: ganancia independiente de cada color primario */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="mb-1">
            <span className="text-sm font-medium text-gray-800">
              Balance de color
            </span>
            <p className="text-xs text-gray-400 mt-0.5">
              Intensidad de cada color primario por separado — p. ej. más
              rojo o menos verde
            </p>
          </div>
          {([
            ["rojo", "Rojo"],
            ["verde", "Verde"],
            ["azul", "Azul"],
          ] as const).map(([clave, etiqueta]) => (
            <div key={clave}>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{etiqueta}</span>
                <span className="flex items-center gap-1">
                  <InputNumber
                    size="small"
                    min={25}
                    max={200}
                    value={ajustes[clave] ?? 100}
                    onChange={(v) => {
                      if (typeof v === "number")
                        actualizar({ [clave]: Math.round(v) });
                    }}
                    addonAfter="%"
                    style={{ width: 100 }}
                  />
                  <Button
                    size="small"
                    type="text"
                    icon={<UndoOutlined />}
                    disabled={(ajustes[clave] ?? 100) === 100}
                    onClick={() => actualizar({ [clave]: 100 })}
                    title="Restablecer este ajuste"
                  />
                </span>
              </div>
              <Slider
                min={25}
                max={200}
                marks={{ 100: "normal" }}
                value={ajustes[clave] ?? 100}
                onChange={(v) => actualizar({ [clave]: v })}
              />
            </div>
          ))}
        </div>

        {/* Nitidez: realce de bordes vía filtro SVG */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-1 gap-2">
            <div>
              <span className="text-sm font-medium text-gray-800">Nitidez</span>
              <p className="text-xs text-gray-400 mt-0.5">
                Realza los bordes y detalles finos de la imagen
              </p>
            </div>
            <span className="flex items-center gap-1 shrink-0">
              <InputNumber
                min={0}
                max={100}
                value={ajustes.nitidez ?? 0}
                onChange={(v) => {
                  if (typeof v === "number")
                    actualizar({ nitidez: Math.round(v) });
                }}
                addonAfter="%"
                style={{ width: 110 }}
              />
              <Button
                type="text"
                icon={<UndoOutlined />}
                disabled={!ajustes.nitidez}
                onClick={() => actualizar({ nitidez: 0 })}
                title="Restablecer este ajuste"
              />
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            marks={{ 0: "normal" }}
            value={ajustes.nitidez ?? 0}
            onChange={(v) => actualizar({ nitidez: v })}
          />
        </div>

        {/* Vista previa del filtro sobre un degradado de referencia */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-800 mb-2">Vista previa</p>
          <div
            className="h-16 rounded-md"
            style={{
              background:
                "linear-gradient(90deg, #000 0%, #555 25%, #aaa 50%, #fff 65%, #e53e3e 75%, #38a169 85%, #3182ce 95%)",
              filter: esNeutro(ajustes) ? undefined : construirFiltro(ajustes),
            }}
          />
          <p className="text-[13px] text-gray-400 mt-2">
            El degradado muestra cómo se verán negros, grises, blancos y
            colores con los ajustes actuales.
          </p>
        </div>

        <div>
          <Button
            icon={<UndoOutlined />}
            onClick={() =>
              // Restablece los ajustes de imagen; las preferencias técnicas
              // (resolución, bitrate, datos sobre el video) se conservan
              actualizar({
                ...AJUSTES_NEUTROS,
                resolucion: ajustes.resolucion,
                bitrate: ajustes.bitrate,
                overlayNombre: ajustes.overlayNombre,
                overlayFechaHora: ajustes.overlayFechaHora,
              })
            }
            disabled={esNeutro(ajustes)}
          >
            Restablecer valores normales
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionCamara;

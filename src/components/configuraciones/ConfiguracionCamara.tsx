import React from "react";
import { Slider, Button, Alert } from "antd";
import { UndoOutlined } from "@ant-design/icons";
import {
  AJUSTES_NEUTROS,
  construirFiltro,
  esNeutro,
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
        description="Estos ajustes se guardan en tu perfil de usuario — como el resto de configuraciones — y se aplican al video en vivo, a la grabación y a las capturas del módulo de detección. El análisis de IA siempre usa la imagen original de la cámara, sin ajustes. También puedes modificarlos durante un estudio con el botón de ajustes sobre el video."
        style={{ marginBottom: 24 }}
      />

      <div className="flex flex-col gap-4">
        {controles.map(([clave, etiqueta, descripcion]) => (
          <div
            key={clave}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex justify-between items-baseline mb-1">
              <div>
                <span className="text-sm font-medium text-gray-800">
                  {etiqueta}
                </span>
                <p className="text-xs text-gray-400 mt-0.5">{descripcion}</p>
              </div>
              <span className="font-mono text-sm text-gray-600">
                {ajustes[clave]}%
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
          <div className="flex justify-between items-baseline mb-1">
            <div>
              <span className="text-sm font-medium text-gray-800">
                Tono (coloración)
              </span>
              <p className="text-xs text-gray-400 mt-0.5">
                Desplaza todos los colores de la imagen a la vez
              </p>
            </div>
            <span className="font-mono text-sm text-gray-600">
              {ajustes.tono ?? 0}°
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
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-700">{etiqueta}</span>
                <span className="font-mono text-sm text-gray-600">
                  {ajustes[clave] ?? 100}%
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
          <div className="flex justify-between items-baseline mb-1">
            <div>
              <span className="text-sm font-medium text-gray-800">Nitidez</span>
              <p className="text-xs text-gray-400 mt-0.5">
                Realza los bordes y detalles finos de la imagen
              </p>
            </div>
            <span className="font-mono text-sm text-gray-600">
              {ajustes.nitidez ?? 0}%
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
            onClick={() => actualizar({ ...AJUSTES_NEUTROS })}
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

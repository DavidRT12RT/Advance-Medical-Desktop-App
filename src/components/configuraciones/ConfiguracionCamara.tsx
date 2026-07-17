import React, { useState } from "react";
import { Slider, Button, Alert } from "antd";
import { UndoOutlined } from "@ant-design/icons";
import {
  AJUSTES_NEUTROS,
  cargarAjustes,
  guardarAjustes,
  construirFiltro,
  esNeutro,
  type VideoAjustes,
} from "../../utils/videoAjustes";

/**
 * Sección de Configuración > Cámara y Video.
 * Edita los mismos ajustes (localStorage de esta máquina) que el botón de
 * ajustes dentro del módulo de detección; la vista previa usa la cámara.
 */
const ConfiguracionCamara: React.FC = () => {
  const [ajustes, setAjustes] = useState<VideoAjustes>(() => cargarAjustes());

  const actualizar = (parciales: Partial<VideoAjustes>) => {
    setAjustes((prev) => {
      const nuevos = { ...prev, ...parciales };
      guardarAjustes(nuevos);
      return nuevos;
    });
  };

  const controles: Array<[keyof VideoAjustes, string, string]> = [
    ["brillo", "Brillo", "Ilumina u oscurece la imagen completa"],
    ["contraste", "Contraste", "Diferencia entre zonas claras y oscuras"],
    ["saturacion", "Color (saturación)", "Intensidad de los colores"],
    ["gamma", "Gamma", "Luminosidad de los tonos medios"],
  ];

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <Alert
        type="info"
        showIcon
        message="Ajustes de imagen de la cámara"
        description="Estos ajustes se guardan en esta computadora y se aplican al video en vivo, a la grabación y a las capturas del módulo de detección. El análisis de IA siempre usa la imagen original de la cámara, sin ajustes. También puedes modificarlos durante un estudio con el botón de ajustes sobre el video."
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
          <p className="text-[11px] text-gray-400 mt-2">
            El degradado muestra cómo se verán negros, grises, blancos y
            colores con los ajustes actuales.
          </p>
        </div>

        <div>
          <Button
            icon={<UndoOutlined />}
            onClick={() => {
              guardarAjustes({ ...AJUSTES_NEUTROS });
              setAjustes({ ...AJUSTES_NEUTROS });
            }}
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

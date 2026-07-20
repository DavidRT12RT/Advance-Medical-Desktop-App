import React, { useState } from "react";
import { Alert, Select, message } from "antd";
// @ts-ignore
import { useElectronStore } from "../../hooks/useElectronStore";
import FirebaseConfiguraciones from "../../features/FirebaseConfiguraciones";

/** Niveles de zoom disponibles (porcentaje sobre el tamaño normal). */
const NIVELES_ZOOM = [
  { value: 90, label: "90% · Compacto" },
  { value: 100, label: "100% · Normal (predeterminado)" },
  { value: 110, label: "110% · Grande" },
  { value: 125, label: "125% · Muy grande" },
  { value: 140, label: "140% · Máximo" },
];

/**
 * Sección de Configuración > Pantalla: zoom de accesibilidad de toda la
 * aplicación. Se aplica al instante (webContents.setZoomFactor) y se guarda
 * por usuario en su perfil (configuraciones.zoomApp); al iniciar sesión se
 * restaura automáticamente.
 */
const ConfiguracionPantalla: React.FC = () => {
  const { user } = useElectronStore();
  const idEmpresa = user?.empresa?.id;
  const idOrganizacion = user?.usuarioDetail?.idOrganizacion;
  const idUsuario = user?.usuarioDetail?.id;

  const [zoom, setZoom] = useState<number>(
    () => user?.usuarioDetail?.configuraciones?.zoomApp || 100,
  );

  const cambiarZoom = async (valor: number) => {
    setZoom(valor);
    // Aplicar al instante en la ventana
    const api = (window as any).appZoom;
    if (!api?.setZoomFactor) {
      message.warning(
        "Cierra y vuelve a abrir la aplicación para poder cambiar el zoom.",
      );
    } else {
      try {
        const res = await api.setZoomFactor(valor / 100);
        if (res && res.success === false) {
          message.error("No se pudo aplicar el zoom en esta ventana");
        }
      } catch {
        message.error("No se pudo aplicar el zoom en esta ventana");
      }
    }
    // Persistir en el perfil
    if (!idEmpresa || !idOrganizacion || !idUsuario) return;
    try {
      await FirebaseConfiguraciones.actualizarZoomApp(
        idEmpresa,
        idOrganizacion,
        idUsuario,
        valor,
      );
    } catch {
      message.error("No se pudo guardar la preferencia de zoom");
    }
  };

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <Alert
        type="info"
        showIcon
        message="Tamaño de la aplicación"
        description="Escala todos los elementos de la aplicación (texto, botones, tablas) para verlos más grandes o más pequeños. Se guarda en tu perfil y se aplica cada vez que inicias sesión."
        style={{ marginBottom: 24 }}
      />

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="mb-2">
          <span className="text-sm font-medium text-gray-800">
            Zoom de la aplicación
          </span>
          <p className="text-xs text-gray-400 mt-0.5">
            El cambio se aplica de inmediato — elige el tamaño con el que veas
            más cómodo el texto y los botones.
          </p>
        </div>
        <Select
          className="w-full max-w-sm"
          value={zoom}
          onChange={cambiarZoom}
          options={NIVELES_ZOOM}
        />
      </div>
    </div>
  );
};

export default ConfiguracionPantalla;

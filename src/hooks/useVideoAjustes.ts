import { useEffect, useRef, useState } from "react";
// @ts-ignore
import { useElectronStore } from "./useElectronStore";
import FirebaseConfiguraciones from "../features/FirebaseConfiguraciones";
import { validarAjustes, type VideoAjustes } from "../utils/videoAjustes";

/** Milisegundos sin cambios antes de escribir a Firestore (los sliders
 *  disparan onChange continuamente durante el arrastre). */
const DEBOUNCE_MS = 800;

/**
 * Ajustes de imagen de la cámara del usuario actual — misma semántica que el
 * resto del módulo de configuración: viven ÚNICAMENTE en su perfil de
 * Firestore (configuraciones.videoAjustes) y lo siguen en cualquier
 * computadora; un perfil sin ajustes usa los valores neutros.
 * Lo usan el módulo de detección y Configuración > Cámara y Video.
 */
export function useVideoAjustes() {
  const { user } = useElectronStore();
  const idEmpresa = user?.empresa?.id;
  const idOrganizacion = user?.usuarioDetail?.idOrganizacion;
  const idUsuario = user?.usuarioDetail?.id;

  const [ajustes, setAjustes] = useState<VideoAjustes>(() =>
    validarAjustes(user?.usuarioDetail?.configuraciones?.videoAjustes)
  );
  const ajustesRef = useRef(ajustes);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendienteRef = useRef<VideoAjustes | null>(null);
  const idsRef = useRef({ idEmpresa, idOrganizacion, idUsuario });
  idsRef.current = { idEmpresa, idOrganizacion, idUsuario };

  const escribirPerfil = (aGuardar: VideoAjustes) => {
    const ids = idsRef.current;
    if (!ids.idEmpresa || !ids.idOrganizacion || !ids.idUsuario) return;
    FirebaseConfiguraciones.actualizarVideoAjustes(
      ids.idEmpresa,
      ids.idOrganizacion,
      ids.idUsuario,
      aGuardar
    ).catch(() => {
      /* ya se logea en el servicio; la caché local conserva los valores y el
         siguiente cambio reintenta */
    });
  };

  const actualizarAjustes = (parciales: Partial<VideoAjustes>) => {
    const nuevos = { ...ajustesRef.current, ...parciales };
    ajustesRef.current = nuevos;
    setAjustes(nuevos);
    pendienteRef.current = nuevos;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const pendiente = pendienteRef.current;
      pendienteRef.current = null;
      if (pendiente) escribirPerfil(pendiente);
    }, DEBOUNCE_MS);
  };

  // Al desmontar (cambiar de página/pestaña), volcar el guardado pendiente
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const pendiente = pendienteRef.current;
      pendienteRef.current = null;
      if (pendiente) escribirPerfil(pendiente);
    };
  }, []);

  return { ajustes, actualizarAjustes };
}

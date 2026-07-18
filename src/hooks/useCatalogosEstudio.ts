import { useCallback, useEffect, useState } from "react";
import { message } from "antd";
import { useElectronStore } from "./useElectronStore";
import FirebaseCatalogos from "../features/FirebaseCatalogos";
import {
  CATALOGOS_ESTUDIO_DEFAULTS,
  ClaveCatalogo,
} from "../utils/catalogosEstudio";

/**
 * Carga los catálogos editables del usuario una sola vez y expone
 * agregar/eliminar con actualización optimista + persistencia en su perfil.
 * Si una clave no tiene lista guardada, se usan los defaults del código.
 */
export function useCatalogosEstudio() {
  const { user } = useElectronStore();
  const idEmpresa = user?.empresa?.id;
  const idOrganizacion = user?.usuarioDetail?.idOrganizacion;
  const idUsuario = user?.usuarioDetail?.id;

  const [catalogos, setCatalogos] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalogos = async () => {
      if (!idEmpresa || !idOrganizacion || !idUsuario) {
        setLoading(false);
        return;
      }
      try {
        const guardados = await FirebaseCatalogos.obtenerCatalogos(
          idEmpresa,
          idOrganizacion,
          idUsuario,
        );
        setCatalogos(guardados);
      } catch (error) {
        console.error("Error obteniendo catálogos del usuario:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogos();
  }, [idEmpresa, idOrganizacion, idUsuario]);

  const items = useCallback(
    (clave: ClaveCatalogo): string[] =>
      catalogos[clave] ?? CATALOGOS_ESTUDIO_DEFAULTS[clave] ?? [],
    [catalogos],
  );

  const persistir = useCallback(
    async (clave: ClaveCatalogo, nuevos: string[]) => {
      setCatalogos((prev) => ({ ...prev, [clave]: nuevos }));
      if (!idEmpresa || !idOrganizacion || !idUsuario) {
        console.warn("Sin sesión completa: el catálogo no se persistirá");
        return;
      }
      try {
        await FirebaseCatalogos.guardarCatalogo(
          idEmpresa,
          idOrganizacion,
          idUsuario,
          clave,
          nuevos,
        );
      } catch (error) {
        console.error("Error guardando catálogo:", error);
        message.error("No se pudo guardar el listado");
      }
    },
    [idEmpresa, idOrganizacion, idUsuario],
  );

  const agregarItem = useCallback(
    (clave: ClaveCatalogo, valor: string) => {
      const v = (valor || "").trim();
      if (!v) return;
      const actuales = items(clave);
      if (actuales.some((i) => i.toLowerCase() === v.toLowerCase())) return;
      persistir(clave, [...actuales, v]);
    },
    [items, persistir],
  );

  const eliminarItem = useCallback(
    (clave: ClaveCatalogo, valor: string) => {
      persistir(
        clave,
        items(clave).filter((i) => i !== valor),
      );
    },
    [items, persistir],
  );

  const renombrarItem = useCallback(
    (clave: ClaveCatalogo, anterior: string, nuevo: string) => {
      const v = (nuevo || "").trim();
      if (!v || v === anterior) return;
      const actuales = items(clave);
      if (
        actuales.some(
          (i) => i !== anterior && i.toLowerCase() === v.toLowerCase(),
        )
      ) {
        message.warning("Ya existe una entrada con ese nombre");
        return;
      }
      persistir(
        clave,
        actuales.map((i) => (i === anterior ? v : i)),
      );
    },
    [items, persistir],
  );

  /** Reincorpora los valores sugeridos del código sin perder los propios. */
  const restaurarSugeridos = useCallback(
    (clave: ClaveCatalogo) => {
      const actuales = items(clave);
      const faltantes = (CATALOGOS_ESTUDIO_DEFAULTS[clave] ?? []).filter(
        (d) => !actuales.some((i) => i.toLowerCase() === d.toLowerCase()),
      );
      if (!faltantes.length) return;
      persistir(clave, [...actuales, ...faltantes]);
    },
    [items, persistir],
  );

  return {
    items,
    agregarItem,
    eliminarItem,
    renombrarItem,
    restaurarSugeridos,
    loading,
  };
}

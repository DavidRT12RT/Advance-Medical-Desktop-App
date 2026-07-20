import { useCallback, useEffect, useState } from "react";
import { message } from "antd";
import { useElectronStore } from "./useElectronStore";
import FirebaseCatalogos from "../features/FirebaseCatalogos";
import {
  CATALOGOS_ESTUDIO_DEFAULTS,
  CLAVES_CON_DETALLES,
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

  const [catalogos, setCatalogos] = useState<Record<string, any>>({});
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
      (catalogos[clave] as string[]) ?? CATALOGOS_ESTUDIO_DEFAULTS[clave] ?? [],
    [catalogos],
  );

  const persistir = useCallback(
    async (clave: string, nuevos: any[]) => {
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
      const claveDetalles = CLAVES_CON_DETALLES[clave];
      if (claveDetalles) {
        const detalles = ((catalogos[claveDetalles] as any[]) || []).filter(
          (d) => d?.nombre !== valor,
        );
        persistir(claveDetalles, detalles);
      }
    },
    [items, persistir, catalogos],
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
      // La cédula/especialidad del personal médico viajan con el nombre
      const claveDetalles = CLAVES_CON_DETALLES[clave];
      if (claveDetalles) {
        const detalles = ((catalogos[claveDetalles] as any[]) || []).map((d) =>
          d?.nombre === anterior ? { ...d, nombre: v } : d,
        );
        persistir(claveDetalles, detalles);
      }
    },
    [items, persistir, catalogos],
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

  // --- Detalles por persona (médicos tratantes, anestesiólogos) -----------
  // Además del listado de nombres, se recuerda la cédula y especialidad de
  // cada persona: al seleccionarla en un estudio se autocompletan, y al
  // guardar un estudio con esos campos llenos la asociación se actualiza.
  const detalleDe = useCallback(
    (
      clave: ClaveCatalogo,
      nombre?: string,
    ): { nombre: string; cedula?: string; especialidad?: string } | undefined => {
      const claveDetalles = CLAVES_CON_DETALLES[clave];
      if (!nombre || !claveDetalles) return undefined;
      const lista = (catalogos[claveDetalles] as any[]) || [];
      return lista.find((d) => d?.nombre === nombre);
    },
    [catalogos],
  );

  const guardarDetalleDe = useCallback(
    (
      clave: ClaveCatalogo,
      nombre: string,
      datos: { cedula?: string; especialidad?: string },
    ) => {
      const claveDetalles = CLAVES_CON_DETALLES[clave];
      const n = (nombre || "").trim();
      if (!n || !claveDetalles) return;
      const lista = ((catalogos[claveDetalles] as any[]) || []).filter(
        (d) => d?.nombre,
      );
      const entrada = {
        nombre: n,
        cedula: datos.cedula || "",
        especialidad: datos.especialidad || "",
      };
      const idx = lista.findIndex((d) => d.nombre === n);
      if (
        idx >= 0 &&
        lista[idx].cedula === entrada.cedula &&
        lista[idx].especialidad === entrada.especialidad
      ) {
        return; // sin cambios: evitar escrituras innecesarias
      }
      const nuevos =
        idx >= 0
          ? lista.map((d, i) => (i === idx ? entrada : d))
          : [...lista, entrada];
      persistir(claveDetalles, nuevos);
    },
    [catalogos, persistir],
  );

  return {
    items,
    agregarItem,
    eliminarItem,
    renombrarItem,
    restaurarSugeridos,
    detalleDe,
    guardarDetalleDe,
    loading,
  };
}

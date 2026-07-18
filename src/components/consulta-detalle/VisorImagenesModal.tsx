import React, { useCallback, useEffect, useState } from "react";
import { Button, Modal, Tooltip } from "antd";
import {
  LeftOutlined,
  RightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BgColorsOutlined,
} from "@ant-design/icons";

interface VisorImagenesModalProps {
  isOpen: boolean;
  imagenes: string[];
  indiceInicial: number;
  onClose: () => void;
  getDisplayUrl: (url: string) => string;
  esSeleccionada: (url: string) => boolean;
  onToggleSeleccion: (url: string) => void;
  onEditar: (url: string) => void;
  esEditada: (url: string) => boolean;
  etiqueta: (indice: number) => string;
  /** Pausa el teclado del visor (p. ej. con el editor abierto encima) */
  tecladoPausado?: boolean;
}

/**
 * Visor a pantalla casi completa para escoger las fotografías del reporte
 * viendo el detalle: navegación con flechas (botones y teclado), zoom con la
 * rueda del mouse, selección con Espacio/Enter y acceso directo al editor.
 */
const VisorImagenesModal: React.FC<VisorImagenesModalProps> = ({
  isOpen,
  imagenes,
  indiceInicial,
  onClose,
  getDisplayUrl,
  esSeleccionada,
  onToggleSeleccion,
  onEditar,
  esEditada,
  etiqueta,
  tecladoPausado = false,
}) => {
  const [indice, setIndice] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setIndice(Math.min(Math.max(indiceInicial, 0), imagenes.length - 1));
      setZoom(1);
    }
  }, [isOpen, indiceInicial, imagenes.length]);

  const irAnterior = useCallback(() => {
    setIndice((i) => Math.max(0, i - 1));
    setZoom(1);
  }, []);

  const irSiguiente = useCallback(() => {
    setIndice((i) => Math.min(imagenes.length - 1, i + 1));
    setZoom(1);
  }, [imagenes.length]);

  const url = imagenes[indice];
  const seleccionada = url ? esSeleccionada(url) : false;

  // Teclado: flechas para navegar, Espacio/Enter para seleccionar
  useEffect(() => {
    if (!isOpen || tecladoPausado) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const objetivo = e.target as HTMLElement | null;
      if (
        objetivo &&
        (objetivo.tagName === "INPUT" || objetivo.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        irAnterior();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        irSiguiente();
      } else if ((e.key === " " || e.key === "Enter") && url) {
        e.preventDefault();
        onToggleSeleccion(url);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, tecladoPausado, irAnterior, irSiguiente, onToggleSeleccion, url]);

  const handleWheel = (e: React.WheelEvent) => {
    setZoom((z) =>
      Math.min(4, Math.max(1, z + (e.deltaY < 0 ? 0.25 : -0.25))),
    );
  };

  if (!url) return null;

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      centered
      width="96vw"
      style={{ maxWidth: 1700 }}
      styles={{ content: { backgroundColor: "#111827", padding: 12 } }}
      closable
      destroyOnClose
    >
      <div className="flex flex-col gap-3">
        {/* Encabezado: etiqueta y contador */}
        <div className="flex items-center justify-between px-2 pr-10">
          <span className="text-sm font-semibold text-gray-200">
            {etiqueta(indice)}
            {esEditada(url) && (
              <span className="ml-2 px-1.5 py-0.5 rounded bg-green-600 text-[10px] text-white font-semibold">
                Editada
              </span>
            )}
          </span>
          <span className="text-sm text-gray-400">
            {indice + 1} / {imagenes.length}
          </span>
        </div>

        {/* Imagen en grande con navegación */}
        <div
          className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center h-[74vh]"
          onWheel={handleWheel}
          onDoubleClick={() => setZoom(1)}
        >
          <img
            src={getDisplayUrl(url)}
            alt={etiqueta(indice)}
            className="max-w-full max-h-full object-contain select-none transition-transform duration-100"
            style={{ transform: `scale(${zoom})`, cursor: "zoom-in" }}
            draggable={false}
          />
          {indice > 0 && (
            <Button
              shape="circle"
              size="large"
              icon={<LeftOutlined />}
              onClick={irAnterior}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
          )}
          {indice < imagenes.length - 1 && (
            <Button
              shape="circle"
              size="large"
              icon={<RightOutlined />}
              onClick={irSiguiente}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
          )}
          {zoom > 1 && (
            <span className="absolute bottom-2 right-3 px-2 py-0.5 rounded bg-black/70 text-xs text-white">
              {Math.round(zoom * 100)}%
            </span>
          )}
        </div>

        {/* Barra de acciones */}
        <div className="flex items-center justify-between px-2 flex-wrap gap-2">
          <span className="text-[11px] text-gray-500">
            ← / → navegar · Espacio o Enter seleccionar · rueda del mouse zoom
            · doble clic restablecer zoom
          </span>
          <div className="flex items-center gap-2">
            <Tooltip title="Abrir en el editor (ajustes, señalizaciones, recorte)">
              <Button
                icon={<BgColorsOutlined />}
                onClick={() => onEditar(url)}
              >
                Editar
              </Button>
            </Tooltip>
            <Button
              type={seleccionada ? "default" : "primary"}
              danger={seleccionada}
              icon={
                seleccionada ? <CloseCircleOutlined /> : <CheckCircleOutlined />
              }
              onClick={() => onToggleSeleccion(url)}
            >
              {seleccionada ? "Quitar del reporte" : "Incluir en el reporte"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default VisorImagenesModal;

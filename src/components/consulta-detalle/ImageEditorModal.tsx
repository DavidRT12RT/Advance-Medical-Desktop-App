import React, { useState, useRef, useEffect } from "react";
import { Modal, Slider, Button, Space, Tooltip, ColorPicker } from "antd";
import type { Color } from "antd/es/color-picker";
import {
  RotateLeftOutlined,
  RotateRightOutlined,
  UndoOutlined,
  CheckOutlined,
  EditOutlined,
  ArrowRightOutlined,
  BorderOutlined,
  RadiusSettingOutlined,
  FontSizeOutlined,
  ClearOutlined,
  ScissorOutlined,
} from "@ant-design/icons";
import { construirFiltro } from "../../utils/videoAjustes";

interface ImageEditorModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (editedImageUrl: string) => void;
}

type DrawingTool =
  | "none"
  | "pencil"
  | "arrow"
  | "rectangle"
  | "circle"
  | "text"
  | "crop";

interface DrawingElement {
  type: DrawingTool;
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
  color: string;
  lineWidth: number;
  text?: string;
  points?: { x: number; y: number }[];
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onSave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [gamma, setGamma] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
    null,
  );

  // Drawing tools state
  const [currentTool, setCurrentTool] = useState<DrawingTool>("none");
  const [drawingColor, setDrawingColor] = useState("#FF0000");
  const [lineWidth, setLineWidth] = useState(3);
  const [drawings, setDrawings] = useState<DrawingElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingElement | null>(
    null,
  );

  useEffect(() => {
    if (isOpen && imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setOriginalImage(img);
        redrawCanvas(img, 100, 100, 100, 100, 0, []);
      };
      img.src = imageUrl;
    }
  }, [isOpen, imageUrl]);

  useEffect(() => {
    if (originalImage) {
      redrawCanvas(
        originalImage,
        brightness,
        contrast,
        saturation,
        gamma,
        rotation,
        drawings,
      );
    }
  }, [
    brightness,
    contrast,
    saturation,
    gamma,
    rotation,
    originalImage,
    drawings,
    currentDrawing,
  ]);

  const redrawCanvas = (
    img: HTMLImageElement,
    bright: number,
    cont: number,
    sat: number,
    gam: number,
    rot: number,
    drawingsList: DrawingElement[],
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const angle = (rot * Math.PI) / 180;
    const width = img.width;
    const height = img.height;

    if (rot === 90 || rot === 270) {
      canvas.width = height;
      canvas.height = width;
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(angle);
    ctx.translate(-width / 2, -height / 2);

    // Mismo filtro que la captura de video en tiempo real (videoAjustes)
    ctx.filter = construirFiltro({
      brillo: bright,
      contraste: cont,
      saturacion: sat,
      gamma: gam,
    });
    ctx.drawImage(img, 0, 0, width, height);

    ctx.restore();

    // Draw all saved drawings
    drawingsList.forEach((drawing) => renderDrawing(ctx, drawing));

    // Draw current drawing if exists
    if (currentDrawing) {
      renderDrawing(ctx, currentDrawing);
    }
  };

  const renderDrawing = (
    ctx: CanvasRenderingContext2D,
    drawing: DrawingElement,
  ) => {
    ctx.strokeStyle = drawing.color;
    ctx.fillStyle = drawing.color;
    ctx.lineWidth = drawing.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (drawing.type) {
      case "pencil":
        if (drawing.points && drawing.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
          drawing.points.forEach((point) => ctx.lineTo(point.x, point.y));
          ctx.stroke();
        }
        break;

      case "arrow":
        if (drawing.endX !== undefined && drawing.endY !== undefined) {
          drawArrow(
            ctx,
            drawing.startX,
            drawing.startY,
            drawing.endX,
            drawing.endY,
          );
        }
        break;

      case "rectangle":
        if (drawing.endX !== undefined && drawing.endY !== undefined) {
          const width = drawing.endX - drawing.startX;
          const height = drawing.endY - drawing.startY;
          ctx.strokeRect(drawing.startX, drawing.startY, width, height);
        }
        break;

      case "circle":
        if (drawing.endX !== undefined && drawing.endY !== undefined) {
          const radius = Math.sqrt(
            Math.pow(drawing.endX - drawing.startX, 2) +
              Math.pow(drawing.endY - drawing.startY, 2),
          );
          ctx.beginPath();
          ctx.arc(drawing.startX, drawing.startY, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;

      case "text":
        if (drawing.text) {
          ctx.font = `${drawing.lineWidth * 8}px Arial`;
          ctx.fillText(drawing.text, drawing.startX, drawing.startY);
        }
        break;

      case "crop":
        if (drawing.endX !== undefined && drawing.endY !== undefined) {
          ctx.save();
          ctx.setLineDash([8, 5]);
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            drawing.startX,
            drawing.startY,
            drawing.endX - drawing.startX,
            drawing.endY - drawing.startY,
          );
          ctx.restore();
        }
        break;
    }
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6),
    );
    ctx.stroke();
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === "none") return;

    const { x, y } = getCanvasCoordinates(e);

    if (currentTool === "text") {
      // Para texto, no necesitamos isDrawing
      const text = prompt("Ingrese el texto:");
      if (text) {
        const newDrawing: DrawingElement = {
          type: "text",
          startX: x,
          startY: y,
          color: drawingColor,
          lineWidth,
          text,
        };
        setDrawings([...drawings, newDrawing]);
      }
      // No resetear la herramienta para permitir múltiples textos
      return;
    }

    setIsDrawing(true);

    if (currentTool === "pencil") {
      setCurrentDrawing({
        type: "pencil",
        startX: x,
        startY: y,
        color: drawingColor,
        lineWidth,
        points: [{ x, y }],
      });
    } else {
      setCurrentDrawing({
        type: currentTool,
        startX: x,
        startY: y,
        color: drawingColor,
        lineWidth,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentDrawing) return;

    const { x, y } = getCanvasCoordinates(e);

    if (currentTool === "pencil") {
      setCurrentDrawing({
        ...currentDrawing,
        points: [...(currentDrawing.points || []), { x, y }],
      });
    } else {
      setCurrentDrawing({
        ...currentDrawing,
        endX: x,
        endY: y,
      });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentDrawing) {
      if (currentDrawing.type === "crop") {
        aplicarRecorte(currentDrawing);
      } else {
        setDrawings([...drawings, currentDrawing]);
      }
      setCurrentDrawing(null);
    }
    setIsDrawing(false);
  };

  // Recorta el área seleccionada: lo ya aplicado (ajustes, rotación y
  // dibujos) queda horneado en la nueva imagen base y los controles vuelven
  // a neutro. "Restablecer Todo" regresa a la imagen original completa.
  const aplicarRecorte = (recorte: DrawingElement) => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImage) return;
    if (recorte.endX === undefined || recorte.endY === undefined) return;

    const x = Math.max(0, Math.min(recorte.startX, recorte.endX));
    const y = Math.max(0, Math.min(recorte.startY, recorte.endY));
    const w = Math.min(canvas.width, Math.max(recorte.startX, recorte.endX)) - x;
    const h =
      Math.min(canvas.height, Math.max(recorte.startY, recorte.endY)) - y;
    if (w < 20 || h < 20) return; // selección demasiado chica: ignorar

    // Redibujar sin el recuadro punteado antes de copiar el área
    redrawCanvas(
      originalImage,
      brightness,
      contrast,
      saturation,
      gamma,
      rotation,
      drawings,
    );

    const recortado = document.createElement("canvas");
    recortado.width = w;
    recortado.height = h;
    recortado.getContext("2d")?.drawImage(canvas, x, y, w, h, 0, 0, w, h);

    const nuevaBase = new Image();
    nuevaBase.onload = () => {
      setOriginalImage(nuevaBase);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setGamma(100);
      setRotation(0);
      setDrawings([]);
      setCurrentTool("none");
    };
    nuevaBase.src = recortado.toDataURL("image/jpeg", 0.95);
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setGamma(100);
    setRotation(0);
    setDrawings([]);
    setCurrentTool("none");
    // Deshacer también el recorte: recargar la imagen original
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setOriginalImage(img);
    img.src = imageUrl;
  };

  const handleClearDrawings = () => {
    setDrawings([]);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const editedUrl = URL.createObjectURL(blob);
          onSave(editedUrl);
        }
      },
      "image/jpeg",
      0.95,
    );
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      width="92vw"
      style={{ maxWidth: 1400 }}
      centered
      title={
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">Editor de Imagen</span>
        </div>
      }
      footer={
        <div className="flex justify-between items-center">
          <Space>
            <Button icon={<UndoOutlined />} onClick={handleReset}>
              Restablecer Todo
            </Button>
            <Button
              icon={<ClearOutlined />}
              onClick={handleClearDrawings}
              danger
            >
              Limpiar Dibujos
            </Button>
          </Space>
          <Space>
            <Button onClick={onClose}>Cancelar</Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleSave}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              Guardar Cambios
            </Button>
          </Space>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Barra de herramientas de dibujo */}
        <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-700 mr-2">
              Herramientas:
            </span>
            <Tooltip title="Lápiz">
              <Button
                type={currentTool === "pencil" ? "primary" : "default"}
                icon={<EditOutlined />}
                onClick={() => setCurrentTool("pencil")}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Flecha">
              <Button
                type={currentTool === "arrow" ? "primary" : "default"}
                icon={<ArrowRightOutlined />}
                onClick={() => setCurrentTool("arrow")}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Rectángulo">
              <Button
                type={currentTool === "rectangle" ? "primary" : "default"}
                icon={<BorderOutlined />}
                onClick={() => setCurrentTool("rectangle")}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Círculo">
              <Button
                type={currentTool === "circle" ? "primary" : "default"}
                icon={<RadiusSettingOutlined />}
                onClick={() => setCurrentTool("circle")}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Texto">
              <Button
                type={currentTool === "text" ? "primary" : "default"}
                icon={<FontSizeOutlined />}
                onClick={() => setCurrentTool("text")}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Recortar: arrastra el área que quieres conservar">
              <Button
                type={currentTool === "crop" ? "primary" : "default"}
                icon={<ScissorOutlined />}
                onClick={() => setCurrentTool("crop")}
                size="small"
              />
            </Tooltip>

            <div className="h-6 w-px bg-gray-300 mx-2" />

            <span className="text-xs text-gray-600">Color:</span>
            <ColorPicker
              value={drawingColor}
              onChange={(color: Color) => setDrawingColor(color.toHexString())}
              size="small"
            />

            <span className="text-xs text-gray-600 ml-2">Grosor:</span>
            <Slider
              min={1}
              max={10}
              value={lineWidth}
              onChange={setLineWidth}
              style={{ width: 80 }}
              tooltip={{ formatter: (value) => `${value}px` }}
            />
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 flex justify-center items-center min-h-[400px]">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[55vh] object-contain cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Brillo
                </span>
                <span className="text-xs text-gray-500">{brightness}%</span>
              </div>
              <Slider
                min={25}
                max={200}
                value={brightness}
                onChange={setBrightness}
                tooltip={{ formatter: (value) => `${value}%` }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Contraste
                </span>
                <span className="text-xs text-gray-500">{contrast}%</span>
              </div>
              <Slider
                min={25}
                max={200}
                value={contrast}
                onChange={setContrast}
                tooltip={{ formatter: (value) => `${value}%` }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Saturación
                </span>
                <span className="text-xs text-gray-500">{saturation}%</span>
              </div>
              <Slider
                min={25}
                max={200}
                value={saturation}
                onChange={setSaturation}
                tooltip={{ formatter: (value) => `${value}%` }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Gamma
                </span>
                <span className="text-xs text-gray-500">{gamma}%</span>
              </div>
              <Slider
                min={25}
                max={200}
                value={gamma}
                onChange={setGamma}
                tooltip={{ formatter: (value) => `${value}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Rotación
              </span>
              <Space>
                <Tooltip title="Rotar izquierda">
                  <Button
                    icon={<RotateLeftOutlined />}
                    onClick={handleRotateLeft}
                    size="small"
                  />
                </Tooltip>
                <span className="text-xs text-gray-500">{rotation}°</span>
                <Tooltip title="Rotar derecha">
                  <Button
                    icon={<RotateRightOutlined />}
                    onClick={handleRotateRight}
                    size="small"
                  />
                </Tooltip>
              </Space>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ImageEditorModal;

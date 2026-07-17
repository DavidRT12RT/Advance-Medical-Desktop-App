import React from "react";
import { Modal, Timeline, Tag, Empty, Divider, Badge } from "antd";
import {
  HistoryOutlined,
  ClockCircleOutlined,
  UserOutlined,
  EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

interface EditRecord {
  timestamp: string;
  motivo: string;
  cambios: Record<string, { anterior: any; nuevo: any }>;
  usuario: string;
  fecha_reapertura?: string;
}

interface ModalHistorialCambiosProps {
  visible: boolean;
  onCancel: () => void;
  editHistory?: EditRecord[];
  motivo_reapertura?: string;
  fecha_reapertura?: string;
}

const ModalHistorialCambios: React.FC<ModalHistorialCambiosProps> = ({
  visible,
  onCancel,
  editHistory = [],
  motivo_reapertura,
  fecha_reapertura,
}) => {
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "Sin valor";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const formatFieldName = (field: string): string => {
    const fieldNames: Record<string, string> = {
      resultado: "Resultado",
      hallazgos: "Hallazgos",
      polipo: "Tipo de Pólipo",
      tamano: "Tamaño",
      ubicacion: "Ubicación",
      clasificacion: "Clasificación",
      accion: "Acción Realizada",
      biopsia: "Biopsia",
      medicamentos: "Medicamentos",
      complicaciones: "Complicaciones",
      seguimiento: "Seguimiento",
      intervaloSeguimiento: "Intervalo de Seguimiento",
      tolerancia: "Tolerancia",
      anestesiologo_nombre: "Anestesiólogo - Nombre",
      anestesiologo_cedula: "Anestesiólogo - Cédula",
      anestesiologo_especialidad: "Anestesiólogo - Especialidad",
      clinica_nombre: "Clínica - Nombre",
      clinica_numero: "Clínica - Número",
      clinica_direccion: "Clínica - Dirección",
      clinica_telefono: "Clínica - Teléfono",
      medico_nombre: "Médico - Nombre",
      medico_cedula: "Médico - Cédula",
      medico_especialidad: "Médico - Especialidad",
      metodo_sedacion: "Método de Sedación",
      sedacion_dosis: "Sedación - Dosis",
      sedacion_observaciones: "Sedación - Observaciones",
      equipo_endoscopio: "Equipo - Endoscopio",
      equipo_marca: "Equipo - Marca",
      equipo_modelo: "Equipo - Modelo",
      equipo_serie: "Equipo - Serie",
      asistente_nombre: "Asistente - Nombre",
      asistente_rol: "Asistente - Rol",
    };
    return fieldNames[field] || field;
  };

  if (!editHistory || editHistory.length === 0) {
    return (
      <Modal
        title={
          <div className="flex items-center gap-2">
            <HistoryOutlined className="text-amber-600" />
            <span>Historial de Cambios</span>
          </div>
        }
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={800}
      >
        <Empty
          description="No hay historial de cambios para este estudio"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Modal>
    );
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <HistoryOutlined />
          <span>Historial de Cambios</span>
          <Badge count={editHistory.length} showZero />
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      style={{ top: 20 }}
    >
      <div className="max-h-[70vh] overflow-y-auto">
        {fecha_reapertura && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-700 uppercase mb-2">
              Última Reapertura
            </p>
            <p className="text-sm text-gray-800 mb-2">
              <strong>Fecha:</strong>{" "}
              {dayjs(fecha_reapertura).format("DD/MM/YYYY HH:mm:ss")}
            </p>
            <p className="text-sm text-gray-800">
              <strong>Motivo:</strong> {motivo_reapertura || "No especificado"}
            </p>
          </div>
        )}

        <Timeline
          items={editHistory
            .slice()
            .reverse()
            .map((record, index) => ({
              color: "gray",
              dot: <ClockCircleOutlined style={{ fontSize: "16px" }} />,
              children: (
                <div className="pb-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <Tag>Edición #{editHistory.length - index}</Tag>
                        <span className="text-sm font-semibold text-gray-700">
                          {dayjs(record.timestamp).format(
                            "DD/MM/YYYY HH:mm:ss"
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <UserOutlined />
                        <span>{record.usuario}</span>
                      </div>
                    </div>

                    {/* Motivo */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                        Motivo de Reapertura
                      </p>
                      <div className="bg-gray-50 border border-gray-200 rounded p-3">
                        <p className="text-sm text-gray-700">
                          {record.motivo || "No especificado"}
                        </p>
                      </div>
                    </div>

                    <Divider className="my-3" />

                    {/* Cambios */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <EditOutlined />
                        <p className="text-xs font-semibold text-gray-600 uppercase">
                          Campos Modificados (
                          {Object.keys(record.cambios).length})
                        </p>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(record.cambios).map(
                          ([field, change]: [string, any]) => (
                            <div
                              key={field}
                              className="border border-gray-200 rounded-lg p-3 bg-white"
                            >
                              <p className="text-xs font-bold text-gray-700 mb-3">
                                {formatFieldName(field)}
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">
                                    - Valor Anterior:
                                  </p>
                                  <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                                    <p className="text-sm text-gray-800 break-words">
                                      {formatValue(change.anterior)}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">
                                    + Nuevo Valor:
                                  </p>
                                  <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                                    <p className="text-sm text-gray-800 break-words">
                                      {formatValue(change.nuevo)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ),
            }))}
        />
      </div>
    </Modal>
  );
};

export default ModalHistorialCambios;

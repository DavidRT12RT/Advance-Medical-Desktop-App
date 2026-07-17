import React from "react";
import { Collapse, Tag, Empty, Divider } from "antd";
import { HistoryOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import SectionTitle from "../common/SectionTitle";

interface EditRecord {
  timestamp: string;
  motivo: string;
  cambios: Record<string, { anterior: any; nuevo: any }>;
  usuario: string;
}

interface HistorialEdicionesEstudioProps {
  editHistory?: EditRecord[];
  motivo_reapertura?: string;
  fecha_reapertura?: string;
}

const HistorialEdicionesEstudio: React.FC<HistorialEdicionesEstudioProps> = ({
  editHistory = [],
  motivo_reapertura,
  fecha_reapertura,
}) => {
  if (!editHistory || editHistory.length === 0) {
    return null;
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "Sin valor";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const items = editHistory.map((record, index) => ({
    key: index.toString(),
    label: (
      <div className="flex items-center justify-between w-full pr-4">
        <span className="font-medium text-gray-700">
          Edición #{editHistory.length - index}
        </span>
        <span className="text-xs text-gray-500">
          {dayjs(record.timestamp).format("DD/MM/YYYY HH:mm:ss")}
        </span>
      </div>
    ),
    children: (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
            Usuario
          </p>
          <p className="text-sm text-gray-700">{record.usuario}</p>
        </div>

        <Divider className="my-3" />

        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
            Motivo de reapertura
          </p>
          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
            {record.motivo || "No especificado"}
          </p>
        </div>

        <Divider className="my-3" />

        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase mb-3">
            Campos modificados ({Object.keys(record.cambios).length})
          </p>
          <div className="space-y-3">
            {Object.entries(record.cambios).map(
              ([field, change]: [string, any]) => (
                <div
                  key={field}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                >
                  <p className="text-xs font-semibold text-indigo-600 mb-2">
                    {field}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">
                        Valor anterior:
                      </p>
                      <p className="text-sm text-gray-800 bg-white p-2 rounded border border-red-100">
                        {formatValue(change.anterior)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Nuevo valor:</p>
                      <p className="text-sm text-gray-800 bg-white p-2 rounded border border-green-100">
                        {formatValue(change.nuevo)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    ),
  }));

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 my-5!">
      <SectionTitle
        title="Historial de ediciones"
        icon={<HistoryOutlined className="text-amber-600" />}
      />

      {fecha_reapertura && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-amber-800 uppercase mb-2">
            Última reapertura
          </p>
          <p className="text-sm text-amber-900 mb-2">
            <strong>Fecha:</strong>{" "}
            {dayjs(fecha_reapertura).format("DD/MM/YYYY HH:mm:ss")}
          </p>
          <p className="text-sm text-amber-900">
            <strong>Motivo:</strong> {motivo_reapertura || "No especificado"}
          </p>
        </div>
      )}

      <Collapse items={items} />
    </div>
  );
};

export default HistorialEdicionesEstudio;

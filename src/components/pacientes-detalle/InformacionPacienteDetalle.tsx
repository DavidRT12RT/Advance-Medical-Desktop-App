import React, { useState, useEffect } from "react";
import { Skeleton } from "antd";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import FirebasePacientes from "../../features/FirebasePacientes";
import { Paciente } from "../../types/Paciente";

const InformacionPacienteDetalle = () => {
  const { id: pacienteId } = useParams<{ id: string }>();
  const empresaId = "GoFayqIW9MR718FzNpyzGUgaK283";

  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<Paciente | null>(null);

  useEffect(() => {
    const fetchPaciente = async () => {
      if (!pacienteId) {
        setLoading(false);
        return;
      }

      try {
        const data = await FirebasePacientes.obtenerPacientePorId(
          empresaId,
          pacienteId
        );
        setPaciente(data);
      } catch (error) {
        console.error("Error obteniendo paciente:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaciente();
  }, [empresaId, pacienteId]);

  const calcularEdad = (
    fechaNacimiento?: Paciente["fechaNacimiento"]
  ): number | null => {
    if (!fechaNacimiento) return null;

    const fecha = dayjs.isDayjs(fechaNacimiento)
      ? fechaNacimiento
      : dayjs(fechaNacimiento as any);

    if (!fecha.isValid()) return null;
    return dayjs().diff(fecha, "year");
  };

  if (loading) {
    const sections = [
      { title: 250, fields: 6 },
      { title: 280, fields: 6 },
      { title: 300, fields: 9, hasObservations: true },
    ];

    return (
      <section className="space-y-8">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <Skeleton
              active
              paragraph={{ rows: 0 }}
              style={{ width: section.title }}
            />
            <div className="grid grid-cols-3 gap-6 bg-gray-50 p-6 rounded-lg">
              {Array(section.fields)
                .fill(0)
                .map((_, item) => (
                  <div key={item} className="flex flex-col gap-2">
                    <Skeleton.Input
                      active
                      style={{ width: "70%", height: 14 }}
                    />
                    <Skeleton.Input
                      active
                      style={{ width: "100%", height: 18 }}
                    />
                  </div>
                ))}
            </div>
            {section.hasObservations && (
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded space-y-2">
                <Skeleton.Input active style={{ width: "40%", height: 14 }} />
                <Skeleton active paragraph={{ rows: 2 }} />
              </div>
            )}
          </div>
        ))}
      </section>
    );
  }

  if (!paciente) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-blue-600 pl-3">
          Información del Paciente
        </h2>
        <p className="text-sm text-gray-500">
          No se encontró información del paciente.
        </p>
      </section>
    );
  }

  const fechaNacimientoDayjs = paciente.fechaNacimiento
    ? dayjs.isDayjs(paciente.fechaNacimiento)
      ? paciente.fechaNacimiento
      : dayjs(paciente.fechaNacimiento as any)
    : null;

  const edad = fechaNacimientoDayjs
    ? dayjs().diff(fechaNacimientoDayjs, "year")
    : calcularEdad(paciente.fechaNacimiento);

  const fechaNacimientoTexto = fechaNacimientoDayjs
    ? fechaNacimientoDayjs.format("DD/MM/YYYY")
    : "-";

  const telefono = paciente.celular || paciente.telefonoCasa || "-";

  return (
    <section className="space-y-8">
      {/* Información del Paciente */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-blue-600 pl-3">
          Información del Paciente
        </h2>
        <div className="grid grid-cols-3 gap-6 bg-gray-50 p-6 rounded-lg">
          <div className="space-y-1">
            <p className="text-sm text-gray-500 font-medium">Edad</p>
            <p className="text-base font-semibold text-gray-900">
              {edad !== null ? `${edad} años` : "-"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 font-medium">Género</p>
            <p className="text-base font-semibold text-gray-900">
              {paciente.sexo || "-"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 font-medium">
              Correo Electrónico
            </p>
            <p className="text-base font-semibold text-gray-900">
              {paciente.email || "-"}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-gray-500 font-medium">Teléfono</p>
            <p className="text-base font-semibold text-gray-900">{telefono}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 font-medium">
              Fecha de Nacimiento
            </p>
            <p className="text-base font-semibold text-gray-900">
              {fechaNacimientoTexto}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 font-medium">
              Cédula de Identidad
            </p>
            <p className="text-base font-semibold text-gray-900">
              {paciente.cedula || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Observaciones */}
      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
        <p className="text-sm text-gray-500 font-medium mb-2">
          Observaciones generales del Médico
        </p>
        <p className="text-sm text-gray-700">
          {paciente.observaciones || "Sin observaciones"}
        </p>
      </div>
    </section>
  );
};

export default InformacionPacienteDetalle;

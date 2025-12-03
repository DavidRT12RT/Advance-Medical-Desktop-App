import Modal from "antd/es/modal";
import React, { useState } from "react";
import DatosPaciente from "./DatosPaciente";
import AntecedentePaciente from "./AntecedentePaciente";
import { Button, Steps, Space } from "antd";

interface Step {
  title: string;
  component: React.ReactNode;
  form: any;
}

interface ModalPacienteProps {
  visible: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onCreate: () => void;
  mode: "view" | "create" | "edit" | "delete";
  steps: Step[];
  loading?: boolean;
}

const ModalPaciente: React.FC<ModalPacienteProps> = ({
  visible,
  onCancel,
  onDelete,
  onCreate,
  mode,
  steps,
  loading = false,
}) => {
  const [current, setCurrent] = useState(0);

  const handleNext = async () => {
    if (current === steps.length - 1) {
      // Último paso: validar TODOS los formularios antes de guardar
      try {
        await Promise.all(steps.map((step) => step.form.validateFields()));
        onCreate();
      } catch (error) {
        console.log("Errores de validación:", error);
      }
    } else {
      // Pasos intermedios: validar solo el formulario actual
      steps[current].form
        .validateFields()
        .then(() => {
          setCurrent(current + 1);
        })
        .catch((error: any) => {
          console.log(`Errores en ${steps[current].title}:`, error);
        });
    }
  };

  const handleModalClose = () => {
    setCurrent(0);
    onCancel();
  };

  return (
    <Modal
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={800}
      loading={loading}
      title={
        mode === "create"
          ? "Nuevo Paciente"
          : mode === "edit"
          ? "Editar Paciente"
          : mode === "delete"
          ? "Eliminar paciente"
          : "Datos Generales"
      }
    >
      {mode !== "delete" && (
        <div className="flex flex-col gap-4">
          <Steps
            current={current}
            items={steps.map((step) => ({ title: step.title }))}
          />

          <div
            style={{
              marginTop: "24px",
              marginBottom: "24px",
              minHeight: "300px",
            }}
          >
            {steps.map((step, index) => (
              <div
                key={index}
                style={{ display: current === index ? "block" : "none" }}
              >
                {step.component}
              </div>
            ))}
          </div>

          <Space
            style={{ width: "100%", justifyContent: "flex-end", gap: "8px" }}
          >
            {current > 0 && (
              <Button onClick={() => setCurrent(current - 1)}>Anterior</Button>
            )}
            <Button
              type="primary"
              onClick={() => handleNext()}
              loading={loading}
            >
              {current === steps.length - 1
                ? mode === "create"
                  ? "Guardar"
                  : "Actualizar"
                : "Siguiente"}
            </Button>
          </Space>
        </div>
      )}

      {mode === "delete" && (
        <div>
          <p>¿Está seguro de eliminar este paciente?</p>
          <Button type="primary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="primary" onClick={onDelete}>
            Borrar
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default ModalPaciente;

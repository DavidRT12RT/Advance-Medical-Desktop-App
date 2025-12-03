import React from "react";
import { Form, Input, Row, Col, Radio, DatePicker } from "antd";
import dayjs from "dayjs";

interface DatosPacienteProps {
  form: any;
  initialValues?: any;
}

const DatosPaciente: React.FC<DatosPacienteProps> = ({
  form,
  initialValues,
}) => {
  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            rules={[
              {
                required: true,
                message: "Por favor ingresa los nombres",
              },
            ]}
            label="Nombres"
            name="nombres"
          >
            <Input placeholder="Ingresa los nombres" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            rules={[
              {
                required: true,
                message: "Por favor ingresa el apellido paterno",
              },
            ]}
            label="Apellido Paterno"
            name="apellidoPaterno"
          >
            <Input placeholder="Ingresa el apellido paterno" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            rules={[
              {
                required: true,
                message: "Por favor ingresa el apellido materno",
              },
            ]}
            label="Apellido Materno"
            name="apellidoMaterno"
          >
            <Input placeholder="Ingresa el apellido materno" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            rules={[
              {
                required: true,
                message: "Por favor ingresa la fecha de nacimiento",
              },
            ]}
            label="Fecha de nacimiento"
            name="fechaNacimiento"
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            rules={[
              {
                required: true,
                message: "Por favor ingresa el sexo",
              },
            ]}
            label="Sexo"
            name="sexo"
          >
            <Radio.Group>
              <Radio value="M">M</Radio>
              <Radio value="F">F</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item label="Calle y número del domicilio" name="domicilio">
            <Input placeholder="Ingresa la calle y número del domicilio" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item label="Teléfono de casa o trabajo" name="telefonoCasa">
            <Input placeholder="Ingresa el teléfono de casa o trabajo" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item label="Celular" name="celular">
            <Input placeholder="Ingresa el celular" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { type: "email", message: "Por favor ingrese un email válido" },
            ]}
          >
            <Input placeholder="Ingresa el email" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item label="Número de Cédula" name="cedula">
            <Input placeholder="Ingresa el número de cédula del paciente" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item label="Familiar Responsable" name="familiarResponsable">
            <Input placeholder="Ingresa el familiar responsable" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item label="Seguro" name="seguro">
            <Input placeholder="Ingresa el seguro" />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default DatosPaciente;

import React from 'react';
import { Form, Input, Row, Col, Radio, DatePicker } from 'antd';
import dayjs from 'dayjs';

interface DatosPacienteProps {
  form: any;
  initialValues?: any;
}

const DatosPaciente: React.FC<DatosPacienteProps> = ({ form, initialValues }) => {
  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Nombre completo del paciente"
            name="nombreCompleto"
            rules={[{ required: true, message: 'Por favor ingrese el nombre completo' }]}
          >
            <Input placeholder="ENRIQUE PABLOS" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Fecha de nacimiento" name="fechaNacimiento">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>

        <Col xs={24} md={4}>
          <Form.Item label="Sexo" name="sexo">
            <Radio.Group>
              <Radio value="M">M</Radio>
              <Radio value="F">F</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>

        <Col xs={24}>
          <Form.Item label="Calle y número del domicilio" name="domicilio">
            <Input placeholder="AVE TODOS LOS SANTOS 9022" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Teléfono de casa o trabajo" name="telefonoCasa">
            <Input placeholder="6644046297" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Celular" name="celular">
            <Input placeholder="6643640728" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ type: 'email', message: 'Por favor ingrese un email válido' }]}
          >
            <Input placeholder="ENRIQUE@SCALEFLOW.TECH" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label="Número de Cédula" name="cedula">
            <Input placeholder="" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item label="Familiar Responsable" name="familiarResponsable">
            <Input placeholder="ESTEBAN PABLOS" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item label="Seguro" name="seguro">
            <Input placeholder="GNP" />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default DatosPaciente;
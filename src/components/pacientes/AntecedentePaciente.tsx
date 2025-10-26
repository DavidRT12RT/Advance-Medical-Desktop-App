import React from 'react';
import { Form, Input, Checkbox, Row, Col } from 'antd';

const { TextArea } = Input;

interface AntecedentesProps {
  form: any;
  initialValues?: any;
}

const Antecedentes: React.FC<AntecedentesProps> = ({ form, initialValues }) => {
  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item label="Antecedentes Personales Patológicos" name="antecedentesPatologicos">
            <TextArea rows={4} placeholder="Ingrese los antecedentes patológicos..." />
          </Form.Item>
        </Col>

        <Col span={24}>
          <Form.Item label="Antecedentes Personales No Patológicos" name="antecedentesNoPatologicos">
            <TextArea rows={4} placeholder="Ingrese los antecedentes no patológicos..." />
          </Form.Item>
        </Col>

        <Col span={24}>
          <Form.Item label="Antecedentes Heredo Familiares" name="antecedentesHeredoFamiliares">
            <TextArea rows={4} placeholder="Ingrese los antecedentes heredo familiares..." />
          </Form.Item>
        </Col>

        <Col span={24}>
          <Form.Item label="Alergias" name="alergias">
            <TextArea rows={3} placeholder="Ingrese las alergias conocidas..." />
          </Form.Item>
        </Col>

        <Col span={24}>
          <Form.Item label="Medicamentos Actuales" name="medicamentosActuales">
            <TextArea rows={3} placeholder="Ingrese los medicamentos actuales..." />
          </Form.Item>
        </Col>

        <Col span={24}>
          <Form.Item label="Cirugías Previas" name="cirugiasPrevias">
            <TextArea rows={3} placeholder="Ingrese las cirugías previas..." />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default Antecedentes;
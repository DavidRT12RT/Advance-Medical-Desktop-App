import React from 'react';
import { Form, Input, Select, Switch, Row, Col, Button, Space, InputNumber } from 'antd';

const { TextArea } = Input;

interface ConfiguracionIAProps {
  form: any;
  initialValues?: any;
  onSave: () => void;
  loading?: boolean;
}

const ConfiguracionIA: React.FC<ConfiguracionIAProps> = ({ form, initialValues, onSave, loading }) => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="Proveedor de IA"
              name="proveedorIA"
              rules={[{ required: true, message: 'Por favor seleccione un proveedor' }]}
            >
              <Select placeholder="Seleccione un proveedor">
                <Select.Option value="openai">OpenAI (GPT-4)</Select.Option>
                <Select.Option value="anthropic">Anthropic (Claude)</Select.Option>
                <Select.Option value="google">Google (Gemini)</Select.Option>
                <Select.Option value="local">Modelo Local</Select.Option>
              </Select>
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="API Key"
              name="apiKey"
              rules={[{ required: true, message: 'Por favor ingrese la API Key' }]}
            >
              <Input.Password placeholder="sk-..." />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Modelo"
              name="modelo"
            >
              <Input placeholder="gpt-4-turbo" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Temperatura"
              name="temperatura"
              tooltip="Controla la creatividad de las respuestas (0-1)"
            >
              <InputNumber
                min={0}
                max={1}
                step={0.1}
                style={{ width: '100%' }}
                placeholder="0.7"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Max Tokens"
              name="maxTokens"
              tooltip="Número máximo de tokens en la respuesta"
            >
              <InputNumber
                min={100}
                max={8000}
                style={{ width: '100%' }}
                placeholder="2000"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Habilitar IA"
              name="habilitarIA"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="Prompt del Sistema"
              name="promptSistema"
              tooltip="Instrucciones base para el comportamiento de la IA"
            >
              <TextArea
                rows={4}
                placeholder="Eres un asistente médico especializado en análisis de consultas..."
              />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="Idioma de respuesta"
              name="idioma"
            >
              <Select placeholder="Seleccione un idioma">
                <Select.Option value="es">Español</Select.Option>
                <Select.Option value="en">Inglés</Select.Option>
                <Select.Option value="pt">Portugués</Select.Option>
              </Select>
            </Form.Item>
          </Col>

          <Col span={24} style={{ textAlign: 'center', marginTop: '24px' }}>
            <Button
              type="primary"
              size="large"
              onClick={onSave}
              loading={loading}
              style={{ 
                minWidth: '200px',
                backgroundColor: '#722ed1',
                borderColor: '#722ed1'
              }}
            >
              Guardar Configuración
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default ConfiguracionIA;
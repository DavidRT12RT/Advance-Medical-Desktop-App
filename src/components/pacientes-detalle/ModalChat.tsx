import { Modal, Form, Input, Button } from "antd";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setChatSelected, setRefresh } from "../../store/aiSlice";
import chatDoctorService from "../../services/chatDoctorService";
import { useElectronStore } from "../../hooks/useElectronStore";

interface ModalNewChatProps {
  isOpen: boolean;
  onClose: () => void;
  chat?: any;
  type?: "new" | "edit" | "delete";
  pacienteId?: string;
}
export const ModalChat = ({
  isOpen,
  onClose,
  chat,
  type,
  pacienteId,
}: ModalNewChatProps) => {
  const [form] = Form.useForm();

  const { user: auth } = useElectronStore();

  const dispatch = useDispatch();

  const handleUpdateCreateChat = async (values: any) => {
    if (type === "edit") {
      // Actualizar el chat existente
      await chatDoctorService.updateChat(auth?.usuarioDetail?.id, chat.id, {
        title: values.title,
        description: values.description,
      });
      // Force a refresh by changing the value
      dispatch(setRefresh(Math.random()));
      onClose();
      return;
    }

    // Create new chat and select it
    const chatId = await chatDoctorService.createChatWithPaciente(
      auth?.usuarioDetail?.id,
      auth?.empresa?.id,
      pacienteId || "",
      values.title
    );
    dispatch(setChatSelected(chatId));
    dispatch(setRefresh(Math.random()));
    onClose();
  };

  useEffect(() => {
    if (chat) {
      form.setFieldsValue({
        title: chat.title,
        description: chat.description,
      });
    }
  }, [chat]);

  return (
    <Modal
      title={type === "edit" ? "Editar Chat" : "Nuevo Chat"}
      open={isOpen}
      onOk={onClose}
      onCancel={onClose}
      footer={null}
    >
      <Form form={form} onFinish={handleUpdateCreateChat} layout="vertical">
        <Form.Item
          name="title"
          label="Titulo"
          rules={[{ required: true }]}
          style={{ width: "100%" }}
        >
          <Input placeholder="Titulo del chat" />
        </Form.Item>
        <Form.Item
          name="description"
          label="Descripcion"
          style={{ width: "100%" }}
        >
          <Input.TextArea placeholder="Descripción del chat" />
        </Form.Item>
        <Form.Item
          style={{
            display: "flex",
            gap: "15px",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          <Button onClick={onClose}>Cancelar</Button>
          <Button className="ms-2!" type="primary" htmlType="submit">
            {type === "edit" ? "Editar" : "Guardar"}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

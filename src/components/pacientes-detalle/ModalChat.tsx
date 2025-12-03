import { setChatSelected, setRefresh } from "@/features/aiSlice";
import { chatService } from "@/services/chatService";
import { Modal, Form, Input, Button} from "antd";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

interface ModalNewChatProps {
  isOpen: boolean;
  onClose: () => void;
  chat?: any;
  type?: 'new' | 'edit' | 'delete';
}
export const ModalChat = ({
  isOpen,
  onClose,
  chat,
  type
}: ModalNewChatProps) => {

  const [form] = Form.useForm();

  const { auth } = useSelector((state: any) => state.configuracion);
  const dispatch = useDispatch();

  const handleUpdateCreateChat = async (values: any) => {
    if (type === 'edit') {
      await chatService.updateChat(chat.id, values.title, values.description);
      // Force a refresh by changing the value
      dispatch(setRefresh(Math.random()));
      onClose();
      return;
    }

    // Create new chat and select it
    const chatId = await chatService.createNewChat(
      auth?.usuarioDetail?.id,
      auth?.empresa?.id,
      values.title
    );
    dispatch(setChatSelected(chatId));
    dispatch(setRefresh(Math.random()));
    onClose();
  } 
  
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
      title={type === 'edit' ? "Editar Chat" : "Nuevo Chat"}
      open={isOpen}
      onOk={onClose}
      onCancel={onClose}
      footer={null}
    >
      <Form
        form={form}
        onFinish={handleUpdateCreateChat}
        layout="vertical"
      >
        <Form.Item
          name="title"
          label="Titulo"
          rules={[{ required: true }]}
          style={{width:"100%"}}
        >
          <Input placeholder="Titulo del chat" />
        </Form.Item>
        <Form.Item
          name="description"
          label="Descripcion"
          style={{width:"100%"}}
        >
          <Input.TextArea placeholder="Descripción del chat" />
        </Form.Item>
        <Form.Item style={{display:"flex", gap:"15px", justifyContent:"flex-end", width:"100%"}}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button className="ms-2!" type="primary" htmlType="submit">{type === 'edit' ? "Editar" : "Guardar"}</Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
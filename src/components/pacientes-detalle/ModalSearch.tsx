import { Input, Modal } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { ChatsByDate } from "./ScalyMedicoChat";
import { setChatSelected } from "../../store/aiSlice";

interface ModalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  chatsByDate: ChatsByDate[];
  openModalCreateNewChat: () => void;
}

export const ModalSearch = ({
  isOpen,
  onClose,
  chatsByDate,
  openModalCreateNewChat,
}: ModalSearchProps) => {
  const dispatch = useDispatch();
  const [filteredChats, setfilteredChats] = useState<ChatsByDate[]>([]);

  const handleSearch = (value: string) => {
    const term = value?.toLowerCase().trim() ?? "";
    if (!term) {
      setfilteredChats(chatsByDate ?? []);
      return;
    }
    const filtered = (chatsByDate ?? []).map((chatByDate) => ({
      ...chatByDate,
      chats: chatByDate.chats.filter((chat) =>
        (chat.title ?? "").toLowerCase().includes(term)
      ),
    }));
    setfilteredChats(filtered);
  };

  // Initialize and reset list when modal opens or source data changes
  useEffect(() => {
    if (isOpen) {
      setfilteredChats(chatsByDate ?? []);
    }
  }, [isOpen, chatsByDate]);

  return (
    <Modal open={isOpen} onCancel={onClose} footer={null} width={600}>
      <Input
        size="large"
        placeholder="Buscar chats..."
        className="mb-5! pb-5! !border-0 !border-b !border-gray-200 !rounded-none !shadow-none focus:!border-0 focus:!border-b focus:!border-gray-300 focus:!shadow-none focus:!outline-none active:!border-b active:!shadow-none hover:!border-b"
        onChange={(e) => handleSearch(e.target.value)}
      />

      <div
        className="flex cursor-pointer gap-2! bg-gray-100 p-2! rounded-md!"
        onClick={openModalCreateNewChat}
      >
        <PlusOutlined />
        <p>Nuevo chat</p>
      </div>

      <div className="flex flex-col gap-2! mt-5! h-[calc(60vh-200px)] overflow-y-auto ">
        {filteredChats.map((chatByDate) => (
          <div className="flex flex-col gap-2!" key={chatByDate.fecha}>
            <p>{chatByDate.fecha}</p>
            <div className="flex flex-col gap-2!">
              {chatByDate.chats.map((chat: any) => (
                <div
                  key={chat.id}
                  className="flex justify-start items-center cursor-pointer p-2! rounded-md! hover:bg-gray-100 gap-2!"
                  onClick={() => {
                    onClose();
                    dispatch(setChatSelected(chat.id));
                  }}
                >
                  {/* <IoChatbubbleOutline /> */}
                  <p>{chat.title}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};

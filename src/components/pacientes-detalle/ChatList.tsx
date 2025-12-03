import React, { useMemo, useState } from "react";

import {
  RightOutlined,
  DownOutlined,
  LeftOutlined,
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { SlOptionsVertical } from "react-icons/sl";

import { Button, Menu, Dropdown } from "antd";
import moment from "moment";
import "moment/locale/es";

import { Chat } from "@/app/ai/chats/page";
import { ModalChat } from "./ModalChat";
import { ModalSearch } from "./ModalSearch";
import { setChatSelected } from "@/features/aiSlice";
import { useDispatch, useSelector } from "react-redux";

const ChatList = ({
  chats,
  onLoadMore,
  hasMore,
  loadingMore,
}: {
  chats: Chat[];
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
}) => {
  const [open, setOpen] = useState(true);
  moment.locale("es");

  type ModalAction = { type: "new" | "edit" | "delete"; chat?: Chat } | null;
  const [openModal, setOpenModal] = useState<ModalAction>(null);
  const [openModalSearch, setOpenModalSearch] = useState(false);

  const { chatSelected } = useSelector((state: any) => state.ai);

  const dispatch = useDispatch();

  const [chatHover, setChatHover] = useState<string | null>(null);

  const formatCreatedAt = (value: any) => {
    if (!value) return "";
    // Firestore Timestamp
    if (typeof value?.toDate === "function") {
      return moment(value.toDate()).format("DD MMM YYYY, HH:mm");
    }
    // ISO string or Date-compatible
    const date = new Date(value);
    if (!isNaN(date.getTime()))
      return moment(date).format("DD MMM YYYY, HH:mm");
    return String(value);
  };

  const chatsByDate = useMemo(() => {
    const grouped = chats.reduce((acc, chat) => {
      if (!chat.created_at) return acc;
      const raw = chat.created_at as any;
      const createdAt: Date =
        typeof raw === "string"
          ? new Date(raw)
          : typeof raw?.toDate === "function"
          ? raw.toDate()
          : new Date(raw);

      const y = createdAt.getFullYear();
      const m = String(createdAt.getMonth() + 1).padStart(2, "0");
      const d = String(createdAt.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(chat);
      return acc;
    }, {} as Record<string, Chat[]>);

    return Object.entries(grouped).map(([fecha, chats]) => ({ fecha, chats }));
  }, [chats]);

  const MenuOptions = ({ chat }: { chat: Chat }) => {
    return (
      <Menu
        items={[
          {
            key: "1",
            label: "Editar",
            onClick: () =>
              setOpenModal({
                type: "edit",
                chat,
              }),
            icon: <EditOutlined />,
          },
          {
            key: "2",
            label: <p style={{ color: "red" }}>Eliminar</p>,
            onClick: () =>
              setOpenModal({
                type: "delete",
                chat,
              }),
            icon: <DeleteOutlined style={{ color: "red" }} />,
          },
        ]}
      />
    );
  };

  const list = useMemo(
    () => (
      <div className="w-full flex flex-col gap-2! mt-2! pr-1!">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`group w-full flex items-center justify-between p-2! rounded-md border border-transparent hover:bg-gray-100 hover:border-gray-100 cursor-pointer transition-colors ${
              chat.id === chatSelected ? "bg-gray-200" : ""
            }`}
            onMouseEnter={() => setChatHover(chat.id)}
            onMouseLeave={() => setChatHover(null)}
            onClick={() => {
              dispatch(setChatSelected(chat.id));
            }}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{chat.title}</p>
              {chat.created_at && (
                <p className="text-xs text-gray-500 truncate">
                  {formatCreatedAt(chat.created_at)}
                </p>
              )}
            </div>
            <Dropdown
              overlay={<MenuOptions chat={chat} />}
              trigger={["click"]}
              placement="bottomRight"
            >
              <span onClick={(e) => e.stopPropagation()}>
                <SlOptionsVertical
                  className={`ml-2 cursor-pointer text-gray-500 transition-opacity opacity-0 group-hover:opacity-100 ${
                    chatHover === chat.id ? "opacity-100" : ""
                  }`}
                />
              </span>
            </Dropdown>
          </div>
        ))}
        {chats.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-4!">
            No hay chats
          </div>
        )}
      </div>
    ),
    [chats, chatSelected]
  );

  return (
    <div
      className={`border-r p-3! h-full flex flex-col gap-3! transition-all duration-300 ease-in-out ${
        open ? "w-64" : "w-14"
      }`}
    >
      {/* Header desplegable */}
      <div className="flex justify-between items-center">
        <div className="relative flex items-center gap-2!">
          {!open ? (
            <div
              className="relative w-6 h-6 group"
              onClick={() => setOpen(true)}
            >
              <Image
                className="cursor-pointer absolute inset-0 transition-opacity duration-200 opacity-100 group-hover:opacity-0"
                style={{ objectFit: "contain" }}
                src={logoPng}
                alt="Logo"
                width={24}
                height={24}
              />
              <RightOutlined className="cursor-pointer absolute inset-0 flex items-center justify-center transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
            </div>
          ) : (
            <>
              <Image
                onClick={() => setOpen(false)}
                className="cursor-pointer"
                style={{ objectFit: "contain" }}
                src={logoPng}
                alt="Logo"
                width={26}
                height={26}
              />
              <span className="font-semibold text-gray-700 transition-opacity duration-200">
                Chats
              </span>
            </>
          )}
        </div>
        {open && (
          <LeftOutlined
            onClick={() => setOpen(!open)}
            className="cursor-pointer"
          />
        )}
      </div>

      {/* Menu de herramientas */}
      {open ? (
        <div className={`flex gap-2! transition-all duration-300`}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setOpenModal({ type: "new" })}
          >
            Nuevo chat
          </Button>
          <Button
            icon={<SearchOutlined />}
            onClick={() => setOpenModalSearch(true)}
          >
            Buscar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2! mt-5! transition-all duration-300">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            onClick={() => setOpenModal({ type: "new" })}
          ></Button>
          <Button
            icon={<SearchOutlined />}
            size="small"
            onClick={() => setOpenModalSearch(true)}
          ></Button>
        </div>
      )}

      {/* Chats */}
      <div
        className={`border-y transition-all duration-300 ${
          open
            ? "flex-1 overflow-y-auto opacity-100"
            : "h-0 opacity-0 overflow-hidden"
        }`}
      >
        {list}
      </div>

      {/* Paginacion */}
      <div
        className={`flex justify-center items-center mt-2! transition-all duration-300 ${
          open ? "opacity-100 max-h-12" : "opacity-0 max-h-0 overflow-hidden"
        }`}
      >
        <Button
          type="primary"
          icon={<DownOutlined />}
          onClick={onLoadMore}
          loading={loadingMore}
          disabled={!hasMore}
        >
          {hasMore ? "Cargar más" : "No hay más"}
        </Button>
      </div>

      {/* Modales de creacion y busqueda de chats */}
      <ModalChat
        isOpen={!!openModal && openModal.type !== "delete"}
        onClose={() => setOpenModal(null)}
        chat={openModal?.chat}
        type={openModal?.type}
      />

      <ModalSearch
        isOpen={openModalSearch}
        onClose={() => setOpenModalSearch(false)}
        chatsByDate={chatsByDate}
        openModalCreateNewChat={() => {
          setOpenModalSearch(false);
          setOpenModal({ type: "new" });
        }}
      />
    </div>
  );
};

export default ChatList;

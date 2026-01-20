import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import SectionTitle from "../common/SectionTitle";
import ChatList from "./ChatList";
import CurrentChat from "./CurrentChat";
import { useElectronStore } from "../../hooks/useElectronStore";
import chatDoctorService from "../../services/chatDoctorService";
import { useParams } from "react-router-dom";

export interface Chat {
  id: string;
  title: string;
  lastUpdated?: any;
  created_at?: any;
}

export interface ChatsByDate {
  fecha: string;
  chats: Chat[];
}

const ScalyMedicoChat = () => {
  const { id: pacienteId } = useParams();
  const { user: auth } = useElectronStore();
  const refresh = useSelector((state: any) => state.ai.refresh);

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userId = auth?.usuarioDetail?.id;
    if (!userId || !pacienteId) return;

    const fetchChats = async () => {
      try {
        setLoading(true);
        const data = await chatDoctorService.getChatsByPaciente(
          userId,
          pacienteId
        );
        // Mapear la respuesta al formato esperado
        const mappedChats = data.map((chat) => ({
          //@ts-ignore
          id: chat.id,
          title: chat.title,
          created_at: chat.created_at,
          lastUpdated: chat.updated_at || chat.created_at,
        }));
        setChats(mappedChats as Chat[]);
      } catch (error) {
        console.error("Error al obtener chats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [auth?.usuarioDetail?.id, pacienteId, refresh]);

  return (
    <section className="space-y-6 w-full h-full">
      <SectionTitle title="Scaly Asistente Médico" icon={null} />
      <div className="w-full h-[calc(100vh-120px)] flex gap-4">
        <ChatList
          chats={chats}
          onLoadMore={() => {}}
          hasMore={false}
          loadingMore={loading}
          pacienteId={pacienteId}
        />
        <div className="flex-1">
          <CurrentChat />
        </div>
      </div>
    </section>
  );
};

export default ScalyMedicoChat;

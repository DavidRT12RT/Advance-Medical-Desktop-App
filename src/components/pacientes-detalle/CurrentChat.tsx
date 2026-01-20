import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { Input, message, Tooltip } from "antd";
import chatDoctorService, {
  Message as MessageInterface,
} from "../../services/chatDoctorService";
import {
  setChatSelected,
  setChatSelectedInfo,
  setRefresh,
} from "../../store/aiSlice";
import Message from "./Message";
import { Wrench } from "lucide-react";
import { useElectronStore } from "../../hooks/useElectronStore";
import { ENV } from "../../config/env";

const CurrentChat: React.FC = () => {
  const { chatSelected } = useSelector((state: any) => state.ai);
  const { detalleDePaciente } = useSelector((state: any) => state.pacientes);
  const { user: auth } = useElectronStore();

  const dispatch = useDispatch();
  const justCreatedRef = useRef<boolean>(false);

  const [messages, setMessages] = useState<MessageInterface[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingChat, setIsFetchingChat] = useState(false);

  // SSE local streaming state
  const [isStreaming, setIsStreaming] = useState<{
    type: "token" | "reasoning" | "done";
    isActive: boolean;
  }>({
    type: "done",
    isActive: false,
  });
  const [selectedTools, setSelectedTools] = useState<
    { name: string; idx: number }[]
  >([]); // seleccionadas por el modelo

  const [streamingReasoning, setStreamingReasoning] = useState<string>("");
  const [streamingMessage, setStreamingMessage] = useState<string>("");

  const esRef = useRef<EventSource | null>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);
  const messagesPaneRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const API_BASE_URL = ENV.API_URL_SCALY_MEDICO;

  useEffect(() => {
    const userId = auth?.usuarioDetail?.id;
    if (!chatSelected || !userId) return;
    // Si el chat fue recién creado por este componente, evitar sobrescribir mensajes locales
    if (justCreatedRef.current) {
      justCreatedRef.current = false;
      return;
    }
    setMessages([]);
    setIsFetchingChat(true);
    const fetchChat = async () => {
      try {
        // Obtener historial de mensajes del chat
        const messages = await chatDoctorService.getChatHistory(
          userId,
          chatSelected,
          detalleDePaciente?.id || ""
        );
        dispatch(setChatSelectedInfo({ messages }));
        // Normalizar mensajes a MessageInterface
        const normalized = (messages || [])
          .map((m: any, idx: number) => ({
            id: String(m.id ?? idx),
            role: (m.role ?? (m.sender === "user" ? "user" : "assistant")) as
              | "user"
              | "assistant",
            content: String(m.content ?? m.message ?? m.text ?? ""),
            timestamp: String(
              m.timestamp ?? m.created_at ?? new Date().toISOString()
            ),
            extraData: m.extraData?.tool_calls,
          }))
          .sort((a: MessageInterface, b: MessageInterface) => {
            const ta = new Date(a.timestamp || 0).getTime();
            const tb = new Date(b.timestamp || 0).getTime();
            if (ta !== tb) return ta - tb; // cronológico ascendente
            // Desempate: mostrar primero al usuario si el timestamp es igual
            if (a.role === b.role) return 0;
            return a.role === "user" ? -1 : 1;
          });
        setMessages(normalized);
      } catch (error) {
        console.log(error);
        message.error("No se pudieron cargar los mensajes del chat");
      } finally {
        setIsFetchingChat(false);
      }
    };
    fetchChat();
  }, [chatSelected, auth?.usuarioDetail?.id]);

  // SSE listener for real-time chat events (Tools,reasoning events and deltas (final text tokens))
  useEffect(() => {
    // Cleanup previous subscription on change
    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {}
      esRef.current = null;
    }

    if (!chatSelected) {
      setIsStreaming({
        type: "done",
        isActive: false,
      });
      streamingAssistantIdRef.current = null;
      setStreamingMessage("");
      setStreamingReasoning("");
      return;
    }

    try {
      const url = `${API_BASE_URL}/doctor_chat/events/${chatSelected}`;

      // Verificar endpoint con fetch primero
      fetch(url, { method: "GET" })
        .then((r) => {
          console.log(
            "[SSE] Content-Type del servidor:",
            r.headers.get("content-type")
          );
          console.log("[SSE] Status:", r.status);
        })
        .catch((e) => console.error("[SSE] Error en fetch de prueba:", e));

      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        console.log("[SSE] Conexión establecida exitosamente");
      };

      es.addEventListener("reasoning", (evt: MessageEvent) => {
        try {
          console.log("[SSE] reasoning:", evt.data);
          const data = JSON.parse(evt.data || "{}");
          const content =
            typeof data?.content === "string" ? data.content.trim() : "";
          if (content && content !== "connected") {
            setStreamingReasoning((prev) => prev + content + " ");
            setIsStreaming({
              type: "reasoning",
              isActive: true,
            });
          }
        } catch (err) {
          console.error("[SSE] reasoning error:", err);
        }
      });

      // Tokens de la respuesta final (streaming de la respuesta del asistente)
      es.addEventListener("token", (evt: MessageEvent) => {
        try {
          console.log("[SSE] token:", evt.data);
          const data = JSON.parse(evt.data || "{}");
          const content = typeof data?.content === "string" ? data.content : "";
          const chunk = content;
          if (!chunk) return;
          setIsStreaming({
            type: "token",
            isActive: true,
          });

          if (!streamingAssistantIdRef.current) {
            streamingAssistantIdRef.current = `assistant-${Date.now()}`;
            setStreamingMessage(chunk);
            setStreamingReasoning("");
          } else {
            setStreamingMessage((prev) => prev + chunk);
          }
        } catch (err) {}
      });

      // Tool selection (backend emits when the agent decided which tools to use)
      es.addEventListener("tool_selection", (evt: MessageEvent) => {
        /* 
          {"type": "tool_selection", "chat_id": "e7505f7e-f53a-46f0-b24c-85f5df3233ba", "name": "listar_subcoleccion_firestore_tool", "idx": 2} 
        */
        try {
          const data = JSON.parse(evt.data || "{}");
          const { name, idx } = data;
          if (name && idx) {
            setSelectedTools((prev) => [...prev, { name, idx }]);
          }
        } catch (err) {
          console.error("[SSE] tool_selection error:", err);
        }
      });

      es.addEventListener("done", () => {
        // Guardar en el historial lo que el usuario vio (tokens o, si no hubo, reasoning)
        const finalContent = streamingMessage || streamingReasoning || "";

        if (streamingAssistantIdRef.current && finalContent) {
          setMessages((prev) => [
            ...prev,
            {
              id: streamingAssistantIdRef.current!,
              role: "assistant" as const,
              content: finalContent,
              timestamp: new Date().toISOString(),
            },
          ]);
        }

        // Limpiar estados de streaming temporal
        streamingAssistantIdRef.current = null;
        setStreamingMessage("");
        setStreamingReasoning("");
        setSelectedTools([]);
        setIsStreaming({
          type: "done",
          isActive: false,
        });
      });

      es.addEventListener("notice", (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data || "{}");
          const content =
            typeof data?.content === "string" ? data.content.trim() : "";
          if (content && content !== "connected") {
            setStreamingReasoning(content);
            setIsStreaming({
              type: "reasoning",
              isActive: true,
            });
          }
        } catch {
          console.log("[SSE] notice error:", evt.data);
        }
      });

      es.onerror = (e: any) => {
        console.error("[SSE] Error en la conexión:", e);
        console.error("[SSE] Estado del EventSource:", es.readyState);
        console.error("[SSE] URL intentada:", url);
      };

      // Log para eventos genéricos (debugging)
      es.onmessage = (evt: MessageEvent) => {
        console.log("[SSE] Mensaje genérico recibido:", evt.type, evt.data);
      };
    } catch (e) {
      // If construction fails, ensure flag is off
      setIsStreaming({
        type: "done",
        isActive: false,
      });
      setStreamingReasoning("");
      streamingAssistantIdRef.current = null;
      console.log("[CurrentChat][SSE] Error al conectar al SSE:", e);
    }

    return () => {
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch {}
        esRef.current = null;
      }
    };
  }, [chatSelected, API_BASE_URL]);

  // Auto scroll to bottom on new messages or streaming state changes (throttled)
  useEffect(() => {
    const el = messagesPaneRef.current;
    if (!el) return;

    const now = Date.now();
    // Limitar el scroll a ~1 vez cada 80ms para evitar jank con reasoning muy rápido
    if (now - lastScrollTimeRef.current < 80) {
      return;
    }
    lastScrollTimeRef.current = now;

    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        try {
          el.scrollTop = el.scrollHeight;
        } catch {}
      });
    };

    scrollToBottom();
  }, [
    messages,
    isStreaming,
    isFetchingChat,
    streamingMessage,
    streamingReasoning,
  ]);

  const handleSendMessage = async (): Promise<void> => {
    try {
      // Evitar envíos múltiples mientras procesamos o stream está activo
      if (isLoading || isStreaming.isActive) return;
      setIsLoading(true);

      const text = inputValue.trim();
      if (!text) {
        setIsLoading(false);
        return;
      }
      // Limpiar el input después de tomar el valor
      setInputValue("");

      // Feedback inmediato mientras se prepara la solicitud y se conecta SSE
      setIsStreaming({
        type: "reasoning",
        isActive: true,
      });
      setStreamingReasoning("Analizando tu peticion...");

      const userMessage: MessageInterface = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      };

      // Agregar el mensaje al estado
      setMessages((prev) => [...prev, userMessage]);

      // Crear chat si no existe aún
      let chatIdToUse: string | null = chatSelected || null;
      if (!chatIdToUse) {
        chatIdToUse = await chatDoctorService.createChatWithPaciente(
          auth?.usuarioDetail?.id,
          auth?.empresa?.id,
          detalleDePaciente?.id || "",
          text.slice(0, 60) || "Nuevo Chat"
        );
        // Guardar el chat seleccionado en el estado global para activar la carga de historial
        justCreatedRef.current = true;
        dispatch(setChatSelected(chatIdToUse));
        // Forzar recarga de la lista de chats
        dispatch(setRefresh(Math.random()));
      }

      // Capturar el id del mensaje streameado (si lo hay) ANTES de esperar la respuesta HTTP
      const pendingStreamId = streamingAssistantIdRef.current;

      const response = await chatDoctorService.sendMessage(
        auth?.usuarioDetail?.id,
        chatIdToUse!,
        auth?.empresa?.id,
        detalleDePaciente?.id || "",
        text
      );

      // Si por alguna razón no hubo streaming de tokens, usar respuesta HTTP como fallback
      if (!pendingStreamId) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant" as const,
            content: response.content,
            timestamp: new Date().toISOString(),
            extraData: response.extraData?.tool_calls,
          },
        ]);
      } else {
        // Reconciliar contenido final con el mensaje streameado
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === pendingStreamId);
          if (!exists) {
            // Si por timing aún no existe el mensaje streameado, lo creamos aquí
            return [
              ...prev,
              {
                id: pendingStreamId,
                role: "assistant" as const,
                content: response.content,
                timestamp: new Date().toISOString(),
                extraData: response.extraData?.tool_calls,
              },
            ];
          }

          return prev.map((m) =>
            m.id === pendingStreamId
              ? {
                  ...m,
                  content: response.content,
                  extraData: response.extraData?.tool_calls, // -> extraData.tool_calls
                }
              : m
          );
        });
      }

      streamingAssistantIdRef.current = null;

      //Hacer scroll para abajo
      const el = messagesPaneRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch (error) {
      message.error("Error al enviar el mensaje");
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative! w-full! h-full! overflow-hidden!">
      {/* Contenedor absoluto para aislar el scroll dentro del chat */}
      <div className="absolute! inset-0! flex! flex-col! p-4! md:p-6! lg:p-8! bg-gray-50!">
        {isFetchingChat && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20">
            <p className="text-gray-600">
              Cargando mensajes del chat con Scaly...
            </p>
          </div>
        )}
        {!isFetchingChat && (
          <div className="flex! h-full! w-full! flex-col! min-h-0!">
            {/* Panel scrollable de mensajes */}
            <div
              ref={messagesPaneRef}
              className="relative! flex! flex-col! flex-1! overflow-y-auto! min-h-0! scroll-smooth! pr-1!"
            >
              {(messages.length === 0 || !chatSelected) && (
                <div className="absolute! top-1/2! left-1/2! transform! -translate-x-1/2! -translate-y-1/2! flex! flex-col! items-center! justify-center! w-full! px-6! text-center!">
                  <h1 className="text-xl! font-semibold! text-gray-800!">
                    No hay mensajes
                  </h1>
                  <p className="text-gray-600! mt-1!">
                    Comienza una conversación con{" "}
                    <span className="font-medium!">Scaly</span> para ver aquí tu
                    historial.
                  </p>
                </div>
              )}

              {chatSelected &&
                (() => {
                  return messages.map((message: MessageInterface) => {
                    const pdfMatch =
                      message.role === "assistant"
                        ? (message.content || "").match(
                            /https?:\/\/\S+\.pdf(\?\S+)?/i
                          )
                        : null;
                    const pdfUrl = pdfMatch?.[0];
                    return (
                      <div key={message.id} className="space-y-2!">
                        <Message
                          message={message.content}
                          extraData={message.extraData}
                          role={message.role}
                        />
                        {pdfUrl && (
                          <div className="mt-1! mb-5! border! border-gray-200! rounded-md! overflow-hidden! shadow-sm! bg-white!">
                            <div className="px-3! py-2! text-xs! text-gray-500! border-b! border-gray-200! flex! items-center! justify-between!">
                              <span>Vista previa del PDF</span>
                              <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="text-blue-600! hover:underline!"
                              >
                                Abrir en pestaña nueva
                              </a>
                            </div>
                            <div className="w-full! h-80! bg-gray-50!">
                              <iframe
                                title="PDF Preview"
                                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                                className="w-full! h-full!"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}

              {/* Mensaje streaming en tiempo real (reasoning o respuesta final) */}
              {isStreaming.isActive && (
                <div className="space-y-2!">
                  {selectedTools.length > 0 && (
                    <div className="my-3! flex flex-wrap flex-row items-center gap-2 justify-start">
                      {selectedTools.map((t: any) => (
                        <Tooltip
                          title={`${t.name} (Podras ver mas informacion una vez terminada la ejecuccion)`}
                        >
                          <div
                            key={t.idx}
                            className="flex flex-row items-center gap-2 justify-start cursor-pointer!"
                          >
                            <Wrench className="w-3.5! h-3.5!" />
                            <span>{t.name}</span>
                          </div>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2!">
                    <Message
                      message={
                        isStreaming.type === "reasoning"
                          ? streamingReasoning
                          : streamingMessage
                      }
                      role="assistant"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer con input dentro del componente */}
            <div className="pt-4! mt-2! border-t! border-gray-200! bg-white/90! backdrop-blur-sm! flex! justify-center! sticky! bottom-0!">
              <Input.TextArea
                size="large"
                className="w-full! md:w-4/5! lg:w-2/3! xl:w-1/2! mt-5! rounded-lg! shadow-sm! focus:shadow-md! transition-shadow!"
                rows={2}
                placeholder={
                  isLoading || isStreaming.isActive
                    ? "Esperando respuesta..."
                    : "Escribe tu mensaje..."
                }
                disabled={isLoading || isStreaming.isActive}
                onChange={(e) => setInputValue(e.target.value)}
                value={inputValue}
                onPressEnter={handleSendMessage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentChat;

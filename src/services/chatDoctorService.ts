import { ENV } from "../config/env";

const API_BASE_URL = ENV.API_URL_SCALY_MEDICO;

/**
 * Mensaje individual en el chat
 */
export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  extraData?: any;
}

/**
 * Información de un chat
 */
export interface Chat {
  chat_id: string;
  title: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Request para enviar un mensaje
 */
export interface ChatRequest {
  message: string;
}

/**
 * Request para crear un nuevo chat
 */
export interface NewChatRequest {
  title: string;
}

/**
 * Response al crear un nuevo chat
 */
export interface NewChatResponse {
  chat_id: string;
}

class ChatDoctorService {
  /**
   * Método auxiliar privado para hacer requests HTTP
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error en ChatDoctorService request:", error);
      throw error;
    }
  }

  /**
   * GET /doctor_chat/chats/{user_id}/{paciente_id}
   * Obtener todos los chats de un paciente para un usuario
   * @returns Array de chats del paciente
   */
  async getChatsByPaciente(
    userId: string,
    pacienteId: string
  ): Promise<Chat[]> {
    return this.request<Chat[]>(`/doctor_chat/chats/${userId}/${pacienteId}`, {
      method: "GET",
    });
  }

  /**
   * POST /doctor_chat/new/{user_id}/{empresa_id}/{paciente_id}
   * Crear un nuevo chat con un paciente asociado
   * @returns El ID del chat creado
   */
  async createChatWithPaciente(
    userId: string,
    empresaId: string,
    pacienteId: string,
    title: string = "Nuevo Chat"
  ): Promise<string> {
    const response = await this.request<NewChatResponse>(
      `/doctor_chat/new/${userId}/${empresaId}/${pacienteId}`,
      {
        method: "POST",
        body: JSON.stringify({ title }),
      }
    );
    return response.chat_id;
  }

  /**
   * POST /doctor_chat/{user_id}/{chat_id}/{empresa_id}/{paciente_id}
   * Enviar mensaje al chat y recibir respuesta del asistente
   * @returns El mensaje de respuesta del asistente
   */
  async sendMessage(
    userId: string,
    chatId: string,
    empresaId: string,
    pacienteId: string,
    message: string
  ): Promise<Message> {
    return this.request<Message>(
      `/doctor_chat/${userId}/${chatId}/${empresaId}/${pacienteId}`,
      {
        method: "POST",
        body: JSON.stringify({ message }),
      }
    );
  }

  /**
   * GET /doctor_chat/{user_id}/{chat_id}/{paciente_id}
   * Obtener historial completo del chat
   * @returns Array de mensajes del chat
   */
  async getChatHistory(
    userId: string,
    chatId: string,
    pacienteId: string
  ): Promise<Message[]> {
    return this.request<Message[]>(
      `/doctor_chat/${userId}/${chatId}/${pacienteId}`,
      {
        method: "GET",
      }
    );
  }

  /**
   * POST /doctor_chat/{user_id}/{chat_id}/
   * Actualizar información del chat (título, descripción, etc.)
   * @returns void
   */
  async updateChat(
    userId: string,
    chatId: string,
    data: Record<string, any>
  ): Promise<void> {
    await this.request<void>(`/doctor_chat/${userId}/${chatId}/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export const chatDoctorService = new ChatDoctorService();
export default chatDoctorService;

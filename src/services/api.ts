import axios from "axios";

// Configuración base de axios
const api = axios.create({
  baseURL: "https://tickets-api-production-bb7a.up.railway.app/api", // Ajusta esta URL según tu configuración
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Error en la petición:", error);
    return Promise.reject(error);
  }
);

// Servicios de Tickets
export const ticketService = {
  // Crear un nuevo ticket (alias para mantener compatibilidad)
  crearTicket: async (data: any) => {
    try {
      const response = await api.post("/POSTcreateTicket", data);
      return response.data;
    } catch (error) {
      console.error("Error al crear ticket:", error);
      throw error;
    }
  },

  // Alias para crearTicket (nuevo nombre)
  createTicket: async (data: any) => {
    try {
      const response = await api.post("/POSTcreateTicket", data);
      return response.data;
    } catch (error) {
      console.error("Error al crear ticket:", error);
      throw error;
    }
  },

  // Obtener tickets por rango de fechas
  getTicketsByDateRange: async (
    fechaInicio: string,
    fechaFin: string,
    page: number = 1,
    pageSize: number = 100
  ) => {
    try {
      const response = await api.get(`/GETallTicketsWithDate`, {
        params: {
          fecha_fin: fechaFin,
          fecha_inicio: fechaInicio,
          pageSize,
          page,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error al obtener tickets por fecha:", error);
      throw error;
    }
  },

  // Obtener total de tickets por rango de fechas
  getTotalTicketsByDateRange: async (fechaInicio: string, fechaFin: string) => {
    try {
      const response = await api.get(`/GETTtotalTicketsWithDate`, {
        params: {
          fecha_fin: fechaFin,
          fecha_inicio: fechaInicio,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error al obtener total de tickets:", error);
      throw error;
    }
  },
};

// Servicios de Períodos
export const periodoService = {
  // Obtener período actual
  getTodayPeriodo: async () => {
    try {
      const response = await api.get("/GETtodayPeriodo");
      return response.data;
    } catch (error) {
      console.error("Error al obtener período actual:", error);
      throw error;
    }
  },
};

// Servicios de Usuarios
export const usuarioService = {
  // Obtener todos los usuarios
  getAllUsers: async (page: number = 1, pageSize: number = 200, status: true) => {
    try {
      const response = await api.get(
        `/GETallUsers?page=${page}&pageSize=${pageSize}&estado=${status}`
      );
      return response.data;
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      throw error;
    }
  },

  // Obtener usuario por código
  getUserByCode: async (code: string) => {
    try {
      const response = await api.get(`/GETuserByCode/${code}`);
      return response.data;
    } catch (error) {
      console.error("Error al obtener usuario por código:", error);
      throw error;
    }
  },

  // Obtener total de usuarios
  getTotalUsers: async () => {
    try {
      const response = await api.get("/GETotalAllUsers");
      return response.data;
    } catch (error) {
      console.error("Error al obtener total de usuarios:", error);
      throw error;
    }
  },
};

export default api;

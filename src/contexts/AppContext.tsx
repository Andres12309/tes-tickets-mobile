import NetInfo from "@react-native-community/netinfo";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import * as Speech from "expo-speech";

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState as stateNative } from "react-native";
import { io, Socket } from "socket.io-client";
import { v5 as uuidv5 } from "uuid";
import { periodoService, ticketService, usuarioService } from "../services/api";
import {
  comidaDb,
  initDatabase,
  periodoDb,
  ticketDb,
  userDb,
} from "../services/database";
const UUID_NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";

// Extender dayjs con los plugins necesarios
dayjs.extend(utc);
dayjs.extend(timezone);

// Tipos
type User = {
  id?: number; // Hacer opcional para compatibilidad con la base de datos
  code: string;
  nombres: string;
  apellidos: string;
  pre_usuario_id: number;
  fecha_naci?: string;
  sync?: boolean; // Añadir propiedad para sincronización
};

type PreComida = {
  pre_comida_id: number;
  nombre: string;
  costo: string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
  estado: boolean;
  create_at: string;
  menu: string;
};

type PreComidaPeriodo = {
  pre_comida_periodo_id: number;
  pre_periodo_id: number;
  pre_comida_id: number;
  horas_antes: number;
  maximo_persona: number;
  activo: boolean;
  estado: boolean;
  create_at: string;
  subsidio: string;
  pre_comidas: PreComida;
};

type Periodo = {
  pre_periodo_id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  estado: boolean;
  create_at: string;
  pre_comidas_periodo: PreComidaPeriodo[];
  pre_dias_inactivos: any[]; // Ajustar tipo si es necesario
  sync?: boolean; // Añadir propiedad para sincronización
};

type Ticket = {
  pre_ticket_id?: number;
  pre_usuario_id: number;
  pre_comida_id: number;
  pre_periodo_id: number;
  comida?: string;
  costo?: string;
  consecutivo_periodo_fecha?: number;
  client_estado?: string;
  activo?: boolean;
  estado?: boolean;
  create_at: string;
  uuid4: string;
  sync?: boolean;
  sync_pending?: boolean;
  sendmail?: boolean;
  mails?: any;
};

interface TicketStats {
  total: number;
  pending: number;
  synced: number;
}

type AppState = {
  tickets: Ticket[];
  user: User | null;
  periodo: Periodo | null;
  preComidaActual: PreComida | null;
  usuariosNomina: User[];
  isOnline: boolean;
  ticketsCount: number;
  errorMessage: string[];
  periodoCode: string | null;
  showError: boolean;
  showSuccess: boolean;
  loading: boolean;
  syncStats: TicketStats;
  isSyncing: boolean;
};

type AppContextType = AppState & {
  setUser: (user: User | null) => void;
  setPeriodo: (periodo: Periodo | null) => void;
  setUsuariosNomina: (usuarios: User[]) => void;
  setIsOnline: (isOnline: boolean) => void;
  setTicketsCount: (count: number) => void;
  setErrorMessage: (messages: string[]) => void;
  setShowError: (show: boolean) => void;
  setShowSuccess: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
  handleGetPeriodo: (forceLocal: boolean) => Promise<void>;
  handleGetNomina: (forceLocal: boolean) => Promise<void>;
  handleGetTickets: () => Promise<void>;
  handleCrearTicket: (userCode: string) => Promise<void>;
  syncTickets: (force: boolean) => Promise<void>;
  speak: (text: string) => void;
  isAppInitialized: boolean;
};

// Contexto
const AppContext = createContext<AppContextType | undefined>(undefined);

// Proveedor
export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Estado inicial
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const [state, setState] = useState<AppState>({
    tickets: [],
    user: null,
    periodo: null,
    preComidaActual: null,
    usuariosNomina: [],
    isOnline: true,
    ticketsCount: 0,
    errorMessage: [],
    periodoCode: null,
    showError: false,
    showSuccess: false,
    loading: false,
    syncStats: {
      total: 0,
      pending: 0,
      synced: 0,
    },
    isSyncing: false,
  });
  const [appState, setAppState] = useState(stateNative.currentState);

  useEffect(() => {
    const subscription = stateNative.addEventListener("change", (nextState) => {
      setAppState(nextState);
    });
    return () => subscription.remove();
  }, []);

  // Inicializar la base de datos y cargar datos iniciales
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        // 1. Inicializar base de datos
        await initDatabase();
        console.log("Base de datos inicializada correctamente");

        // 2. Cargar datos locales primero para una experiencia más rápida
        await handleGetNomina(true); // Forzar carga local primero
        await handleGetPeriodo(true); // Forzar carga local primero
        await handleGetTickets(true); // Cargar tickets locales

        // 3. Si hay conexión, sincronizar con el servidor
        // if (state.isOnline && appState === "active") {
        //   await syncTickets();
        // }

        // Marcar la aplicación como inicializada
        setIsAppInitialized(true);
      } catch (error) {
        // console.error("Error al inicializar la aplicación:", error);
        setErrorMessage(["Error al cargar los datos iniciales"]);
        setShowError(true);
      } finally {
        setLoading(false);
        setTimeout(() => {
          setShowError(false);
          setShowSuccess(false);
        }, 800);
      }
    };

    setLoading(true);
    initializeApp();
  }, [state.isOnline]);

  // Socket
  const [socket, setSocket] = useState<Socket | null>(null);

  // Inicializar socket
  useEffect(() => {
    // Configurar socket
    const newSocket = io(
      "https://tickets-realtime-production.up.railway.app/sgdinner",
      // "https://tickets-realtime-production-b238.up.railway.app/sgdinner",
      {
        transports: ["websocket"],
      }
    );

    newSocket.on("connect", () => {
      console.log("Conectado al servidor de sockets");
      newSocket.emit("join:ticket", "ticketsEmitidos");
      newSocket.emit("join:ticket", "ticketPeriodos");
      newSocket.emit("join:ticket", "nominaUsuarios");
      setIsOnline(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Desconectado del servidor de sockets");
      setIsOnline(false);
    });

    newSocket.on("ticket:updated", (data) => {
      // console.log("Ticket actualizado:", data);
      // if (data.sala === "ticketsEmitidos") {
      //   if (data.data.uuid4) {
      //     console.log("Ticket recibido por socket:", data.data);
      //     console.log("state.ticketsstate.tickets:", state.tickets);
      //     const ticketSync = state.tickets.find(
      //       (t) => t.uuid4 === data.data.uuid4
      //     );
      //     console.log("ticketSync encontrado:::::", ticketSync);
      //     if (!ticketSync) {
      //       // Actualizar ticket local si es necesario
      //       ticketDb.saveTicket({
      //         ...data.data,
      //         sync_pending: false,
      //       });
      //       speak(`Registro por socket`);
      //       syncTickets();
      //     }
      //   }
      // }
    });

    setSocket(newSocket);

    // Limpiar al desmontar
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  const loadInitialData = async () => {
    await handleGetNomina(); // Esto actualizará con datos del servidor
    await handleGetPeriodo(); // Esto actualizará con datos del servidor
    await syncTickets();
  };

  // Efecto para manejar cambios en la conexión
  useEffect(() => {
    // Configurar el listener de conexión
    const unsubscribe = NetInfo.addEventListener(async (connectionState) => {
      const isNowOnline = connectionState.isConnected || false;
      const wasOffline = !state.isOnline && isNowOnline;

      setIsOnline(isNowOnline);

      // Sincronizar datos cuando se recupera la conexión
      // if (wasOffline && appState === "active" && isAppInitialized) {
      //   console.log("Conexión recuperada, sincronizando datos...");
      //   await loadInitialData();
      // }
    });

    // Obtener el estado inicial de la conexión
    const checkInitialConnection = async () => {
      const connectionState = await NetInfo.fetch();
      setIsOnline(connectionState.isConnected || false);
    };

    checkInitialConnection();

    // Limpiar al desmontar
    return () => {
      unsubscribe();
    };
  }, [state.isOnline]);

  // Refrescar updateLocalStats
  useEffect(() => {
    const refreshLocalStats = async () => {
      await updateLocalStats();
    };
    if (appState === "active") {
      refreshLocalStats();
    }
  }, [state.tickets, state.periodo, state.preComidaActual]);

  // Funciones de ayuda
  const speak = (text: string) => {
    Speech.speak(text, {
      language: "es-ES",
      pitch: 1,
      rate: 0.9,
    });
  };

  // Obtener la comida actual basada en la hora
  const getCurrentMeal = (periodo: Periodo): PreComida | null => {
    if (!periodo?.pre_comidas_periodo?.length) return null;

    const now = dayjs();

    for (const item of periodo.pre_comidas_periodo) {
      const { hora_inicio, hora_fin } = item.pre_comidas;
      const start = dayjs(`${now.format("YYYY-MM-DD")} ${hora_inicio}`);
      const end = dayjs(`${now.format("YYYY-MM-DD")} ${hora_fin}`);
      const endCorrected = end.isBefore(start) ? end.add(1, "day") : end;

      if (now.isAfter(start) && now.isBefore(endCorrected)) {
        return item.pre_comidas;
      }
    }
    return null;
  };

  // Función para obtener los tickets
  const handleGetTickets = async (forceLocal = false): Promise<void> => {
    try {
      setLoading(true);
      let tickets: Ticket[] = [];

      // 1. Si hay conexión y no forzamos carga local, intentar obtener del servidor
      if (state.isOnline && !forceLocal) {
        try {
          // Usamos un rango de fechas amplio para obtener los tickets
          const inicio = dayjs().format("DD-MM-YYYY");
          const fin = dayjs().format("DD-MM-YYYY");
          const totalResponse = await ticketService.getTotalTicketsByDateRange(
            inicio,
            fin
          );
          if (!totalResponse.success) {
            throw new Error(
              "Error al obtener el total de tickets del servidor"
            );
          }

          const totalTickets = totalResponse.data;
          const pageSize = 600; // Tamaño de página fijo
          const totalPages = Math.ceil(totalTickets / pageSize);

          // 2.2 Obtener todos los tickets paginados
          let serverTickets: any[] = [];
          for (let page = 1; page <= totalPages; page++) {
            const response = await ticketService.getTicketsByDateRange(
              inicio,
              fin,
              page,
              pageSize
            );

            if (response.sms === "ok" && Array.isArray(response.data)) {
              serverTickets = [...serverTickets, ...response.data.tickets];
            }
          }

          tickets = serverTickets;

          // Guardar tickets en la base de datos local
          for (const ticket of tickets) {
            await ticketDb.saveTicket({
              ...ticket,
              sync_pending: false,
            });
          }
        } catch (serverError) {
          console.warn(
            "Error al obtener tickets del servidor, usando caché local",
            serverError
          );
        }
      }

      // 2. Cargar tickets de la base de datos local
      const localTickets = await ticketDb.getTickets();
      if (localTickets && localTickets.length > 0) {
        setState((prev) => ({
          ...prev,
          tickets: localTickets,
          ticketsCount: localTickets.length,
        }));
      } else if (tickets.length > 0) {
        // Si no hay locales pero sí se obtuvieron del servidor, usarlos
        setState((prev) => ({
          ...prev,
          tickets,
          ticketsCount: tickets.length,
        }));
      }

      // updateLocalStats();
    } catch (error) {
      // console.error("Error al cargar tickets:", error);
      setState((prev) => ({
        ...prev,
        errorMessage: ["No se pudieron cargar los tickets"],
        showError: true,
      }));
    } finally {
      await updateLocalStats();
      setLoading(false);
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          showError: false,
          showSuccess: false,
        }));
      }, 800);
    }
  };

  // Función para obtener el período local
  const handleGetPeriodoLocal = async () => {
    try {
      let periodoData: Periodo | null = null;
      let comidasPeriodo: PreComidaPeriodo[] = [];
      if (!periodoData) {
        periodoData = await periodoDb.getCurrentPeriodo();

        // Si hay un período local, cargar sus comidas relacionadas
        if (periodoData) {
          comidasPeriodo = await comidaDb.getComidasByPeriodo(
            periodoData.pre_periodo_id
          );
        }
      }

      // 3. Validar y establecer el período
      if (periodoData) {
        // Asegurarse de que el objeto tenga la estructura correcta
        const validPeriodo: Periodo = {
          pre_periodo_id: periodoData.pre_periodo_id,
          nombre: periodoData.nombre || "Periodo Actual",
          fecha_inicio:
            periodoData.fecha_inicio || new Date().toISOString().split("T")[0],
          fecha_fin:
            periodoData.fecha_fin ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          activo: periodoData.activo ?? true,
          estado: periodoData.estado ?? true,
          create_at: periodoData.create_at || new Date().toISOString(),
          pre_comidas_periodo: comidasPeriodo || [],
          pre_dias_inactivos: periodoData.pre_dias_inactivos || [],
          sync: periodoData.sync ?? true,
        };

        return validPeriodo;
      } else {
        throw new Error("No hay datos locales disponibles");
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        errorMessage: ["No se pudo cargar el período local"],
        showError: true,
      }));
      return null;
    }
  };

  const handleGetPeriodo = async (forceLocal = false): Promise<void> => {
    try {
      setLoading(true);
      let periodoData: Periodo | null = null;
      let comidasPeriodo: PreComidaPeriodo[] = [];

      // 1. Si hay conexión y no forzamos carga local, intentar obtener del servidor
      if (state.isOnline && !forceLocal) {
        try {
          const response = await periodoService.getTodayPeriodo();

          if (response.data && response.data.pre_periodo_id) {
            periodoData = response.data as Periodo;

            // Guardar las comidas del período
            if (
              periodoData.pre_comidas_periodo &&
              periodoData.pre_comidas_periodo.length > 0
            ) {
              comidasPeriodo = periodoData.pre_comidas_periodo;

              // Guardar cada comida y su relación con el período
              for (const comidaPeriodo of comidasPeriodo) {
                if (comidaPeriodo.pre_comidas) {
                  // Guardar la comida primero
                  await comidaDb.saveComida(comidaPeriodo.pre_comidas);

                  // Luego guardar la relación comida-período
                  await comidaDb.saveComidaPeriodo({
                    pre_comida_periodo_id: comidaPeriodo.pre_comida_periodo_id,
                    pre_periodo_id: periodoData.pre_periodo_id,
                    pre_comida_id: comidaPeriodo.pre_comida_id,
                    horas_antes: comidaPeriodo.horas_antes,
                    maximo_persona: comidaPeriodo.maximo_persona,
                    activo: comidaPeriodo.activo,
                    estado: comidaPeriodo.estado,
                    subsidio: comidaPeriodo.subsidio || "0.00",
                  });
                }
              }
            }

            // Guardar el período en la base de datos local
            await periodoDb.savePeriodo(periodoData);
          }
        } catch (serverError) {
          console.warn(
            "Error al obtener período del servidor, usando caché local",
            serverError
          );
        }
      }

      // 2. Si no se obtuvo del servidor o hay un error, cargar desde la base de datos local
      if (!periodoData) {
        periodoData = await periodoDb.getCurrentPeriodo();

        // Si hay un período local, cargar sus comidas relacionadas
        if (periodoData) {
          comidasPeriodo = await comidaDb.getComidasByPeriodo(
            periodoData.pre_periodo_id
          );
        }
      }

      // 3. Validar y establecer el período
      if (periodoData) {
        // Asegurarse de que el objeto tenga la estructura correcta
        const validPeriodo: Periodo = {
          pre_periodo_id: periodoData.pre_periodo_id,
          nombre: periodoData.nombre || "Periodo Actual",
          fecha_inicio:
            periodoData.fecha_inicio || new Date().toISOString().split("T")[0],
          fecha_fin:
            periodoData.fecha_fin ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          activo: periodoData.activo ?? true,
          estado: periodoData.estado ?? true,
          create_at: periodoData.create_at || new Date().toISOString(),
          pre_comidas_periodo: comidasPeriodo || [],
          pre_dias_inactivos: periodoData.pre_dias_inactivos || [],
          sync: periodoData.sync ?? true,
        };

        setPeriodo(validPeriodo);
        setState((prev) => ({
          ...prev,
          periodoCode: "ok",
          preComidaActual: getCurrentMeal(validPeriodo) || null,
        }));
      } else {
        throw new Error("No se pudo cargar ningún período, ni local ni remoto");
      }
    } catch (error) {
      // console.error("Error al obtener período:", error);
      setState((prev) => ({
        ...prev,
        errorMessage: ["No se pudo cargar el período"],
        showError: true,
      }));
    } finally {
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          showError: false,
          showSuccess: false,
          loading: false,
        }));
      }, 800);
    }
  };

  // Función para obtener la nómina de usuarios
  const handleGetNomina = async (forceLocal = false): Promise<void> => {
    try {
      setLoading(true);
      let users: User[] = [];
      // 1. Si hay conexión y no forzamos carga local, intentar obtener del servidor
      if (state.isOnline && !forceLocal) {
        try {
          const res = await usuarioService.getTotalUsers();
          if (res.sms === "ok") {
            const totalPages = Math.ceil(res.data / 300);
            for (let i = 0; i <= totalPages; i++) {
              const response = await usuarioService.getAllUsers(
                i + 1,
                300,
                true
              );
              if (response.data) {
                users = [...users, ...response.data];
              }
            }
          }
          for (const user of users) {
            await userDb.saveUser(user);
          }
        } catch (serverError) {
          console.warn(
            "Error al obtener nómina del servidor, usando caché local",
            serverError
          );
        }
      }
      // 2. Cargar usuarios de la base de datos local
      const localUsers = await userDb.getAllUsers();

      if (localUsers && localUsers.length > 0) {
        setUsuariosNomina(localUsers);
      } else if (users.length > 0) {
        // Si no hay locales pero sí se obtuvieron del servidor, usarlos
        setUsuariosNomina(users);
      } else {
        throw new Error("No se encontraron usuarios");
      }
    } catch (error) {
      // console.error("Error al cargar nómina:", error);
      setState((prev) => ({
        ...prev,
        errorMessage: ["No se pudo cargar la nómina de usuarios"],
        showError: true,
      }));
    } finally {
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          showError: false,
          showSuccess: false,
          loading: false,
        }));
      }, 800);
    }
  };

  // Función auxiliar para actualizar estadísticas
  const updateSyncStats = async () => {
    if (!state.periodo || !state.preComidaActual) return;

    const stats = await ticketDb.getTicketStats(
      state.periodo.pre_periodo_id,
      state.preComidaActual.pre_comida_id
    );
    console.log("Estadísticas de sincronización actualizadas:", stats);
    setState((prev) => ({ ...prev, syncStats: stats }));
  };

  // Función para actualizar estadísticas locales
  const updateLocalStats = async () => {
    if (!state.periodo || !state.preComidaActual) return;

    const localTickets = await ticketDb.getTickets();

    const currentTickets = localTickets.filter(
      (t: Ticket) =>
        t.pre_periodo_id === state.periodo?.pre_periodo_id &&
        t.pre_comida_id === state.preComidaActual?.pre_comida_id
    );

    const stats = {
      total: currentTickets.length,
      pending: currentTickets.filter((t: Ticket) => t.sync_pending).length,
      synced: currentTickets.filter((t: Ticket) => !t.sync_pending).length,
    };

    setState((prev) => ({ ...prev, syncStats: stats }));
  };

  // Función para sincronizar tickets
  const LAST_SYNC_KEY = "last_sync";
  const syncTickets = async (force = false): Promise<void> => {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const now = Date.now();

    if (!force && lastSync && now - parseInt(lastSync) < 5 * 60 * 1000) {
      return; // No sincronizar si pasaron menos de 5 min
    }

    if (!state.isOnline) {
      setState((prev) => ({ ...prev, isSyncing: false }));
      setErrorMessage(["No hay conexión a internet"]);
      setShowError(true);
      speak("No hay conexión a internet");
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          showError: false,
          showSuccess: false,
        }));
      }, 1000);
      return;
    }

    const periodoLocal = await handleGetPeriodoLocal();

    setState((prev) => ({ ...prev, isSyncing: true }));

    try {
      // 1. Obtener tickets locales
      const localTickets = await ticketDb.getTickets();
      console.log("Tickets locales obtenidos:", localTickets.length);
      const localTicketsMap = new Map(localTickets.map((t) => [t.uuid4, t]));

      // 2. Obtener tickets del servidor usando el rango de fechas del período
      const fechaInicio = dayjs().format("DD-MM-YYYY");
      const fechaFin = dayjs().format("DD-MM-YYYY");

      // 2.1 Obtener el total de tickets del servidor
      const totalResponse = await ticketService.getTotalTicketsByDateRange(
        fechaInicio,
        fechaFin
      );

      if (!totalResponse.success) {
        throw new Error("Error al obtener el total de tickets del servidor");
      }

      const totalTickets = totalResponse.data;
      const pageSize = 600; // Tamaño de página fijo
      const totalPages = Math.ceil(totalTickets / pageSize);

      // 2.2 Obtener todos los tickets paginados
      let serverTickets: any[] = [];
      for (let page = 1; page <= totalPages; page++) {
        const response = await ticketService.getTicketsByDateRange(
          fechaInicio,
          fechaFin,
          page,
          pageSize
        );

        if (response.sms === "ok") {
          serverTickets = [...serverTickets, ...response.data.tickets];
        }
      }
      if (!periodoLocal) {
        console.warn("No se puede sincronizar: falta período o comida actual");
        return;
      }

      // 2.3 Filtrar por comida actual
      const filteredServerTickets = serverTickets.filter(
        (t) => t.pre_comida_id === getCurrentMeal(periodoLocal)?.pre_comida_id
      );

      const serverTicketsMap = new Map(
        filteredServerTickets.map((t) => [t.uuid4, t])
      );

      // 3. Procesar sincronización
      const ticketsToUpdate: Ticket[] = [];
      const ticketsToCreate: Ticket[] = [];

      // 3.1. Actualizar o crear tickets locales con datos del servidor
      for (const serverTicket of filteredServerTickets) {
        const localTicket = localTicketsMap.get(serverTicket.uuid4);

        if (localTicket) {
          // Actualizar ticket existente con datos del servidor
          ticketsToUpdate.push({
            ...localTicket,
            ...serverTicket,
            sync_pending: false, // Marcamos como sincronizado
          });
        } else {
          // Crear nuevo ticket local con datos del servidor
          ticketsToCreate.push({
            ...serverTicket,
            sync_pending: false,
          });
        }
      }

      // 3.2. Marcar como pendientes los tickets locales que no están en el servidor
      for (const [uuid, localTicket] of localTicketsMap.entries()) {
        if (!serverTicketsMap.has(uuid)) {
          ticketsToUpdate.push({
            ...localTicket,
            sync_pending: true,
          });
        }
      }

      // 4. Guardar cambios en la base de datos local
      for (const ticket of [...ticketsToUpdate, ...ticketsToCreate]) {
        await ticketDb.saveTicket(ticket);
      }

      // 5. Actualizar estado y estadísticas
      await handleGetTickets();
      // updateLocalStats();

      // 6. Sincronizar tickets pendientes
      const pendingTickets = localTickets.filter((t) => t.sync_pending);
      const failedTickets: Ticket[] = [];

      for (const ticket of pendingTickets) {
        if (ticket.uuid4 === undefined || !ticket.uuid4) {
          console.warn("Ticket sin UUID, no se sincroniza:", ticket);
          continue; // Saltar tickets sin UUID
        }
        try {
          const response = await ticketService.createTicket(ticket);
          if (response.sms === "ok" || response.code === "limitcomidauser") {
            await ticketDb.saveTicket({
              ...ticket,
              sync_pending: false,
              pre_ticket_id: response.data?.pre_ticket_id || 0,
            });
          } else {
            // console.log("Error al sincronizar ticket:", response);
            failedTickets.push(ticket);
          }
        } catch (error) {
          // console.error("Error al sincronizar ticket:", error);
          failedTickets.push(ticket);
        } finally {
          setState((prev) => ({ ...prev, isSyncing: false }));
        }
      }

      // 6.1 Eliminar tickets que estan sincronizados y el servidor no los tiene
      const syncedTickets = localTickets.filter(
        (t) => !t.sync_pending && !serverTicketsMap.has(t.uuid4)
      );

      for (const ticket of syncedTickets) {
        try {
          await ticketDb.deleteTicketByUuid(ticket.uuid4);
          console.log("Ticket eliminado:", ticket.uuid4);
        } catch (error) {
          // console.error("Error al eliminar ticket:", error);
          failedTickets.push(ticket);
        } finally {
          setState((prev) => ({ ...prev, isSyncing: false }));
        }
      }

      // 7. Notificar resultado
      if (failedTickets.length === 0) {
        speak("Sincronización completada");
      } else {
        speak(`Sincronización parcial. ${failedTickets.length} pendientes.`);
      }
    } catch (error) {
      // console.error("Error en la sincronización:", error);
      setErrorMessage(["Error al sincronizar"]);
      setShowError(true);
      speak("Error al sincronizar");
    } finally {
      await AsyncStorage.setItem(LAST_SYNC_KEY, now.toString());
      setIsAppInitialized(true);
      await updateLocalStats();
      setTimeout(() => {
        setShowError(false);
        setShowSuccess(false);
      }, 800);
      setState((prev) => ({ ...prev, isSyncing: false }));
    }
  };

  // Función para guardar ticket (siempre localmente)
  const handleSaveTicket = async (ticketData: Ticket, user: any) => {
    try {
      // Guardar localmente siempre
      const saveResult = await ticketDb.saveTicket({
        ...ticketData,
        sync_pending: true, // Siempre marcar como pendiente
      });

      if (saveResult.isNew) {
        setUser(user);
        setShowSuccess(true);
        speak("Pedido exitoso");

        // if (socket?.connected) {
        //   socket.emit("ticket:update", {
        //     sala: "ticketsEmitidos",
        //     data: ticketData,
        //   });
        // }

        // Actualizar lista de tickets y estadísticas
      }
    } catch (error) {
      // console.error("Error al guardar el ticket:", error);
      setErrorMessage(["Error al guardar el pedido"]);
      setShowError(true);
    }
  };

  const handleCrearTicket = async (userCode: string): Promise<void> => {
    if (!isAppInitialized) {
      setState((prev) => ({
        ...prev,
        errorMessage: [
          "La aplicación aún no ha terminado de cargar. Por favor espere...",
          "La información se está cargando.... Por favor espere.",
        ],
        showError: true,
      }));
      speak("Aún no estoy lista. Por favor espere un momento.");
      return;
    }

    if (!userCode || userCode.trim() === "") {
      setState((prev) => ({
        ...prev,
        errorMessage: ["Por favor ingrese un código de usuario"],
        showError: true,
      }));
      speak("Por favor ingrese un código");
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          errorMessage: [],
          showError: false,
        }));
      }, 1000);
      return;
    }

    if (!state.periodo) {
      setState((prev) => ({
        ...prev,
        errorMessage: ["No hay un período activo"],
        showError: true,
      }));
      speak("No hay período activo, Sincronice...");
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          errorMessage: [],
          showError: false,
        }));
      }, 1000);
      return;
    }

    if (!state.preComidaActual) {
      setState((prev) => ({
        ...prev,
        errorMessage: ["No hay una comida activa"],
        showError: true,
      }));
      speak("No hay comida activa");
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true }));

      // Buscar el usuario por código
      const user = state.usuariosNomina.find(
        (data: User) => `${data.code}` === `${userCode}`
      );

      if (state.usuariosNomina.length === 0) {
        speak("No hay usuarios en la nómina, Sincronice...");
        setState((prev) => ({
          ...prev,
          errorMessage: ["No hay usuarios en la nómina"],
          showError: true,
        }));
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            user: null,
            showSuccess: false,
            errorMessage: [],
            loading: false,
          }));
        }, 1000);
        return;
      }

      if (!user) {
        speak("Error en el código");
        throw new Error("Error en el código");
      }

      const isSpecialCode = ["V001", "E001", "G001", "P001", "X001"].includes(
        userCode
      );

      // Crear objeto de ticket
      const ticketData: Ticket = {
        pre_usuario_id: user.pre_usuario_id,
        pre_comida_id: state.preComidaActual.pre_comida_id,
        pre_periodo_id: state.periodo.pre_periodo_id,
        create_at: dayjs().format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
        uuid4: uuidv5(
          `${user.pre_usuario_id}-${state.preComidaActual.pre_comida_id}-${dayjs().format("YYYYMMDD")}${isSpecialCode ? `-${Date.now()}` : ""}`,
          UUID_NAMESPACE
        ),
        sync_pending: true,
        estado: true,
        activo: true,
        client_estado: "pendiente",
      };

      // Verificar duplicados (solo verifica por usuario, comida y período)
      const ticketExists = await ticketDb.ticketExists(
        ticketData.pre_usuario_id,
        ticketData.pre_comida_id,
        ticketData.pre_periodo_id
      );

      if (ticketExists && !isSpecialCode) {
        speak(`Ya separó ${state.preComidaActual.nombre}`);
        setState((prev) => ({
          ...prev,
          showSuccess: true,
          loading: false,
        }));
        return;
      }

      // Si hay conexión, intentar crear el ticket en el servidor
      // if (state.isOnline) {
      //   try {
      //     const response = await ticketService.createTicket(ticketData);

      //     if (response && response.sms === "ok") {
      //       // Guardar localmente como sincronizado
      //       await ticketDb.saveTicket({
      //         ...ticketData,
      //         sync_pending: false,
      //         pre_ticket_id: response.data?.pre_ticket_id || 0,
      //       });

      //       setState((prev) => ({
      //         ...prev,
      //         showSuccess: true,
      //         loading: false,
      //       }));
      //       speak("Pedido exitoso");

      //       if (socket?.connected) {
      //         socket.emit("ticket:update", {
      //           sala: "ticketsEmitidos",
      //           data: ticketData,
      //         });
      //       }
      //       return;
      //     }
      //     // Si hay un error en la respuesta del servidor, continuar para guardar localmente
      //   } catch (error) {
      //     console.warn(
      //       "Error al enviar al servidor, guardando localmente",
      //       error
      //     );
      //   }
      // }

      // Guardar localmente si no hay conexión o falla la llamada al servidor
      await handleSaveTicket(ticketData, user);
    } catch (error: any) {
      // console.error("Error al crear ticket:", error);
      setState((prev) => ({
        ...prev,
        errorMessage: [error.message || "Error al procesar la solicitud"],
        showError: true,
        loading: false,
      }));
    } finally {
      await handleGetTickets(true);
      setTimeout(() => {
        setShowError(false);
        setState((prev) => ({
          ...prev,
          user: null,
          showSuccess: false,
          loading: false,
        }));
      }, 500);
    }
  };

  // Actualizadores de estado
  const setUser = (user: User | null) =>
    setState((prev) => ({ ...prev, user }));
  const setPeriodo = (periodo: Periodo | null) =>
    setState((prev) => ({ ...prev, periodo }));
  const setUsuariosNomina = (usuariosNomina: User[]) =>
    setState((prev) => ({ ...prev, usuariosNomina }));
  const setAllTickets = (tickets: Ticket[]) =>
    setState((prev) => ({ ...prev, tickets }));
  const setIsOnline = (isOnline: boolean) =>
    setState((prev) => ({ ...prev, isOnline }));
  const setTicketsCount = (ticketsCount: number) =>
    setState((prev) => ({ ...prev, ticketsCount }));
  const setErrorMessage = (errorMessage: string[]) =>
    setState((prev) => ({ ...prev, errorMessage }));
  const setShowError = (showError: boolean) =>
    setState((prev) => ({ ...prev, showError }));
  const setShowSuccess = (showSuccess: boolean) =>
    setState((prev) => ({ ...prev, showSuccess }));
  const setLoading = (loading: boolean) =>
    setState((prev) => ({ ...prev, loading }));

  return (
    <AppContext.Provider
      value={{
        ...state,
        setUser,
        setPeriodo,
        setUsuariosNomina,
        setIsOnline,
        setTicketsCount,
        setErrorMessage,
        setShowError,
        setShowSuccess,
        setLoading,
        handleGetPeriodo,
        handleGetNomina,
        handleCrearTicket,
        syncTickets,
        speak,
        handleGetTickets,
        isAppInitialized,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext debe usarse dentro de un AppProvider");
  }
  return context;
};

export default AppContext;

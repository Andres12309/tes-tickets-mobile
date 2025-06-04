import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Speech from "expo-speech";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState as stateNative } from "react-native";
import { v5 as uuidv5 } from "uuid";
import {
  Periodo,
  PreComida,
  PreComidaPeriodo,
  Ticket,
  TicketStats,
  User,
} from "../interfaces/interfaces";
import { periodoService, ticketService, usuarioService } from "../services/api";
import {
  comidaDb,
  initDatabase,
  periodoDb,
  ticketDb,
  userDb,
} from "../services/database";
const UUID_NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";
const { StorageAccessFramework } = FileSystem;

// Extender dayjs con los plugins necesarios
dayjs.extend(utc);
dayjs.extend(timezone);

interface SyncProgress {
  current: number;
  total: number;
  status: "idle" | "fetching" | "processing" | "syncing" | "completed";
  message: string;
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
  syncProgress: SyncProgress;
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
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const [state, setState] = useState<AppState>({
    tickets: [],
    user: null,
    periodo: null,
    preComidaActual: null,
    usuariosNomina: [],
    isOnline: false,
    ticketsCount: 0,
    errorMessage: [],
    periodoCode: null,
    showError: false,
    showSuccess: false,
    loading: true,
    syncStats: {
      total: 0,
      pending: 0,
      synced: 0,
    },
    isSyncing: false,
    syncProgress: {
      current: 0,
      total: 0,
      status: "idle",
      message: "",
    },
  });
  const [appState, setAppState] = useState(stateNative.currentState);

  useEffect(() => {
    const subscription = stateNative.addEventListener("change", (nextState) => {
      setAppState(nextState);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initDatabase();
        console.log("Base de datos inicializada correctamente");

        await handleGetNomina(true);
        await handleGetPeriodo(true);
        await handleGetTickets(true);

        // if (state.isOnline && appState === "active") {
        //   await syncTickets();
        // }

        setIsAppInitialized(true);
      } catch (error) {
        // console.error("Error al inicializar la aplicación:", error);
        setErrorMessage(["Error al cargar los datos iniciales"]);
        setShowError(true);
      } finally {
        setTimeout(() => {
          setShowError(false);
          setShowSuccess(false);
        }, 800);
      }
    };

    initializeApp();
  }, [state.isOnline]);

  // Socket
  // const [socket, setSocket] = useState<Socket | null>(null);

  // // Inicializar socket
  // useEffect(() => {
  //   // Configurar socket
  //   const newSocket = io(
  //     "https://tickets-realtime-production.up.railway.app/sgdinner",
  //     // "https://tickets-realtime-production-b238.up.railway.app/sgdinner",
  //     {
  //       transports: ["websocket"],
  //     }
  //   );

  //   newSocket.on("connect", () => {
  //     console.log("Conectado al servidor de sockets");
  //     newSocket.emit("join:ticket", "ticketsEmitidos");
  //     newSocket.emit("join:ticket", "ticketPeriodos");
  //     newSocket.emit("join:ticket", "nominaUsuarios");
  //     setIsOnline(true);
  //   });

  //   newSocket.on("disconnect", () => {
  //     console.log("Desconectado del servidor de sockets");
  //     setIsOnline(false);
  //   });

  //   newSocket.on("ticket:updated", (data) => {
  //     // console.log("Ticket actualizado:", data);
  //     // if (data.sala === "ticketsEmitidos") {
  //     //   if (data.data.uuid4) {
  //     //     console.log("Ticket recibido por socket:", data.data);
  //     //     console.log("state.ticketsstate.tickets:", state.tickets);
  //     //     const ticketSync = state.tickets.find(
  //     //       (t) => t.uuid4 === data.data.uuid4
  //     //     );
  //     //     console.log("ticketSync encontrado:::::", ticketSync);
  //     //     if (!ticketSync) {
  //     //       // Actualizar ticket local si es necesario
  //     //       ticketDb.saveTicket({
  //     //         ...data.data,
  //     //         sync_pending: false,
  //     //       });
  //     //       speak(`Registro por socket`);
  //     //       syncTickets();
  //     //     }
  //     //   }
  //     // }
  //   });

  //   setSocket(newSocket);

  //   // Limpiar al desmontar
  //   return () => {
  //     if (newSocket) {
  //       newSocket.disconnect();
  //     }
  //   };
  // }, []);

  const loadInitialData = async () => {
    await handleGetNomina();
    await handleGetPeriodo();
    await syncTickets();
  };

  useEffect(() => {
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

    const checkInitialConnection = async () => {
      const connectionState = await NetInfo.fetch();
      setIsOnline(connectionState.isConnected || false);
    };

    checkInitialConnection();

    return () => {
      unsubscribe();
    };
  }, [state.isOnline]);

  useEffect(() => {
    const refreshLocalStats = async () => {
      await updateLocalStats();
    };
    if (appState === "active") {
      refreshLocalStats();
    }
  }, [state.tickets, state.periodo, state.preComidaActual]);

  const speak = (text: string) => {
    Speech.speak(text, {
      language: "es-ES",
      pitch: 1,
      rate: 0.9,
    });
  };

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

  const handleGetTickets = async (forceLocal = false): Promise<void> => {
    try {
      let tickets: Ticket[] = [];
      if (state.isOnline && !forceLocal) {
        try {
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
          const pageSize = 600;
          const totalPages = Math.ceil(totalTickets / pageSize);

          let serverTickets: Ticket[] = [];
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
            if (!ticket.uuid4) {
              console.log("Ticket sin UUID", ticket);
            }
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

      const localTickets = await ticketDb.getTickets();
      setState((prev) => ({
        ...prev,
        tickets: localTickets,
        ticketsCount: localTickets.length,
      }));

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
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          showError: false,
          showSuccess: false,
        }));
      }, 800);
    }
  };

  const handleGetPeriodoLocal = async () => {
    try {
      let comidasPeriodo: PreComidaPeriodo[] = [];
      const periodoData: Periodo | null = await periodoDb.getCurrentPeriodo();

      if (periodoData) {
        comidasPeriodo = await comidaDb.getComidasByPeriodo(
          periodoData.pre_periodo_id
        );
      }
      if (periodoData) {
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
        throw new Error("No hay periodo local disponible");
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

      if (state.isOnline && !forceLocal) {
        try {
          const response = await periodoService.getTodayPeriodo();

          if (response.data && response.data.pre_periodo_id) {
            periodoData = response.data as Periodo;

            if (
              periodoData.pre_comidas_periodo &&
              periodoData.pre_comidas_periodo.length > 0
            ) {
              comidasPeriodo = periodoData.pre_comidas_periodo;

              for (const comidaPeriodo of comidasPeriodo) {
                if (comidaPeriodo.pre_comidas) {
                  await comidaDb.saveComida(comidaPeriodo.pre_comidas);
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

            await periodoDb.savePeriodo(periodoData);
          }
        } catch (serverError) {
          console.warn(
            "Error al obtener período del servidor, usando caché local",
            serverError
          );
        }
      }

      if (!periodoData) {
        periodoData = await periodoDb.getCurrentPeriodo();
        if (periodoData) {
          comidasPeriodo = await comidaDb.getComidasByPeriodo(
            periodoData.pre_periodo_id
          );
        }
      }

      if (periodoData) {
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
      updateLocalStats();
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

  const handleGetNomina = async (forceLocal = false): Promise<void> => {
    try {
      setLoading(true);
      let users: User[] = [];
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
            if (!user.code) {
              // console.log("Usuario sin código, generando UUID:", user);
              continue;
            }
            await userDb.saveUser(user);
          }
        } catch (serverError) {
          console.warn(
            "Error al obtener nómina del servidor, usando caché local",
            serverError
          );
        }
      }
      const localUsers = await userDb.getAllUsers();
      setUsuariosNomina(localUsers);
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

  const updateLocalStats = async () => {
    const periodoLocal = await handleGetPeriodoLocal();
    if (!periodoLocal) return;

    const localTickets = await ticketDb.getTickets();

    const currentTickets = localTickets.filter(
      (t: Ticket) =>
        t.pre_periodo_id === periodoLocal.pre_periodo_id &&
        t.pre_comida_id === getCurrentMeal(periodoLocal)?.pre_comida_id
    );

    const stats = {
      total: currentTickets.length,
      pending: currentTickets.filter((t: Ticket) => t.sync_pending).length,
      synced: currentTickets.filter((t: Ticket) => !t.sync_pending).length,
    };

    setState((prev) => ({ ...prev, syncStats: stats }));
  };

  // Función para actualizar el progreso de sincronización
  const updateSyncProgress = (updates: Partial<SyncProgress>) => {
    setState((prev) => ({
      ...prev,
      syncProgress: {
        ...prev.syncProgress,
        ...updates,
      },
    }));
  };

  const LAST_SYNC_KEY = "last_sync";
  const syncTickets = async (force = false): Promise<void> => {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const now = Date.now();

    if (!force && lastSync && now - parseInt(lastSync) < 5 * 60 * 1000) {
      return;
    }

    const resetProgress = (): SyncProgress => ({
      current: 0,
      total: 1,
      status: "idle",
      message: "Preparando sincronización...",
    });

    let progress = resetProgress();
    const updateProgress = (updates: Partial<SyncProgress>) => {
      progress = { ...progress, ...updates };
      updateSyncProgress(progress);
    };

    if (!state.isOnline) {
      const errorMsg = "No hay conexión a internet";
      updateProgress({
        status: "idle",
        message: errorMsg,
        current: 0,
        total: 1,
      });
      setErrorMessage([errorMsg]);
      setShowError(true);
      speak(errorMsg);
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          showError: false,
          showSuccess: false,
          syncProgress: resetProgress(),
        }));
      }, 1000);
      return;
    }

    setState((prev) => ({
      ...prev,
      isSyncing: true,
      syncProgress: resetProgress(),
    }));

    // Obtener período local
    updateProgress({
      status: "fetching",
      message: "Obteniendo datos locales...",
    });

    const periodoLocal = await handleGetPeriodoLocal();

    try {
      updateProgress({
        status: "fetching",
        message: "Obteniendo tickets locales...",
      });

      const localTickets = await ticketDb.getTickets();
      console.log("Tickets locales obtenidos:", localTickets.length);
      const localTicketsMap = new Map(localTickets.map((t) => [t.uuid4, t]));

      const fechaInicio = dayjs().format("DD-MM-YYYY");
      const fechaFin = dayjs().format("DD-MM-YYYY");

      updateProgress({
        status: "fetching",
        message: "Obteniendo total de tickets...",
      });

      const totalResponse = await ticketService.getTotalTicketsByDateRange(
        fechaInicio,
        fechaFin
      );

      if (!totalResponse.success) {
        throw new Error("Error al obtener el total de tickets del servidor");
      }

      const totalTickets = totalResponse.data;
      const pageSize = 600;
      const totalPages = Math.ceil(totalTickets / pageSize);

      const WEIGHTS = {
        DOWNLOAD: 0.4, // 40% para descarga
        PROCESSING: 0.3, // 30% para procesamiento
        UPLOAD: 0.3, // 30% para subida
      };

      let currentProgress = 0;

      const updateWeightedProgress = (
        stage: "DOWNLOAD" | "PROCESSING" | "UPLOAD",
        current: number,
        total: number,
        message: string
      ) => {
        const weight = WEIGHTS[stage];
        const stageProgress = total > 0 ? (current / total) * weight : 0;

        let accumulated = 0;
        if (stage === "DOWNLOAD") {
          accumulated = stageProgress;
        } else if (stage === "PROCESSING") {
          accumulated = WEIGHTS.DOWNLOAD + stageProgress;
        } else {
          accumulated = WEIGHTS.DOWNLOAD + WEIGHTS.PROCESSING + stageProgress;
        }

        // Actualizar solo si hay un cambio significativo (más del 1%)
        if (
          Math.abs(accumulated - currentProgress) >= 0.01 ||
          current === 0 ||
          current === total
        ) {
          currentProgress = accumulated;
          updateProgress({
            current: Math.round(currentProgress * 100),
            total: 100,
            message: message,
          });
        }
      };

      updateWeightedProgress(
        "DOWNLOAD",
        0,
        totalPages,
        `Descargando datos (0/${totalPages} páginas)...`
      );

      let serverTickets: Ticket[] = [];
      for (let page = 1; page <= totalPages; page++) {
        const response = await ticketService.getTicketsByDateRange(
          fechaInicio,
          fechaFin,
          page,
          pageSize
        );

        if (response.sms === "ok") {
          serverTickets = [...serverTickets, ...response.data.tickets];
          updateWeightedProgress(
            "DOWNLOAD",
            page,
            totalPages,
            `Descargando datos (${page}/${totalPages} páginas)...`
          );
        }
      }
      if (!periodoLocal) {
        throw new Error("No se puede sincronizar: falta período o comida actual");
      }

      const filteredServerTickets = serverTickets.filter(
        (t) => t.pre_comida_id === getCurrentMeal(periodoLocal)?.pre_comida_id
      );

      const serverTicketsMap = new Map(
        filteredServerTickets.map((t) => [t.uuid4, t])
      );

      updateWeightedProgress("PROCESSING", 0, 1, "Procesando datos...");

      const ticketsToUpdate: Ticket[] = [];
      const ticketsToCreate: Ticket[] = [];

      for (const serverTicket of filteredServerTickets) {
        const localTicket = localTicketsMap.get(serverTicket.uuid4);

        if (localTicket) {
          ticketsToUpdate.push({
            ...localTicket,
            ...serverTicket,
            sync_pending: false,
          });
        } else {
          ticketsToCreate.push({
            ...serverTicket,
            sync_pending: false,
          });
        }
      }

      for (const [uuid4, localTicket] of localTicketsMap.entries()) {
        if (!serverTicketsMap.has(uuid4)) {
          ticketsToUpdate.push({
            ...localTicket,
            sync_pending: true,
          });
        }
      }

      const allTickets = [...ticketsToUpdate, ...ticketsToCreate];
      const totalToProcess = allTickets.length;

      for (let i = 0; i < allTickets.length; i++) {
        const ticket = allTickets[i];
        if (!ticket.uuid4) {
          console.warn("Ticket sin UUID, omitiendo:", ticket);
          continue;
        }

        await ticketDb.saveTicket(ticket);

        // Actualizar progreso cada 10 tickets o en el último
        if (i % 10 === 0 || i === totalToProcess - 1) {
          updateWeightedProgress(
            "PROCESSING",
            i + 1,
            totalToProcess,
            `Procesando datos (${i + 1}/${totalToProcess})...`
          );
        }
      }

      updateWeightedProgress(
        "UPLOAD",
        0,
        1,
        "Actualizando lista de tickets..."
      );
      const pendingTickets = localTickets.filter((t) => t.sync_pending);
      const failedTickets: Ticket[] = [];

      if (pendingTickets.length === 0) {
        updateWeightedProgress(
          "UPLOAD",
          1,
          1,
          "No hay cambios pendientes por sincronizar"
        );
      }

      for (let i = 0; i < pendingTickets.length; i++) {
        const ticket = pendingTickets[i];
        const current = i + 1;
        const total = pendingTickets.length;

        try {
          updateWeightedProgress(
            "UPLOAD",
            current,
            total,
            `Sincronizando cambios (${current}/${total})...`
          );

          const response = await ticketService.createTicket({
            ...ticket,
            manual: true,
          });
          if (response.sms === "ok" || response.code === "limitcomidauser") {
            await ticketDb.saveTicket({
              ...ticket,
              sync_pending: false,
              pre_ticket_id: response.data?.pre_ticket_id,
            });
          } else {
            // console.log("Error al sincronizar ticket:", response);
            failedTickets.push(ticket);
          }
        } catch (error) {
          // console.error("Error al sincronizar ticket:", error);
          failedTickets.push(ticket);
        }
      }

      const syncedTickets = localTickets.filter(
        (t) => !t.sync_pending && !serverTicketsMap.has(t.uuid4)
      );

      for (const ticket of syncedTickets) {
        updateWeightedProgress(
          "UPLOAD",
          pendingTickets.length + syncedTickets.indexOf(ticket) + 1,
          totalToProcess,
          `Eliminando tickets sincronizados (${pendingTickets.length + syncedTickets.indexOf(ticket) + 1}/${totalToProcess})...`
        );
        try {
          await ticketDb.deleteTicketByUuid(ticket.uuid4);
          console.log("Ticket eliminado:", ticket.uuid4);
        } catch (error) {
          failedTickets.push(ticket);
        }
      }

      if (failedTickets.length === 0) {
        updateProgress({
          status: "completed",
          current: 100,
          total: 100,
          message: "Sincronización completada exitosamente",
        });
        speak("Sincronización completada");
      } else {
        updateProgress({
          status: "completed",
          current: 100,
          total: 100,
          message: `Sincronización completada con ${failedTickets.length} errores`,
        });
        speak(`Sincronización completada con ${failedTickets.length} errores`);
      }

      if (pendingTickets.length > 0) {
        try {
          let csvContent = "Codigo,Comida,Fecha\n";
          const userMap = new Map(
            state.usuariosNomina.map((user) => [user.pre_usuario_id, user])
          );

          for (const ticket of pendingTickets) {
            const user = userMap.get(ticket.pre_usuario_id);
            const comida =
              state.periodo?.pre_comidas_periodo?.find(
                (cp: PreComidaPeriodo) =>
                  cp.pre_comida_id === ticket.pre_comida_id
              )?.pre_comidas?.nombre || "Comida no encontrada";

            csvContent += `"${user?.code || ""}",`;
            csvContent += `"${comida}",`;
            csvContent += `"${dayjs(ticket.create_at).format("YYYY/MM/DD")}"\n`;
          }

          const fileName = `backup_sincronizacion_${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.csv`;
          const fileUri = `${FileSystem.documentDirectory}${fileName}`;

          try {
            const permissions =
              await StorageAccessFramework.requestDirectoryPermissionsAsync();

            if (permissions.granted) {
              const uri = await StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                fileName,
                "text/csv"
              );
              await FileSystem.writeAsStringAsync(uri, csvContent, {
                encoding: FileSystem.EncodingType.UTF8,
              });
              console.log("Backup guardado en:", uri);
              speak("Respaldo guardado en carpeta seleccionada");
            } else {
              speak("Permiso denegado para guardar archivo");
            }
          } catch (error: any) {
            console.error("Error al guardar el respaldo:", error);
            speak("Error al guardar el respaldo. " + (error.message || ""));
            await FileSystem.writeAsStringAsync(fileUri, csvContent, {
              encoding: FileSystem.EncodingType.UTF8,
            });
            console.log("Backup creado en:", fileUri);
            if (await Sharing.isAvailableAsync()) {
              Sharing.shareAsync(fileUri, {
                mimeType: "text/csv",
                dialogTitle: "Respaldo de tickets sincronizados",
                UTI: "public.comma-separated-values-text",
              });
            }
          }
        } catch (error) {
          console.log("Error al crear el respaldo:", error);
          // Continue with deletion even if backup fails
        }
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Error desconocido al sincronizar";
      console.error("Error en la sincronización:", error);
      setErrorMessage([errorMsg]);
      setShowError(true);
      speak("Error al sincronizar");
      updateProgress({
        status: "idle",
        current: 0,
        total: 100,
        message: `Error: ${errorMsg.substring(0, 50)}${errorMsg.length > 50 ? "..." : ""}`,
      });
    } finally {
      console.log("Sincronización finalizada");
      await AsyncStorage.setItem(LAST_SYNC_KEY, now.toString());
      await handleGetTickets(true);
      await updateLocalStats();
      setTimeout(() => {
        setShowError(false);
        setShowSuccess(false);
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          syncProgress: {
            ...prev.syncProgress,
            status: "completed",
          },
        }));
      }, 2000);
    }
  };

  const handleSaveTicket = async (ticketData: Ticket, user: any) => {
    try {
      const saveResult = await ticketDb.saveTicket({
        ...ticketData,
        sync_pending: true,
      });

      if (saveResult.isNew) {
        setUser(user);
        setShowSuccess(true);
        speak("Pedido exitoso");
      }
    } catch (error) {
      throw new Error("Error al guardar el ticket localmente");
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
      }, 800);
      return;
    }

    if (!state.preComidaActual) {
      setState((prev) => ({
        ...prev,
        errorMessage: ["No hay una comida activa"],
        showError: true,
      }));
      speak("No hay comida activa");
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          errorMessage: [],
          showError: false,
        }));
      }, 800);
      return;
    }

    try {
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
        }, 800);
        return;
      }

      if (!user) {
        speak("Error en el código");
        throw new Error("Error en el código");
      }

      const isSpecialCode = ["V001", "E001", "G001", "P001", "X001"].includes(
        userCode
      );

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
      }, 300);
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

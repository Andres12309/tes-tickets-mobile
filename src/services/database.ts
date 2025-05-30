import * as SQLite from "expo-sqlite";
import { Comida, Periodo, Ticket, User } from "../types/database";

let db: SQLite.SQLiteDatabase;

// Get or create database connection
export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync("tickets.db");
  }
  return db;
};

// Initialize database
const initDatabase = async (): Promise<boolean> => {
  try {
    const database = await getDatabase();

    await database.withTransactionAsync(async () => {
      // Create users table
      await database.execAsync(`CREATE TABLE IF NOT EXISTS comidas_periodo (
        pre_comida_periodo_id INTEGER PRIMARY KEY,
        pre_periodo_id INTEGER NOT NULL,
        pre_comida_id INTEGER NOT NULL,
        horas_antes INTEGER DEFAULT 1,
        maximo_persona INTEGER DEFAULT 1,
        activo BOOLEAN DEFAULT 1,
        estado BOOLEAN DEFAULT 1,
        create_at TEXT DEFAULT CURRENT_TIMESTAMP,
        subsidio TEXT DEFAULT '0.00',
        FOREIGN KEY (pre_periodo_id) REFERENCES periodos (pre_periodo_id),
        FOREIGN KEY (pre_comida_id) REFERENCES comidas (pre_comida_id),
        UNIQUE (pre_periodo_id, pre_comida_id)
      )`);

      // Create users table
      await database.execAsync(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pre_usuario_id INTEGER UNIQUE,
        code TEXT NOT NULL,
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        fecha_naci TEXT,
        sync BOOLEAN DEFAULT 0,
        sync_pending BOOLEAN DEFAULT 0
      )`);

      // Add sync column if it doesn't exist
      try {
        await database.execAsync("SELECT sync FROM users LIMIT 1");
      } catch (e) {
        console.log("Adding sync column to users table");
        await database.execAsync(
          "ALTER TABLE users ADD COLUMN sync BOOLEAN DEFAULT 0"
        );
      }

      // Create tickets table
      await database.execAsync(`CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pre_usuario_id INTEGER,
        pre_comida_id INTEGER,
        pre_ticket_id INTEGER,
        pre_periodo_id INTEGER,
        uuid4 TEXT,
        create_at TEXT,
        sync_pending BOOLEAN DEFAULT 1,
        FOREIGN KEY (pre_usuario_id) REFERENCES users (pre_usuario_id)
      )`);

      // Add uuid4 column if it doesn't exist
      try {
        await database.execAsync("SELECT uuid4 FROM tickets LIMIT 1");
      } catch (e) {
        console.log("Adding uuid4 column to tickets table");
        await database.execAsync("ALTER TABLE tickets ADD COLUMN uuid4 TEXT");
      }

      await database.execAsync(`CREATE TABLE IF NOT EXISTS periodos (
        pre_periodo_id INTEGER PRIMARY KEY,
        nombre TEXT NOT NULL,
        fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT NOT NULL,
        estado BOOLEAN DEFAULT 1
      )`);

      await database.execAsync(`CREATE TABLE IF NOT EXISTS comidas (
        pre_comida_id INTEGER PRIMARY KEY,
        nombre TEXT NOT NULL,
        hora_inicio TEXT NOT NULL,
        hora_fin TEXT NOT NULL,
        estado BOOLEAN DEFAULT 1
      )`);
    });

    console.log("Todas las tablas han sido creadas/verificadas");
    return true;
  } catch (error) {
    console.error("Error en la transacción de inicialización:", error);
    throw error;
  }
};

// Operaciones para usuarios
const userDb = {
  saveUser: async (user: User): Promise<number> => {
    try {
      const database = await getDatabase();
      const result = await database.runAsync(
        `INSERT OR REPLACE INTO users 
         (pre_usuario_id, code, nombres, apellidos, fecha_naci, sync, sync_pending) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user.pre_usuario_id,
          user.code,
          user.nombres,
          user.apellidos,
          user.fecha_naci || null,
          user.sync ? 1 : 0,
          user.sync_pending ? 1 : 0,
        ]
      );
      return result.lastInsertRowId as number;
    } catch (error) {
      console.error("Error al guardar usuario:", error);
      throw error;
    }
  },

  getUserByCode: async (code: string): Promise<User | null> => {
    try {
      const database = await getDatabase();
      const result = await database.getAllAsync<User>(
        "SELECT * FROM users WHERE code = ?",
        [code]
      );
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error al buscar usuario:", error);
      throw error;
    }
  },

  getAllUsers: async (): Promise<User[]> => {
    try {
      const database = await getDatabase();
      return await database.getAllAsync<User>("SELECT * FROM users");
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      return [];
    }
  },
};

// Operaciones para tickets
const ticketDb = {
  // Obtener tickets pendientes de sincronización
  getPendingTickets: async (): Promise<Ticket[]> => {
    try {
      const database = await getDatabase();
      return await database.getAllAsync<Ticket>(
        "SELECT * FROM tickets WHERE sync_pending = 1"
      );
    } catch (error) {
      console.error("Error al obtener tickets pendientes:", error);
      throw error;
    }
  },

  // Limpiar tickets antiguos ya sincronizados
  cleanupOldTickets: async (
    periodoId: number,
    comidaId: number
  ): Promise<void> => {
    try {
      const database = await getDatabase();
      const currentDate = new Date().toISOString().split("T")[0];

      await database.runAsync(
        `
        DELETE FROM tickets 
        WHERE sync_pending = 0 
        AND pre_periodo_id != ? 
        AND pre_comida_id != ?
        AND date(create_at) < ?
      `,
        [periodoId, comidaId, currentDate]
      );
    } catch (error) {
      console.error("Error al limpiar tickets antiguos:", error);
      throw error;
    }
  },

  // Guardar ticket (actualizado para manejar sincronización)
  saveTicket: async (
    ticket: Ticket
  ): Promise<{ id: number; isNew: boolean }> => {
    try {
      const database = await getDatabase();

      // Si el ticket ya tiene un ID local, actualizarlo
      if (ticket.id) {
        await database.runAsync(
          `UPDATE tickets SET 
            pre_ticket_id = ?, 
            pre_usuario_id = ?, 
            pre_comida_id = ?, 
            pre_periodo_id = ?, 
            create_at = ?,
            uuid4 = ?,
            sync_pending = ? 
          WHERE id = ?`,
          [
            ticket.pre_ticket_id || null,
            ticket.pre_usuario_id,
            ticket.pre_comida_id,
            ticket.pre_periodo_id,
            ticket.create_at || new Date().toISOString(),
            ticket.uuid4 || null, // Ensure we don't pass undefined
            ticket.sync_pending ? 1 : 0,
            ticket.id,
          ]
        );

        return { id: ticket.id, isNew: false };
      }

      // Insertar nuevo ticket
      const result = await database.runAsync(
        `INSERT INTO tickets 
        (pre_ticket_id, pre_usuario_id, pre_comida_id, pre_periodo_id, create_at, sync_pending, uuid4) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ticket.pre_ticket_id || null,
          ticket.pre_usuario_id,
          ticket.pre_comida_id,
          ticket.pre_periodo_id,
          ticket.create_at || new Date().toISOString(),
          ticket.sync_pending ? 1 : 0,
          ticket.uuid4 || null, // Ensure we don't pass undefined
        ]
      );

      console.log("Ticket guardado con ID:", result.lastInsertRowId);

      const newId = result.lastInsertRowId as number;
      return { id: newId, isNew: true };
    } catch (error) {
      console.error("Error al guardar el ticket:", error);
      throw error;
    }
  },

  // Obtener tickets (actualizado para incluir todos los campos necesarios)
  getTickets: async (): Promise<Ticket[]> => {
    try {
      const database = await getDatabase();
      return await database.getAllAsync<Ticket>(
        "SELECT * FROM tickets ORDER BY create_at DESC"
      );
    } catch (error) {
      console.error("Error al obtener tickets:", error);
      throw error;
    }
  },

  getTicket: async (ticketId: number): Promise<Ticket | null> => {
    try {
      const database = await getDatabase();
      const result = await database.getAllAsync<Ticket>(
        "SELECT * FROM tickets WHERE id = ?",
        [ticketId]
      );
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error al obtener ticket:", error);
      throw error;
    }
  },

  ticketExists: async (
    usuarioId: number,
    comidaId: number,
    periodoId: number
  ): Promise<boolean> => {
    try {
      const database = await getDatabase();
      const result = await database.getAllAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM tickets 
         WHERE pre_usuario_id = ? AND pre_comida_id = ? AND pre_periodo_id = ?`,
        [usuarioId, comidaId, periodoId]
      );
      return result.length > 0 && result[0].count > 0;
    } catch (error) {
      console.error("Error al verificar ticket existente:", error);
      throw error;
    }
  },

  markTicketAsSynced: async (ticketId: number): Promise<boolean> => {
    try {
      const database = await getDatabase();
      await database.runAsync(
        "UPDATE tickets SET sync_pending = 0 WHERE id = ?",
        [ticketId]
      );
      return true;
    } catch (error) {
      console.error("Error al marcar ticket como sincronizado:", error);
      throw error;
    }
  },

  // Obtener estadísticas de tickets
  getTicketStats: async (
    periodoId: number,
    comidaId: number
  ): Promise<{
    total: number;
    pending: number;
    synced: number;
  }> => {
    try {
      const database = await getDatabase();
      const [totalResult] = await database.getAllAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM tickets 
         WHERE pre_periodo_id = ? AND pre_comida_id = ?`,
        [periodoId, comidaId]
      );

      const [pendingResult] = await database.getAllAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM tickets 
         WHERE pre_periodo_id = ? AND pre_comida_id = ? AND sync_pending = 1`,
        [periodoId, comidaId]
      );

      return {
        total: totalResult?.count || 0,
        pending: pendingResult?.count || 0,
        synced: (totalResult?.count || 0) - (pendingResult?.count || 0),
      };
    } catch (error) {
      console.error("Error al obtener estadísticas de tickets:", error);
      throw error;
    }
  },

  // Eliminar tickets sincronizado
  deleteTicket: async (id: number): Promise<void> => {
    try {
      const database = await getDatabase();
      await database.runAsync(`DELETE FROM tickets WHERE id = ?`, [id]);
    } catch (error) {
      console.error("Error al eliminar ticket:", error);
      throw error;
    }
  },

  deleteTicketByUuid: async (uuid4: string): Promise<void> => {
    try {
      const database = await getDatabase();
      await database.runAsync(`DELETE FROM tickets WHERE uuid4 = ?`, [uuid4]);
    } catch (error) {
      console.error("Error al eliminar ticket:", error);
      throw error;
    }
  },
};

// Operaciones para periodos
const periodoDb = {
  savePeriodo: async (periodo: Periodo): Promise<boolean> => {
    try {
      const database = await getDatabase();
      await database.runAsync(
        `INSERT OR REPLACE INTO periodos 
         (pre_periodo_id, nombre, fecha_inicio, fecha_fin, estado) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          periodo.pre_periodo_id,
          periodo.nombre,
          periodo.fecha_inicio,
          periodo.fecha_fin,
          periodo.estado ? 1 : 0,
        ]
      );
      return true;
    } catch (error) {
      console.error("Error al guardar período:", error);
      throw error;
    }
  },

  getCurrentPeriodo: async (): Promise<Periodo | null> => {
    try {
      const database = await getDatabase();
      const today = new Date().toISOString().split("T")[0];
      const result = await database.getAllAsync<Periodo>(
        `SELECT * FROM periodos 
         WHERE fecha_inicio <= ? AND fecha_fin >= ? AND estado = 1 
         ORDER BY pre_periodo_id DESC LIMIT 1`,
        [today, today]
      );
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error al obtener período actual:", error);
      throw error;
    }
  },
};

// Operaciones para comidas
const comidaDb = {
  saveComida: async (comida: Comida): Promise<boolean> => {
    try {
      const database = await getDatabase();
      await database.runAsync(
        `INSERT OR REPLACE INTO comidas 
         (pre_comida_id, nombre, hora_inicio, hora_fin, estado) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          comida.pre_comida_id,
          comida.nombre,
          comida.hora_inicio,
          comida.hora_fin,
          comida.estado ? 1 : 0,
        ]
      );
      return true;
    } catch (error) {
      console.error("Error al guardar comida:", error);
      throw error;
    }
  },

  getActiveComidas: async (): Promise<Comida[]> => {
    try {
      const database = await getDatabase();
      return await database.getAllAsync<Comida>(
        "SELECT * FROM comidas WHERE estado = 1 ORDER BY hora_inicio"
      );
    } catch (error) {
      console.error("Error al obtener comidas activas:", error);
      throw error;
    }
  },

  getComidasByPeriodo: async (periodoId: number): Promise<any[]> => {
    try {
      const database = await getDatabase();
      const comidasPeriodo = await database.getAllAsync<any>(
        `SELECT cp.*, c.* 
         FROM comidas_periodo cp
         JOIN comidas c ON cp.pre_comida_id = c.pre_comida_id
         WHERE cp.pre_periodo_id = ?
         ORDER BY c.hora_inicio`,
        [periodoId]
      );

      // Mapear el resultado al formato esperado
      return comidasPeriodo.map(cp => ({
        ...cp,
        pre_comidas: {
          pre_comida_id: cp.pre_comida_id,
          nombre: cp.nombre,
          hora_inicio: cp.hora_inicio,
          hora_fin: cp.hora_fin,
          activo: cp.activo,
          estado: cp.estado,
          create_at: cp.create_at,
          menu: cp.menu
        }
      }));
    } catch (error) {
      console.error("Error al obtener comidas por período:", error);
      return [];
    }
  },

  // Función para guardar la relación entre período y comida
  saveComidaPeriodo: async (comidaPeriodo: any): Promise<boolean> => {
    try {
      const database = await getDatabase();
      await database.runAsync(
        `INSERT OR REPLACE INTO comidas_periodo 
         (pre_comida_periodo_id, pre_periodo_id, pre_comida_id, horas_antes, maximo_persona, activo, estado, subsidio) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          comidaPeriodo.pre_comida_periodo_id,
          comidaPeriodo.pre_periodo_id,
          comidaPeriodo.pre_comida_id,
          comidaPeriodo.horas_antes || 1,
          comidaPeriodo.maximo_persona || 1,
          comidaPeriodo.activo ? 1 : 0,
          comidaPeriodo.estado ? 1 : 0,
          comidaPeriodo.subsidio || '0.00'
        ]
      );
      return true;
    } catch (error) {
      console.error("Error al guardar relación comida-período:", error);
      throw error;
    }
  }
};

// Servicio de sincronización
const syncService = {
  syncData: async (): Promise<boolean> => {
    try {
      const pendingTickets = await ticketDb.getPendingTickets();

      for (const ticket of pendingTickets) {
        if (ticket.id) {
          await ticketDb.markTicketAsSynced(ticket.id);
        }
      }

      return true;
    } catch (error) {
      console.error("Error en la sincronización:", error);
      throw error;
    }
  },
};

// Export all database operations
export { comidaDb, initDatabase, periodoDb, syncService, ticketDb, userDb };

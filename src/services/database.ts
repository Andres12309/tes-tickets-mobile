import * as SQLite from "expo-sqlite";
import {
  Comida,
  Periodo,
  Ticket,
  TicketWithUser,
  User,
} from "../types/database";

let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) {
    try {
      await db.execAsync("SELECT 1");
      return db;
    } catch (error) {
      console.warn("Database connection lost, reinitializing...");
      db = null;
    }
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = new Promise(async (resolve, reject) => {
    try {
      if (db) {
        try {
          await db.closeAsync();
        } catch (error) {
          console.warn("Error closing existing database:", error);
        }
      }

      db = await SQLite.openDatabaseAsync("tickets.db");
      
      console.log("Database connection established");
      isInitializing = false;
      resolve(db);
    } catch (error) {
      console.error("Failed to initialize database:", error);
      isInitializing = false;
      reject(error);
      throw error;
    }
  });

  return initPromise;
};

const withRetry = async <T>(
  operation: (db: SQLite.SQLiteDatabase) => Promise<T>,
  maxRetries = 2,
  retryDelay = 100
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const db = await getDatabase();
      return await operation(db);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Database operation attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Database operation failed");
};

// Initialize database
const initDatabase = async (): Promise<boolean> => {
  return withRetry(async (database) => {
    // Create periodos table
    await database.execAsync(`CREATE TABLE IF NOT EXISTS periodos (
      pre_periodo_id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      estado BOOLEAN DEFAULT 1
    )`);

    // Create comidas table
    await database.execAsync(`CREATE TABLE IF NOT EXISTS comidas (
      pre_comida_id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fin TEXT NOT NULL,
      estado BOOLEAN DEFAULT 1
    )`);

    // Create comidas_periodo table
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

    console.log("Todas las tablas han sido creadas/verificadas");
    return true;
  });
};

// Operaciones para usuarios
const userDb = {
  saveUser: async (user: User): Promise<number> => {
    return withRetry(async (database) => {
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
    });
  },

  getUserByCode: async (code: string): Promise<User | null> => {
    return withRetry(async (database) => {
      const result = await database.getAllAsync<User>(
        "SELECT * FROM users WHERE code = ?",
        [code]
      );
      return result.length > 0 ? result[0] : null;
    });
  },

  getAllUsers: async (): Promise<User[]> => {
    return withRetry(async (database) => {
      return await database.getAllAsync<User>("SELECT * FROM users");
    });
  },
};

// Operaciones para tickets
const ticketDb = {
  // Obtener tickets pendientes de sincronización
  getPendingTickets: async (): Promise<Ticket[]> => {
    return withRetry(async (database) => {
      return await database.getAllAsync<Ticket>(
        "SELECT * FROM tickets WHERE sync_pending = 1"
      );
    });
  },

  // Limpiar tickets antiguos ya sincronizados
  cleanupOldTickets: async (
    periodoId: number,
    comidaId: number
  ): Promise<void> => {
    return withRetry(async (database) => {
      // Primero obtenemos los IDs de los tickets sincronizados
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
    });
  },

  // Guardar ticket (actualizado para manejar sincronización)
  saveTicket: async (
    ticket: Ticket
  ): Promise<{ id: number; isNew: boolean }> => {
    return withRetry(async (database) => {
      if (!ticket.uuid4) {
        console.log("Generando UUID4 para el ticket", ticket);
      }
      if (!ticket.pre_usuario_id || !ticket.pre_comida_id || !ticket.uuid4) {
        throw new Error("Datos incompletos para ticket");
      }

      if (ticket.id) {
        // Actualizar ticket existente
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
      } else {
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
            ticket.uuid4,
          ]
        );
        return { id: result.lastInsertRowId, isNew: true };
      }
    });
  },

  // Obtener tickets (actualizado para incluir todos los campos necesarios)
  getTickets: async (): Promise<Ticket[]> => {
    return withRetry(async (database) => {
      return await database.getAllAsync<Ticket>(
        "SELECT * FROM tickets ORDER BY create_at DESC"
      );
    });
  },

  // Obtener todos los tickets con información detallada del usuario y la comida
  getAllTickets: async (): Promise<any[]> => {
    return withRetry(async (database) => {
      return await database.getAllAsync(
        `SELECT t.*, 
                u.nombres, 
                u.apellidos,
                u.code,
                c.nombre as comida
         FROM tickets t
         LEFT JOIN users u ON t.pre_usuario_id = u.pre_usuario_id
         LEFT JOIN comidas c ON t.pre_comida_id = c.pre_comida_id
         ORDER BY t.create_at DESC`
      );
    });
  },

  getTicket: async (ticketId: number): Promise<Ticket | null> => {
    return withRetry(async (database) => {
      const result = await database.getFirstAsync<Ticket>(
        "SELECT * FROM tickets WHERE id = ?",
        [ticketId]
      );
      return result || null;
    });
  },

  ticketExists: async (
    usuarioId: number,
    comidaId: number,
    periodoId: number
  ): Promise<boolean> => {
    return withRetry(async (database) => {
      const result = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM tickets 
         WHERE pre_usuario_id = ? 
         AND pre_comida_id = ? 
         AND pre_periodo_id = ?`,
        [usuarioId, comidaId, periodoId]
      );
      return result ? result.count > 0 : false;
    });
  },

  markTicketAsSynced: async (ticketId: number): Promise<boolean> => {
    return withRetry(async (database) => {
      await database.runAsync(
        "UPDATE tickets SET sync_pending = 0 WHERE id = ?",
        [ticketId]
      );
      return true;
    });
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
    return withRetry(async (database) => {
      const [totalResult, pendingResult, syncedResult] = await Promise.all([
        database.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM tickets 
           WHERE pre_periodo_id = ? AND pre_comida_id = ?`,
          [periodoId, comidaId]
        ),
        database.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM tickets 
           WHERE pre_periodo_id = ? AND pre_comida_id = ? AND sync_pending = 1`,
          [periodoId, comidaId]
        ),
        database.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM tickets 
           WHERE pre_periodo_id = ? AND pre_comida_id = ? AND sync_pending = 0`,
          [periodoId, comidaId]
        ),
      ]);

      return {
        total: totalResult?.count || 0,
        pending: pendingResult?.count || 0,
        synced: syncedResult?.count || 0,
      };
    });
  },

  // Eliminar tickets sincronizado
  deleteTicket: async (id: number): Promise<void> => {
    return withRetry(async (database) => {
      await database.runAsync("DELETE FROM tickets WHERE id = ?", [id]);
    });
  },

  deleteTicketByUuid: async (uuid4: string): Promise<void> => {
    if (!uuid4) return;
    return withRetry(async (database) => {
      await database.runAsync("DELETE FROM tickets WHERE uuid4 = ?", [uuid4]);
    });
  },

  getRecentTickets: async (limit: number = 10): Promise<TicketWithUser[]> => {
    return withRetry(async (database) => {
      return await database.getAllAsync<TicketWithUser>(
        `SELECT t.*, 
                u.nombres, 
                u.apellidos,
                u.code,
                c.nombre as comida
         FROM tickets t
         LEFT JOIN users u ON t.pre_usuario_id = u.pre_usuario_id
         LEFT JOIN comidas c ON t.pre_comida_id = c.pre_comida_id
         ORDER BY t.id DESC
         LIMIT ?`,
        [limit]
      );
    });
  },
};

// Operaciones para periodos
const periodoDb = {
  savePeriodo: async (periodo: Periodo): Promise<boolean> => {
    return withRetry(async (database) => {
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
    });
  },

  getCurrentPeriodo: async (): Promise<Periodo | null> => {
    return withRetry(async (database) => {
      const today = new Date().toISOString().split("T")[0];
      const result = await database.getAllAsync<Periodo>(
        `SELECT * FROM periodos 
         WHERE fecha_inicio <= ? AND fecha_fin >= ? AND estado = 1 
         ORDER BY pre_periodo_id DESC LIMIT 1`,
        [today, today]
      );
      return result.length > 0 ? result[0] : null;
    });
  },
};

// Operaciones para comidas
const comidaDb = {
  saveComida: async (comida: Comida): Promise<boolean> => {
    return withRetry(async (database) => {
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
    });
  },

  getActiveComidas: async (): Promise<Comida[]> => {
    return withRetry(async (database) => {
      return await database.getAllAsync<Comida>(
        "SELECT * FROM comidas WHERE estado = 1 ORDER BY hora_inicio"
      );
    });
  },

  getComidasByPeriodo: async (periodoId: number): Promise<any[]> => {
    return withRetry(async (database) => {
      const comidasPeriodo = await database.getAllAsync<any>(
        `SELECT cp.*, c.* 
         FROM comidas_periodo cp
         JOIN comidas c ON cp.pre_comida_id = c.pre_comida_id
         WHERE cp.pre_periodo_id = ?
         ORDER BY c.hora_inicio`,
        [periodoId]
      );

      // Mapear el resultado al formato esperado
      return comidasPeriodo.map((cp) => ({
        ...cp,
        pre_comidas: {
          pre_comida_id: cp.pre_comida_id,
          nombre: cp.nombre,
          hora_inicio: cp.hora_inicio,
          hora_fin: cp.hora_fin,
          activo: cp.activo,
          estado: cp.estado,
          create_at: cp.create_at,
        },
      }));
    });
  },

  // Función para guardar la relación entre período y comida
  saveComidaPeriodo: async (comidaPeriodo: any): Promise<boolean> => {
    return withRetry(async (database) => {
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
          comidaPeriodo.subsidio || "0.00",
        ]
      );
      return true;
    });
  },
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

export interface User {
  id?: number;
  pre_usuario_id: number;
  code: string;
  nombres: string;
  apellidos: string;
  fecha_naci?: string;
  sync_pending?: boolean;
  sync?: boolean; // Añadir propiedad para sincronización
}

export interface Ticket {
  id?: number;
  pre_ticket_id?: number;
  pre_usuario_id: number;
  pre_comida_id: number;
  pre_periodo_id: number;
  create_at: string;
  uuid4: string;
  sync_pending?: boolean;
}

export interface Periodo {
  pre_periodo_id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  estado: boolean;
  create_at: string;
  pre_comidas_periodo: Array<{
    pre_comida_periodo_id: number;
    pre_periodo_id: number;
    pre_comida_id: number;
    horas_antes: number;
    maximo_persona: number;
    activo: boolean;
    estado: boolean;
    create_at: string;
    subsidio: string;
    pre_comidas: {
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
  }>;
  pre_dias_inactivos: any[];
  sync?: boolean;
}

export interface Comida {
  pre_comida_id: number;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  estado: boolean;
}

export interface TicketWithUser extends Omit<Ticket, 'pre_usuario_id' | 'pre_comida_id' | 'estado' | 'create_at' | 'sync_pending'> {
  nombres?: string;
  apellidos?: string;
  code?: string;
  create_at?: string;
  sync_pending?: boolean;
  pre_usuario_id?: number;
  pre_comida_id?: number;
  periodo_id?: number;
  estado?: number;
  sync_at?: string | null;
}

export interface User {
  id?: number;
  code: string;
  nombres: string;
  apellidos: string;
  pre_usuario_id: number;
  fecha_naci?: string;
  sync?: boolean;
}

export interface PreComida {
  pre_comida_id: number;
  nombre: string;
  costo: string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
  estado: boolean;
  create_at: string;
  menu: string;
}

export interface PreComidaPeriodo {
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
}

export interface Periodo {
  pre_periodo_id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  estado: boolean;
  create_at: string;
  pre_comidas_periodo: PreComidaPeriodo[];
  pre_dias_inactivos: any[];
  sync?: boolean;
}

export interface Ticket {
  id?: number;
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
}

export interface TicketStats {
  total: number;
  pending: number;
  synced: number;
}

export type ParkingDirection = 'in' | 'out'
export type VehiclePlateColor = 'auto' | 'blue' | 'yellow' | 'green'

export interface ParkingGate {
  id: string
  gate_no: number
  name: string
  direction: ParkingDirection
  ip: string
  adapter: 'oem_ipnc' | 'signalway'
  online: number
  last_poll_at: string | null
  last_online_at: string | null
  last_event_at: string | null
  last_error: string | null
  capabilities: {
    manual_open: boolean
    barrier_status: boolean
    control_source: 'parking_lan' | 'device' | 'none'
  }
}

export interface ParkingEvent {
  id: number
  gate_id: string
  gate_name: string
  gate_no: number
  plate: string
  plate_color: string
  direction: ParkingDirection
  captured_at: string
  image_path: string | null
  vehicle_id: number | null
  owner: string | null
  department: string | null
  registered_type: string | null
}

export interface ParkingSession {
  id: number
  plate: string
  entry_gate_name: string
  exit_gate_name: string | null
  entry_time: string
  exit_time: string | null
  status: 'open' | 'closed'
  owner: string | null
  department: string | null
  vehicle_type: string | null
}

export interface RegisteredVehicle {
  id: number
  plate: string
  owner: string
  department: string
  phone: string
  vehicle_type: string
  plate_color: VehiclePlateColor
  valid_from: string | null
  valid_until: string | null
  enabled: number
  note: string
  parking_record_no: string
  parking_owner_no: string
  parking_sync_status: 'pending' | 'active' | 'failed' | 'disabled'
  parking_sync_message: string
  parking_result_id: string
  parking_synced_at: string | null
  created_at: string
  updated_at: string
}

export type VehiclePayload = Omit<
  RegisteredVehicle,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'enabled'
  | 'parking_record_no'
  | 'parking_owner_no'
  | 'parking_sync_status'
  | 'parking_sync_message'
  | 'parking_result_id'
  | 'parking_synced_at'
> & { enabled: boolean }

export interface ParkingStats {
  summary: {
    entries: number
    exits: number
    inside: number
    remaining_spaces: number
    online_gates: number
    offline_gates: number
    unregistered_events: number
  }
  channels: Array<{ gate_no: number; enter_count: number; exit_count: number }>
  matters: Record<string, number>
  timeline: Array<{ captured_at: string; direction: ParkingDirection }>
  period: { start: string; end: string }
}

export interface ListResponse<T> {
  items: T[]
  total: number
}

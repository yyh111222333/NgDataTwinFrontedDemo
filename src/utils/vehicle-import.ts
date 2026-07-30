import Papa from 'papaparse'
import type { VehiclePayload } from '@/types/parking'

export const MAX_VEHICLE_IMPORT_ROWS = 500

const headerAliases: Record<string, keyof VehiclePayload> = {
  车牌号码: 'plate',
  车牌: 'plate',
  plate: 'plate',
  车主: 'owner',
  车主姓名: 'owner',
  owner: 'owner',
  所属部门: 'department',
  部门: 'department',
  department: 'department',
  联系电话: 'phone',
  手机号: 'phone',
  phone: 'phone',
  车辆类型: 'vehicle_type',
  vehicletype: 'vehicle_type',
  vehicle_type: 'vehicle_type',
  车牌颜色: 'plate_color',
  platecolor: 'plate_color',
  plate_color: 'plate_color',
  生效日期: 'valid_from',
  有效期开始: 'valid_from',
  validfrom: 'valid_from',
  valid_from: 'valid_from',
  失效日期: 'valid_until',
  有效期结束: 'valid_until',
  validuntil: 'valid_until',
  valid_until: 'valid_until',
  启用: 'enabled',
  enabled: 'enabled',
  备注: 'note',
  note: 'note',
}

const normalizeHeader = (header: string) => header.trim().replace(/\s+/g, '').toLowerCase()

const toVehiclePayload = (row: Record<string, string>): VehiclePayload => {
  const plateColorText = String(row.plate_color ?? '')
    .trim()
    .toLowerCase()
  const plateColorMap: Record<string, VehiclePayload['plate_color']> = {
    blue: 'blue',
    蓝: 'blue',
    蓝牌: 'blue',
    yellow: 'yellow',
    黄: 'yellow',
    黄牌: 'yellow',
    green: 'green',
    绿: 'green',
    绿牌: 'green',
    auto: 'auto',
    自动: 'auto',
    自动判断: 'auto',
  }
  const enabledText = String(row.enabled ?? '')
    .trim()
    .toLowerCase()

  return {
    plate: String(row.plate ?? '')
      .replace(/\s+/g, '')
      .toUpperCase(),
    owner: String(row.owner ?? '').trim(),
    department: String(row.department ?? '').trim(),
    phone: String(row.phone ?? '').trim(),
    vehicle_type: String(row.vehicle_type ?? '').trim() || '内部车辆',
    plate_color: plateColorMap[plateColorText] ?? 'auto',
    valid_from: String(row.valid_from ?? '').trim() || null,
    valid_until: String(row.valid_until ?? '').trim() || null,
    enabled: !['0', 'false', '否', '停用', '禁用'].includes(enabledText),
    note: String(row.note ?? '').trim(),
  }
}

const checkRowLimit = (rows: VehiclePayload[]) => {
  if (rows.length > MAX_VEHICLE_IMPORT_ROWS) {
    throw new Error(`单次最多导入${MAX_VEHICLE_IMPORT_ROWS}辆车`)
  }
  return rows
}

export async function parseVehicleImportFile(file: File): Promise<VehiclePayload[]> {
  if (file.name.toLowerCase().endsWith('.txt')) {
    const rows = (await file.text())
      .split(/\r?\n/)
      .map((plate) => plate.trim())
      .filter(Boolean)
      .map((plate) => toVehiclePayload({ plate }))
    return checkRowLimit(rows)
  }

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => {
        const normalized = normalizeHeader(header)
        return headerAliases[normalized] ?? header.trim()
      },
      complete: ({ data, errors }) => {
        if (errors.length > 0) {
          reject(new Error(errors[0]?.message ?? 'CSV格式错误'))
          return
        }
        try {
          resolve(checkRowLimit(data.map(toVehiclePayload)))
        } catch (error) {
          reject(error)
        }
      },
      error: (error) => reject(error),
    })
  })
}

export function downloadVehicleImportTemplate() {
  const headers = [
    '车牌号码',
    '车主姓名',
    '所属部门',
    '联系电话',
    '车辆类型',
    '车牌颜色',
    '生效日期',
    '失效日期',
    '启用',
    '备注',
  ]
  const blob = new Blob([`\ufeff${headers.join(',')}\r\n`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = '车辆批量导入模板.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

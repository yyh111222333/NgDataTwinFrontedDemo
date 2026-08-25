import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { resolvePersonnelDirection } from '@/api/cockpit-door-signal'
import {
  PERSONNEL_DEVICES,
  PERSONNEL_DEVICE_SCENE_DOOR_IDS,
} from '@/config/cockpit-door-signal-map'
import { describe, expect, it } from 'vitest'

const EXPECTED_SCENE_DOOR_BY_IP: Readonly<Record<string, string>> = {
  '192.168.51.100': 'fullheight_X02',
  '192.168.52.100': 'fullheight_X03',
  '192.168.53.100': 'fullheight_X04',
  '192.168.52.105': 'tripod_S02',
  '192.168.52.106': 'tripod_S04',
  '192.168.53.112': 'tripod_S01',
  '192.168.53.113': 'tripod_S03',
  '192.168.53.118': 'fullheight_X01',
}

describe('personnel device SVG mapping', () => {
  it('maps all eight IP addresses to distinct X/S scene gates', () => {
    const mappedIds = PERSONNEL_DEVICES.map((device) => {
      const sceneDoorId = PERSONNEL_DEVICE_SCENE_DOOR_IDS[device.deviceNo]
      expect(sceneDoorId).toBe(EXPECTED_SCENE_DOOR_BY_IP[device.ip])
      return sceneDoorId
    })

    expect(new Set(mappedIds).size).toBe(PERSONNEL_DEVICES.length)
  })

  it('only references gate IDs that exist in the production SVG', () => {
    const svg = readFileSync(
      fileURLToPath(new URL('../assets/厂区地图_画板 1.svg', import.meta.url)),
      'utf-8',
    )

    Object.values(PERSONNEL_DEVICE_SCENE_DOOR_IDS).forEach((sceneDoorId) => {
      expect(svg).toContain(`id="${sceneDoorId}"`)
    })
  })

  it('uses the K30 direction convention for animation', () => {
    expect(resolvePersonnelDirection(1)).toBe('in')
    expect(resolvePersonnelDirection(0)).toBe('out')
  })
})

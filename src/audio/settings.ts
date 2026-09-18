export interface CrackSettings {
  enabled: boolean
  packetLoss: number
  intensity: number
}

export interface LatencySettings {
  enabled: boolean
  delayMs: number
  jitterMs: number
}

export interface DistortionSettings {
  enabled: boolean
  amount: number
}

export interface RobotSettings {
  enabled: boolean
  intensity: number
  carrierHz: number
}

export interface EffectSettings {
  crack: CrackSettings
  latency: LatencySettings
  distortion: DistortionSettings
  robot: RobotSettings
}

export const defaultEffectSettings: EffectSettings = {
  crack: { enabled: false, packetLoss: 0.08, intensity: 0.35 },
  latency: { enabled: false, delayMs: 180, jitterMs: 35 },
  distortion: { enabled: false, amount: 0.35 },
  robot: { enabled: false, intensity: 0.5, carrierHz: 70 }
}

export interface WorkletConfiguration {
  processingEnabled: boolean
  effects: EffectSettings
}

export type WorkletMessage =
  | { type: 'configure'; configuration: WorkletConfiguration }
  | { type: 'reset' }

export interface MeterMessage {
  type: 'meters'
  inputLevel: number
  outputLevel: number
}

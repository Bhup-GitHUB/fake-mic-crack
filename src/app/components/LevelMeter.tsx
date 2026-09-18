type LevelMeterProps = {
  label: string
  value: number
}

export function LevelMeter({ label, value }: LevelMeterProps) {
  const level = Math.max(0, Math.min(1, value))

  return (
    <div className="meter" aria-label={`${label} level`}>
      <div className="meter__label-row">
        <span>{label}</span>
        <span>{Math.round(level * 100)}%</span>
      </div>
      <div className="meter__track">
        <div className="meter__fill" style={{ width: `${level * 100}%` }} />
      </div>
    </div>
  )
}

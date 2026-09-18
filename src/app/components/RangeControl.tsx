type RangeControlProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  disabled?: boolean
  onChange: (value: number) => void
}

function formatValue(value: number, unit: string) {
  if (unit === '%') {
    return `${Math.round(value)}%`
  }

  if (unit === 'ms' || unit === 'Hz') {
    return `${Math.round(value)} ${unit}`
  }

  return String(value)
}

export function RangeControl({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  disabled = false,
  onChange,
}: RangeControlProps) {
  return (
    <label className="range-control">
      <span className="range-control__label">
        <span>{label}</span>
        <output>{formatValue(value, unit)}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

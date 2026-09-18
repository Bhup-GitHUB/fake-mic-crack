type ToggleProps = {
  checked: boolean
  label: string
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export function Toggle({ checked, label, disabled = false, onChange }: ToggleProps) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
    </label>
  )
}

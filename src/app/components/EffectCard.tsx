import type { ReactNode } from 'react'
import { Toggle } from './Toggle'

type EffectCardProps = {
  title: string
  description: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  children: ReactNode
}

export function EffectCard({
  title,
  description,
  enabled,
  onEnabledChange,
  children,
}: EffectCardProps) {
  return (
    <section className={`effect-card${enabled ? ' effect-card--enabled' : ''}`}>
      <div className="effect-card__header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <Toggle
          checked={enabled}
          label={`Enable ${title}`}
          onChange={onEnabledChange}
        />
      </div>
      <div className={`effect-card__controls${enabled ? '' : ' effect-card__controls--disabled'}`}>
        {children}
      </div>
    </section>
  )
}

import type { GenerationParams } from '../lib/engine'

interface GlassControlPanelProps {
  params: GenerationParams
  onChange: (params: GenerationParams) => void
  disabled?: boolean
}

/** Translucent glass panel styled like macOS Control Center, holding the generation sliders. */
export function GlassControlPanel({ params, onChange, disabled }: GlassControlPanelProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/10 p-3 shadow-lg backdrop-blur-xl">
      <ControlSlider
        label="Temperature"
        value={params.temperature}
        min={0.1}
        max={1.5}
        step={0.05}
        disabled={disabled}
        onChange={(temperature) => onChange({ ...params, temperature })}
      />
      <ControlSlider
        label="Branch count"
        value={params.branchCount}
        min={2}
        max={8}
        step={1}
        disabled={disabled}
        onChange={(branchCount) => onChange({ ...params, branchCount })}
      />
    </div>
  )
}

interface ControlSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  onChange: (value: number) => void
}

function ControlSlider({ label, value, min, max, step, disabled, onChange }: ControlSliderProps) {
  return (
    <label className="flex flex-col gap-1.5 rounded-xl bg-white/5 px-3 py-2">
      <span className="flex items-center justify-between text-xs font-medium text-ink-dim">
        <span>{label}</span>
        <span className="text-ink">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 cursor-pointer accent-cosmic disabled:cursor-not-allowed disabled:opacity-40"
      />
    </label>
  )
}

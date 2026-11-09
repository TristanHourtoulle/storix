import type { CardProgression } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { maxedLine, nextTierTone } from '../progression-copy'

type StepProgression = Exclude<CardProgression, { kind: 'max' }>

interface GaugeValues {
  copies: number
  copiesRequired: number
  dust: number | null
  cost: number
  copiesPercent: number
  dustPercent: number
  isCopiesOk: boolean
  isDustOk: boolean
}

function gaugeValues(progression: StepProgression): GaugeValues {
  const dust = progression.kind === 'loading' ? null : progression.dust
  const { copies, copiesRequired, cost } = progression
  return {
    copies,
    copiesRequired,
    dust,
    cost,
    copiesPercent: Math.min(100, Math.round((copies / copiesRequired) * 100)),
    dustPercent: dust === null ? 0 : Math.min(100, Math.round((dust / cost) * 100)),
    isCopiesOk: progression.missingCopies === 0,
    isDustOk: dust !== null && dust >= cost,
  }
}

interface GaugeHeadProps {
  label: string
  value: string
  isOk: boolean
}

function GaugeHead({ label, value, isOk }: GaugeHeadProps) {
  return (
    <div className="g-h">
      <span>{label}</span>
      <b className={isOk ? 'ok' : undefined}>{value}</b>
    </div>
  )
}

function meterProps(label: string, now: number, max: number) {
  return {
    role: 'meter',
    'aria-label': label,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-valuenow': now,
  } as const
}

export function BarGauges({ progression }: { progression: StepProgression }) {
  const values = gaugeValues(progression)
  const tone = nextTierTone(progression.to)

  return (
    <div className={`vmini ${tone.className}`} style={tone.style}>
      <div {...meterProps('Doublons', values.copies, values.copiesRequired)}>
        <GaugeHead
          label="Doublons"
          value={`${Math.min(values.copies, 99)}/${values.copiesRequired}`}
          isOk={values.isCopiesOk}
        />
        <div className="g-bar" aria-hidden="true">
          <i style={{ width: `${values.copiesPercent}%` }} />
        </div>
      </div>
      <div {...meterProps('Paillettes', values.dust ?? 0, values.cost)}>
        <GaugeHead
          label="Paillettes"
          value={`${values.dust ?? '…'}/${values.cost}`}
          isOk={values.isDustOk}
        />
        <div className="g-bar is-dust" aria-hidden="true">
          <i style={{ width: `${values.dustPercent}%` }} />
        </div>
      </div>
    </div>
  )
}

export function SheetGauges({ progression }: { progression: StepProgression }) {
  const values = gaugeValues(progression)
  const filled = Math.min(values.copies, values.copiesRequired)
  const segments = Array.from({ length: values.copiesRequired }, (_, index) => index < filled)

  return (
    <div className="gauges">
      <div className="gauge" {...meterProps('Doublons', values.copies, values.copiesRequired)}>
        <GaugeHead
          label="Doublons"
          value={`${Math.min(values.copies, 99)} / ${values.copiesRequired}`}
          isOk={values.isCopiesOk}
        />
        <div className="g-seg" aria-hidden="true">
          {segments.map((isOn, index) => (
            <i key={index} className={isOn ? 'on' : undefined} />
          ))}
        </div>
      </div>
      <div className="gauge" {...meterProps('Paillettes', values.dust ?? 0, values.cost)}>
        <GaugeHead
          label="Paillettes"
          value={`${values.dust ?? '…'} / ${values.cost}`}
          isOk={values.isDustOk}
        />
        <div className="g-bar is-dust" aria-hidden="true">
          <i style={{ width: `${values.dustPercent}%` }} />
        </div>
      </div>
    </div>
  )
}

export function MaxedBox({
  stackCount,
  convertAllDust,
  isCompact = false,
}: {
  stackCount: number
  convertAllDust: number
  isCompact?: boolean
}) {
  return (
    <div className={isCompact ? 'maxed is-compact' : 'maxed'}>
      <span className="crown">
        <Icon name="crown" className={isCompact ? 'size-4' : 'size-5'} />
      </span>
      <div>
        <b>Rareté maximale</b>
        <span>{maxedLine(stackCount, convertAllDust)}</span>
      </div>
    </div>
  )
}

import { Divider, Progress } from 'antd';

import './health-gauge.scss';

interface Props {
	stamina?: {
		staminaMax: number;
		staminaDamage: number;
		state: string;
	};
	staminaTemp?: {
		staminaTemp: number;
	}
	recoveries?: {
		recoveriesMax: number;
		recoveriesUsed: number;
	}
}

// Geometry of antd's default 120x120 'dashboard' Progress circle (100x100 viewBox, strokeWidth 6, 75deg bottom gap).
// See @rc-component/progress Circle/index.js and Circle/util.js for the source of these constants.
const GAUGE_VIEWBOX = 100;
const GAUGE_CENTER = GAUGE_VIEWBOX / 2;
const GAUGE_STROKE_WIDTH = 6;
const GAUGE_RADIUS = GAUGE_CENTER - (GAUGE_STROKE_WIDTH / 2);
const GAUGE_GAP_DEGREES = 75;
const GAUGE_SWEEP_DEGREES = 360 - GAUGE_GAP_DEGREES;
const GAUGE_START_CLOCK_DEGREES = 90 + (GAUGE_GAP_DEGREES / 2) + 90;
const HATCH_TICK_SPACING_DEGREES = 8;
// Half the arc length of one tick's spacing at the ring's radius, so each light tick is as wide as the dark gap beside it.
const HATCH_TICK_STROKE_WIDTH = GAUGE_RADIUS * (HATCH_TICK_SPACING_DEGREES / 2) * (Math.PI / 180);

// A point on the gauge ring at `clockDegrees` (0 = 12 o'clock, clockwise) and radius `r`.
const pointOnGauge = (clockDegrees: number, r: number) => {
	const rad = clockDegrees * Math.PI / 180;
	return {
		x: GAUGE_CENTER + (r * Math.sin(rad)),
		y: GAUGE_CENTER - (r * Math.cos(rad))
	};
};

// Short radial tick marks spanning the portion of the ring currently filled, used to give the
// winded stamina bar a hashed look without distorting a flat pattern across the curved stroke.
const getWindedHatchTicks = (percent: number) => {
	const sweep = (Math.max(0, Math.min(100, percent)) / 100) * GAUGE_SWEEP_DEGREES;
	const innerRadius = GAUGE_RADIUS - (GAUGE_STROKE_WIDTH / 2);
	const outerRadius = GAUGE_RADIUS + (GAUGE_STROKE_WIDTH / 2);

	const ticks = [];
	for (let angle = 0; angle <= sweep; angle += HATCH_TICK_SPACING_DEGREES) {
		const clockDegrees = GAUGE_START_CLOCK_DEGREES + angle;
		ticks.push({
			inner: pointOnGauge(clockDegrees, innerRadius),
			outer: pointOnGauge(clockDegrees, outerRadius)
		});
	}
	return ticks;
};

export const HealthGauge = (props: Props) => {
	if (!props.stamina) {
		return null;
	}

	const winded = props.stamina.state === 'winded';
	const staminaPercent = 100 * (props.stamina.staminaMax - props.stamina.staminaDamage) / props.stamina.staminaMax;

	return (
		<div className='health-gauge'>
			{
				props.staminaTemp && (props.staminaTemp.staminaTemp > 0) ?
					<Progress
						className='stamina-temp-progress'
						type='dashboard'
						percent={100 * props.staminaTemp.staminaTemp / props.stamina!.staminaMax}
						showInfo={false}
						status='active'
						strokeColor='var(--fs-vital-stamina-temp)'
					/>
					: null
			}
			<div className='stamina-progress-wrap'>
				<Progress
					type='dashboard'
					percent={staminaPercent}
					showInfo={false}
					status={winded ? 'exception' : 'active'}
					strokeColor={winded ? 'var(--fs-vital-stamina-winded)' : 'var(--fs-vital-stamina)'}
				/>
				{
					winded ?
						<svg className='stamina-winded-hatch' viewBox={`0 0 ${GAUGE_VIEWBOX} ${GAUGE_VIEWBOX}`} width={120} height={120}>
							{
								getWindedHatchTicks(staminaPercent).map((tick, n) => (
									<line
										key={n}
										x1={tick.inner.x}
										y1={tick.inner.y}
										x2={tick.outer.x}
										y2={tick.outer.y}
										stroke='var(--fs-vital-stamina)'
										strokeWidth={HATCH_TICK_STROKE_WIDTH}
										strokeLinecap='butt'
									/>
								))
							}
						</svg>
						: null
				}
			</div>
			{
				props.recoveries && (props.recoveries.recoveriesMax > 0) ?
					<Progress
						className='recovery-progress'
						type='dashboard'
						percent={100 * (props.recoveries!.recoveriesMax - props.recoveries!.recoveriesUsed) / props.recoveries!.recoveriesMax}
						showInfo={false}
						status='active'
					/>
					: null
			}
			<div className='gauge-info'>
				{
					props.staminaTemp && (props.staminaTemp.staminaTemp > 0) ?
						<>
							<div>
								Tmp <b>{props.staminaTemp.staminaTemp}</b>
							</div>
							<Divider style={{ margin: '5px 0' }} />
						</>
						: null
				}
				<div>
					Sta <b>{props.stamina!.staminaDamage ? `${props.stamina!.staminaMax - props.stamina!.staminaDamage} / ${props.stamina!.staminaMax}` : `${props.stamina!.staminaMax}`}</b>
				</div>
				{
					props.recoveries && (props.recoveries.recoveriesMax > 0) ?
						<>
							<Divider style={{ margin: '5px 0' }} />
							<div>
								Rec <b>{props.recoveries!.recoveriesUsed ? `${props.recoveries!.recoveriesMax - props.recoveries!.recoveriesUsed} / ${props.recoveries!.recoveriesMax}` : `${props.recoveries!.recoveriesMax}`}</b>
							</div>
						</>
						: null
				}
			</div>
		</div>
	);
};

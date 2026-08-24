import { ConditionType } from '@/enums/condition-type';
import { HealthGauge } from '@/components/panels/health-gauge/health-gauge';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { HeroToken } from '@/components/panels/token/token';

import './dashboard-tile.scss';

interface Props {
	hero: Hero;
}

export const DashboardTile = (props: Props) => {
	const { hero } = props;
	const staminaMax = HeroLogic.getStamina(hero);
	const staminaDamage = hero.state.staminaDamage;
	const staminaTemp = hero.state.staminaTemp;
	const recoveriesMax = HeroLogic.getRecoveries(hero);
	const recoveriesUsed = hero.state.recoveriesUsed;

	return (
		<div className='dashboard-tile'>
			<div className='dashboard-tile-portrait'>
				<HeroToken hero={hero} size={95} />
				<HealthGauge
					stamina={
						staminaMax !== 0 ?
							{
								staminaMax: staminaMax,
								staminaDamage: staminaDamage,
								state: HeroLogic.getCombatState(hero)
							}
							: undefined
					}
					staminaTemp={{
						staminaTemp: staminaTemp
					}}
					recoveries={{
						recoveriesMax: recoveriesMax,
						recoveriesUsed: recoveriesUsed
					}}
				/>
			</div>
			<div className='dashboard-tile-name'>{hero.name || 'Unnamed Hero'}</div>
			<div className='dashboard-tile-vitals'>
				{
					staminaTemp > 0 ?
						<div>Tmp <b>{staminaTemp}</b></div>
						: null
				}
				{
					staminaMax !== 0 ?
						<div>Sta <b>{staminaDamage ? `${staminaMax - staminaDamage} / ${staminaMax}` : `${staminaMax}`}</b></div>
						: null
				}
				{
					recoveriesMax > 0 ?
						<div>Rec <b>{recoveriesUsed ? `${recoveriesMax - recoveriesUsed} / ${recoveriesMax}` : `${recoveriesMax}`}</b></div>
						: null
				}
			</div>
			<div className='dashboard-tile-badges'>
				{
					HeroLogic.getHeroicResources(hero).map(hr => (
						<div key={hr.id} className='dashboard-tile-badge' style={{ backgroundColor: 'var(--fs-vital-resource)' }}>
							{hr.name}: {hr.value}
						</div>
					))
				}
				<div className='dashboard-tile-badge' style={{ backgroundColor: 'var(--fs-vital-surges)' }}>
					Surges: {hero.state.surges}
				</div>
			</div>
			{
				hero.state.conditions.length > 0 ?
					<div className='dashboard-tile-conditions'>
						{
							hero.state.conditions.map(c => (
								<div key={c.id} className='dashboard-tile-condition'>
									<div className='dashboard-tile-condition-name'>
										{(c.type === ConditionType.Custom) || (c.type === ConditionType.Quick) ? c.text : c.type}
									</div>
									<div className='dashboard-tile-condition-ends'>{c.ends}</div>
								</div>
							))
						}
					</div>
					: null
			}
		</div>
	);
};

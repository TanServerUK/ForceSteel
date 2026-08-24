import { AppFooter, FooterParams } from '@/components/panels/app-footer/app-footer';
import { useEffect, useRef } from 'react';
import { AppHeader } from '@/components/panels/app-header/app-header';
import { DashboardTile } from '@/components/panels/dashboard-tile/dashboard-tile';
import { Empty } from '@/components/controls/empty/empty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Hero } from '@/models/hero';
import { useTitle } from '@/hooks/use-title';

import './dashboard-page.scss';

const REFRESH_POLL_MS = 20000;

interface Props {
	heroes: Hero[];
	params: FooterParams;
	refreshHeroes: () => void;
}

export const DashboardPage = (props: Props) => {
	useTitle('Dashboard');

	// Keep a stable indirection to the latest closure so the mount-only effect
	// below always refreshes with the current heroes/data source.
	const refreshHeroesRef = useRef(props.refreshHeroes);
	refreshHeroesRef.current = props.refreshHeroes;

	useEffect(() => {
		const refresh = () => refreshHeroesRef.current();

		refresh();
		const interval = setInterval(refresh, REFRESH_POLL_MS);
		window.addEventListener('focus', refresh);

		return () => {
			clearInterval(interval);
			window.removeEventListener('focus', refresh);
		};
	}, []);

	return (
		<ErrorBoundary>
			<div className='dashboard-page'>
				<AppHeader subheader='Dashboard' />
				<div className='dashboard-page-content'>
					{
						props.heroes.length > 0 ?
							<div className='dashboard-tile-grid'>
								{
									props.heroes.map(hero => (
										<DashboardTile key={hero.id} hero={hero} />
									))
								}
							</div>
							:
							<Empty text='There are no active heroes.' />
					}
				</div>
				<AppFooter
					page='dashboard'
					hero={null}
					params={props.params}
				/>
			</div>
		</ErrorBoundary>
	);
};

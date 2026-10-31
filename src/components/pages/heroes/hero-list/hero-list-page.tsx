import { AppFooter, FooterParams } from '@/components/panels/app-footer/app-footer';
import { Button, Divider, Space, Tabs, Upload } from 'antd';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, closestCenter, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { DownloadOutlined, PlusOutlined, TeamOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Hero, HeroOverview } from '@/models/hero';
import { ReactNode, useMemo, useState } from 'react';
import { useHeroes, useHiddenSourcebookIDs, useOptions } from '@/contexts/data-context';
import { AppHeader } from '@/components/panels/app-header/app-header';
import { ButtonGroup } from '@/components/controls/button-group/button-group';
import { Collections } from '@/utils/collections';
import { Empty } from '@/components/controls/empty/empty';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Expander } from '@/components/controls/expander/expander';
import { HeroLogic } from '@/logic/hero-logic';
import { HeroOrderLogic } from '@/logic/hero-order-logic';
import { HeroOverviewPanel } from '@/components/panels/hero-overview/hero-overview-panel';
import { PregenData } from '@/data/pregen-data';
import { PregenInfo } from '@/components/panels/token/token';
import { PregenLogic } from '@/logic/pregen-logic';
import { SearchBox } from '@/components/controls/text-input/text-input';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';
import { Sourcebook } from '@/models/sourcebook';
import { Utils } from '@/utils/utils';
import { useIsSmall } from '@/hooks/use-is-small';
import { useNavigation } from '@/hooks/use-navigation';
import { useParams } from 'react-router';
import { useTitle } from '@/hooks/use-title';

import './hero-list-page.scss';

interface Props {
	sourcebooks: Sourcebook[];
	params: FooterParams;
	addHero: (folder: string) => void;
	importHero: (hero: Hero, folder: string) => void;
	showParty: (folder: string) => void;
	onActiveChanged: (hero: Hero) => void;
	onOrderChanged: (heroes: Hero[]) => void;
}

export const HeroListPage = (props: Props) => {
	const isSmall = useIsSmall();
	const navigation = useNavigation();
	const { folder } = useParams<{ folder: string }>();
	const [ previousTab, setPreviousTab ] = useState<string | undefined>(folder);
	const [ currentTab, setCurrentTab ] = useState<string>(folder ?? '');
	const [ searchTerm, setSearchTerm ] = useState<string>('');
	useTitle('Heroes');
	const options = useOptions();
	const fullHeroes = useHeroes();
	const hiddenSourcebookIDs = useHiddenSourcebookIDs();
	// A dragged order shows immediately; the heroes only reflect it once their saves come back
	const [ pendingOrder, setPendingOrder ] = useState<Record<string, number>>({});
	const [ draggedHeroID, setDraggedHeroID ] = useState<string | null>(null);
	const sortedHeroes = useMemo(() => {
		return HeroOrderLogic.sort(fullHeroes, pendingOrder);
	}, [ fullHeroes, pendingOrder ]);
	const heroes = useMemo(() => {
		return sortedHeroes.map(HeroLogic.createOverview);
	}, [ sortedHeroes ]);
	const sensors = useSensors(
		// Only start a drag once the pointer has moved, so a click still opens the hero
		useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
		// Press and hold on touch screens, so a swipe still scrolls the page
		useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
	);

	if (folder !== previousTab) {
		setCurrentTab(folder ?? '');
		setPreviousTab(folder);
	}

	const pendingIDs = Object.keys(pendingOrder);
	if ((pendingIDs.length > 0) && pendingIDs.every(id => fullHeroes.find(h => h.id === id)?.sortOrder === pendingOrder[id])) {
		setPendingOrder({});
	}

	const onDragStart = (event: DragStartEvent) => {
		setDraggedHeroID(event.active.id as string);
	};

	const onDragEnd = (event: DragEndEvent) => {
		setDraggedHeroID(null);
		if (!event.over) {
			return;
		}

		const folderHeroes = sortedHeroes.filter(h => h.folder === currentTab);
		const moved = HeroOrderLogic.move(folderHeroes, event.active.id as string, event.over.id as string);

		// Number the whole folder, so heroes that never had a position get one,
		// but only save the heroes whose position actually changed
		const changed = moved
			.map((hero, index) => ({ hero, index }))
			.filter(({ hero, index }) => (pendingOrder[hero.id] ?? hero.sortOrder) !== index);
		if (changed.length === 0) {
			return;
		}

		const order = { ...pendingOrder };
		changed.forEach(({ hero, index }) => order[hero.id] = index);
		setPendingOrder(order);

		props.onOrderChanged(changed.map(({ hero, index }) => {
			const copy = Utils.copy(hero);
			copy.sortOrder = index;
			return copy;
		}));
	};

	const folders = Collections.distinct(heroes.map(h => h.folder).sort(), f => f);
	if (folders.length === 0) {
		folders.push('');
	}

	const getHeroes = (folder: string) => {
		return heroes
			.filter(h => h.folder === folder)
			.filter(h => Utils.textMatches([
				h.name,
				h.ancestry || '',
				h.background || '',
				h.class || '',
				h.complication || ''
			], searchTerm));
	};

	const getHeroesSection = (list: HeroOverview[]) => {
		if (list.length === 0) {
			return (
				<Empty />
			);
		}

		const getHeroPanel = (hero: HeroOverview) => {
			const fullHero = fullHeroes.find(h => h.id === hero.id);

			return (
				<SelectablePanel
					watermark={hero.picture || undefined}
					onSelect={() => navigation.goToHeroView(hero.id)}
				>
					<HeroOverviewPanel
						hero={hero}
						visibility={
							fullHero ?
								{
									visible: hero.isActive,
									onSetVisibility: visible => {
										const copy = Utils.copy(fullHero);
										copy.isActive = visible;
										props.onActiveChanged(copy);
									}
								}
								: undefined
						}
					/>
				</SelectablePanel>
			);
		};

		const draggedHero = list.find(h => h.id === draggedHeroID);

		return (
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={onDragStart}
				onDragCancel={() => setDraggedHeroID(null)}
				onDragEnd={onDragEnd}
			>
				<div className='hero-section-row'>
					{
						list.map(hero => (
							// Reordering a filtered list would be ambiguous, so it is only possible when not searching
							<DraggableHeroCard key={hero.id} id={hero.id} disabled={searchTerm !== ''}>
								{getHeroPanel(hero)}
							</DraggableHeroCard>
						))
					}
				</div>
				<DragOverlay>
					{draggedHero ? <div className='hero-card-overlay'>{getHeroPanel(draggedHero)}</div> : null}
				</DragOverlay>
			</DndContext>
		);
	};

	return (
		<ErrorBoundary>
			<div className='hero-list-page'>
				<AppHeader subheader='Heroes'>
					<ButtonGroup
						buttons={[
							{ type: 'control', control: <SearchBox searchTerm={searchTerm} setSearchTerm={setSearchTerm} /> },
							{
								type: 'dropdown',
								label: isSmall ? undefined : 'Add',
								icon: <PlusOutlined />,
								primary: true,
								popover: (
									<Space orientation='vertical' style={{ width: '300px' }}>
										<Button type='primary' block={true} icon={<PlusOutlined />} onClick={() => props.addHero(currentTab)}>
											Create a New Hero
										</Button>
										<Divider />
										<Upload
											style={{ width: '100%' }}
											accept='.drawsteel-hero,.ds-hero'
											showUploadList={false}
											beforeUpload={file => {
												file
													.text()
													.then(json => {
														const hero = JSON.parse(json) as Hero;
														props.importHero(hero, currentTab);
													});
												return false;
											}}
										>
											<Button block={true} icon={<DownloadOutlined />}>
												Import a Hero File
											</Button>
										</Upload>
										<Button block={true} icon={<ThunderboltOutlined />} onClick={() => props.importHero(HeroLogic.createRandomHero(props.sourcebooks.filter(sb => !hiddenSourcebookIDs.includes(sb.id))), currentTab)}>
											Generate a Random Hero
										</Button>
										<Expander title='Use a premade example'>
											<Space orientation='vertical' style={{ width: '100%', maxHeight: '220px', overflowY: 'auto' }}>
												{
													PregenData.getPregens().map(p => (
														<Button
															key={p.id}
															className='container-button'
															block={true}
															onClick={() => {
																const hero = PregenLogic.pregenToHero(p, props.sourcebooks, options);
																props.importHero(hero, currentTab);
															}}
														>
															<PregenInfo pregen={p} />
														</Button>
													))
												}
											</Space>
										</Expander>
									</Space>
								)
							},
							{
								type: 'button',
								label: isSmall ? undefined : 'Party',
								icon: <TeamOutlined />,
								disabled: getHeroes(currentTab).filter(h => h.isActive).length < 2,
								onClick: () => props.showParty(currentTab)
							}
						]}
					/>
				</AppHeader>
				<ErrorBoundary>
					<div className='hero-list-page-content'>
						<Tabs
							activeKey={currentTab}
							items={folders.map(f => ({
								key: f,
								label: (
									<div className='section-header'>
										<div className='section-title'>
											{f || 'Heroes'}
										</div>
										<div className='section-count'>
											{
												getHeroes(f).every(h => h.isActive) ?
													`${getHeroes(f).length}`
													:
													`${getHeroes(f).filter(h => h.isActive).length} of ${getHeroes(f).length}`
											}
										</div>
									</div>
								),
								children: getHeroesSection(getHeroes(f))
							}))}
							onChange={navigation.goToHeroList}
						/>
					</div>
				</ErrorBoundary>
				<AppFooter
					page='heroes'
					hero={null}
					params={props.params}
				/>
			</div>
		</ErrorBoundary>
	);
};

interface DraggableHeroCardProps {
	id: string;
	disabled: boolean;
	children: ReactNode;
}

// Each card is both something to drag and somewhere to drop: dropping a hero
// onto another card moves it into that card's place.
const DraggableHeroCard = (props: DraggableHeroCardProps) => {
	const draggable = useDraggable({ id: props.id, disabled: props.disabled });
	const droppable = useDroppable({ id: props.id, disabled: props.disabled });

	let className = 'hero-card';
	if (draggable.isDragging) {
		className += ' dragging';
	} else if (droppable.isOver) {
		className += ' drop-target';
	}

	return (
		<div
			ref={node => {
				draggable.setNodeRef(node);
				droppable.setNodeRef(node);
			}}
			className={className}
			{...draggable.listeners}
		>
			{props.children}
		</div>
	);
};

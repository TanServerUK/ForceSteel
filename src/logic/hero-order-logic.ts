import { Hero } from '@/models/hero';

export class HeroOrderLogic {
	/**
	 * Sorts heroes into the order the user arranged them in: by folder (in the
	 * same order as the hero list's folder tabs), then by sortOrder.
	 *
	 * Heroes with no sortOrder - ones created before ordering existed, or newly
	 * added - come after the rest of their folder, in the order they were stored.
	 *
	 * `overrides` holds sortOrder values that should take precedence over the
	 * heroes' own, for an order that has been changed but not yet saved.
	 */
	static sort = (heroes: Hero[], overrides: Record<string, number> = {}) => {
		const getOrder = (hero: Hero) => overrides[hero.id] ?? hero.sortOrder ?? Number.MAX_SAFE_INTEGER;

		return [ ...heroes ].sort((a, b) => {
			if (a.folder !== b.folder) {
				return a.folder < b.folder ? -1 : 1;
			}

			return getOrder(a) - getOrder(b);
		});
	};

	/**
	 * Moves one hero to the position currently held by another, shifting the
	 * heroes in between along by one.
	 */
	static move = (heroes: Hero[], movedID: string, targetID: string) => {
		const from = heroes.findIndex(h => h.id === movedID);
		const to = heroes.findIndex(h => h.id === targetID);
		if ((from === -1) || (to === -1) || (from === to)) {
			return heroes;
		}

		const list = [ ...heroes ];
		const [ moved ] = list.splice(from, 1);
		list.splice(to, 0, moved);

		return list;
	};
}

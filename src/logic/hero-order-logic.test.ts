import { describe, expect, test } from 'vitest';
import { Hero } from '@/models/hero';
import { HeroOrderLogic } from '@/logic/hero-order-logic';

const hero = (id: string, folder: string, sortOrder?: number) => ({ id, folder, sortOrder }) as Hero;

const ids = (heroes: Hero[]) => heroes.map(h => h.id);

describe('sort', () => {
	test('orders heroes by sortOrder', () => {
		const heroes = [ hero('a', '', 2), hero('b', '', 0), hero('c', '', 1) ];
		expect(ids(HeroOrderLogic.sort(heroes))).toEqual([ 'b', 'c', 'a' ]);
	});

	test('puts heroes without a sortOrder last, in stored order', () => {
		const heroes = [ hero('a', ''), hero('b', '', 0), hero('c', '') ];
		expect(ids(HeroOrderLogic.sort(heroes))).toEqual([ 'b', 'a', 'c' ]);
	});

	test('groups heroes by folder, in folder tab order', () => {
		const heroes = [ hero('a', 'Party B', 0), hero('b', '', 1), hero('c', 'Party A', 0), hero('d', '', 0) ];
		expect(ids(HeroOrderLogic.sort(heroes))).toEqual([ 'd', 'b', 'c', 'a' ]);
	});

	test('lets overrides take precedence over saved values', () => {
		const heroes = [ hero('a', '', 0), hero('b', '', 1) ];
		expect(ids(HeroOrderLogic.sort(heroes, { a: 1, b: 0 }))).toEqual([ 'b', 'a' ]);
	});

	test('does not modify the list it is given', () => {
		const heroes = [ hero('a', '', 1), hero('b', '', 0) ];
		HeroOrderLogic.sort(heroes);
		expect(ids(heroes)).toEqual([ 'a', 'b' ]);
	});
});

describe('move', () => {
	const heroes = [ hero('a', ''), hero('b', ''), hero('c', ''), hero('d', '') ];

	test('moves a hero forwards', () => {
		expect(ids(HeroOrderLogic.move(heroes, 'a', 'c'))).toEqual([ 'b', 'c', 'a', 'd' ]);
	});

	test('moves a hero backwards', () => {
		expect(ids(HeroOrderLogic.move(heroes, 'd', 'b'))).toEqual([ 'a', 'd', 'b', 'c' ]);
	});

	test('leaves the list alone for an unknown or identical target', () => {
		expect(ids(HeroOrderLogic.move(heroes, 'a', 'a'))).toEqual([ 'a', 'b', 'c', 'd' ]);
		expect(ids(HeroOrderLogic.move(heroes, 'a', 'z'))).toEqual([ 'a', 'b', 'c', 'd' ]);
	});
});

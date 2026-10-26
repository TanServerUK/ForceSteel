import { describe, expect, it, vi } from 'vitest';
import { FactoryLogic } from '@/logic/factory-logic';
import { SourcebookData } from '@/data/sourcebook-data';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { SourcebookType } from '@/enums/sourcebook-type';
import { core } from '@/data/sourcebooks/official/core';
import { starWars } from '@/data/sourcebooks/featured/star-wars';

describe('Star Wars featured sourcebook', () => {
	it('loads from the shipped .ds-sourcebook file as a Featured sourcebook', () => {
		expect(starWars.type).toBe(SourcebookType.Featured);
		expect(starWars.name).toMatch(/^Ken's Star Wars Conversion/);
		expect(starWars.classes.length).toBeGreaterThan(0);
		expect(starWars.ancestries.length).toBeGreaterThan(0);
		expect(SourcebookLogic.getElements(starWars).length).toBeGreaterThan(0);
	});

	it('is one of the built-in sourcebooks', async () => {
		// loadAll checks feature flags, which live in local storage
		vi.stubGlobal('localStorage', { getItem: () => null });
		const builtIn = await SourcebookData.loadAll();
		vi.unstubAllGlobals();
		const featured = builtIn.filter(sb => sb.type === SourcebookType.Featured);
		expect(featured.map(sb => sb.id)).toEqual([ starWars.id ]);
	});
});

describe('getDefaultHeroSourcebookIDs', () => {
	it('uses only the featured sourcebooks when there are any', () => {
		const homebrew = FactoryLogic.createSourcebook();
		expect(SourcebookLogic.getDefaultHeroSourcebookIDs([ core, starWars, homebrew ])).toEqual([ starWars.id ]);
	});

	it('falls back to the official sourcebooks when there are no featured ones', () => {
		const homebrew = FactoryLogic.createSourcebook();
		expect(SourcebookLogic.getDefaultHeroSourcebookIDs([ core, homebrew ])).toEqual([ core.id ]);
	});
});

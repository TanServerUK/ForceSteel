import { Sourcebook } from '@/models/sourcebook';
import { SourcebookType } from '@/enums/sourcebook-type';
import { UpdateLogic } from '@/logic/update/update-logic';
import raw from '../../../../sourcebooks/Ken\'s Star Wars Conversion.ds-sourcebook?raw';

// Ken's Star Wars conversion, shipped with the app as its featured sourcebook.
// The data is the exported .ds-sourcebook file in /sourcebooks: to update it, replace that file and rebuild.
// It is run through the same update step as an imported homebrew sourcebook, then marked as Featured.
const load = (): Sourcebook => {
	const sourcebook = JSON.parse(raw) as Sourcebook;
	UpdateLogic.updateSourcebook(sourcebook);
	sourcebook.type = SourcebookType.Featured;
	return sourcebook;
};

export const starWars: Sourcebook = load();

import { useEffect } from 'react';

export const useTitle = (title: string) => {
	useEffect(() => {
		const originalTitle = document?.title || 'Force Steel';

		if (document && (document.title !== title)) {
			document.title = `Force Steel - ${title}`;
		}

		return () => {
			document.title = originalTitle || 'Force Steel';
		};
	}, [ title ]);
};

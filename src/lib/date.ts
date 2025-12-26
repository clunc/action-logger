const DEFAULT_DEV_DATE = '2025-12-25';

const readMockToday = () => {
	if (typeof import.meta !== 'undefined') {
		const metaEnv = (import.meta as any).env;
		const mock = metaEnv?.VITE_MOCK_TODAY ?? metaEnv?.MOCK_TODAY ?? metaEnv?.DEV_STATIC_TODAY;
		if (mock) return mock as string;
	}

	if (typeof process !== 'undefined') {
		const mock = process.env.VITE_MOCK_TODAY ?? process.env.MOCK_TODAY ?? process.env.DEV_STATIC_TODAY;
		if (mock) return mock;
	}

	return null;
};

const isDevEnv = (() => {
	if (typeof import.meta !== 'undefined') {
		const metaEnv = (import.meta as any).env;
		const val = metaEnv?.APP_ENV ?? metaEnv?.MODE;
		if (val === 'dev' || val === 'development') return true;
	}

	if (typeof process !== 'undefined') {
		const val = process.env.APP_ENV ?? process.env.NODE_ENV;
		if (val === 'dev' || val === 'development') return true;
	}

	return false;
})();

const mockTodayString = (() => {
	const explicit = readMockToday();
	if (explicit) return explicit;
	if (isDevEnv) return DEFAULT_DEV_DATE;
	return null;
})();

export const now = () => {
	if (mockTodayString) {
		const base = new Date(`${mockTodayString}T00:00:00Z`);
		if (!Number.isNaN(base.getTime())) {
			const realNow = new Date();
			base.setHours(realNow.getHours(), realNow.getMinutes(), realNow.getSeconds(), realNow.getMilliseconds());
			return base;
		}
	}
	return new Date();
};

export const toDateString = (date: Date) => {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
};

export const todayIsoString = () => toDateString(now());
export const todayDisplayString = () => now().toDateString();

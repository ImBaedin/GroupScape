import { useCallback, useEffect, useState } from "react";

type UseDebouncedSearchFieldOptions = {
	delayMs?: number;
	initialValue?: string;
};

export function useDebouncedSearchField(
	options: UseDebouncedSearchFieldOptions = {},
) {
	const { delayMs = 250, initialValue = "" } = options;
	const [value, setValue] = useState(initialValue);
	const [debouncedValue, setDebouncedValue] = useState(initialValue);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			setDebouncedValue(value);
		}, delayMs);
		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [value, delayMs]);

	const setImmediateValue = useCallback((nextValue: string) => {
		setValue(nextValue);
		setDebouncedValue(nextValue);
	}, []);

	return {
		value,
		setValue,
		debouncedValue,
		isDebouncing: value !== debouncedValue,
		setImmediateValue,
	};
}

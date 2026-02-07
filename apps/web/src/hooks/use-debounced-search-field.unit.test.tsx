import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDebouncedSearchField } from "./use-debounced-search-field";

describe("useDebouncedSearchField", () => {
	it("debounces value updates using delayMs", () => {
		vi.useFakeTimers();
		const { result } = renderHook(() =>
			useDebouncedSearchField({ initialValue: "old", delayMs: 200 }),
		);

		act(() => {
			result.current.setValue("new");
		});
		expect(result.current.value).toBe("new");
		expect(result.current.debouncedValue).toBe("old");
		expect(result.current.isDebouncing).toBe(true);

		act(() => {
			vi.advanceTimersByTime(199);
		});
		expect(result.current.debouncedValue).toBe("old");

		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(result.current.debouncedValue).toBe("new");
		expect(result.current.isDebouncing).toBe(false);
		vi.useRealTimers();
	});

	it("setImmediateValue synchronizes value and debouncedValue", () => {
		const { result } = renderHook(() => useDebouncedSearchField());

		act(() => {
			result.current.setImmediateValue("instant");
		});

		expect(result.current.value).toBe("instant");
		expect(result.current.debouncedValue).toBe("instant");
		expect(result.current.isDebouncing).toBe(false);
	});
});

import type {
	DataModel,
	Id,
} from "@GroupScape/backend/convex/_generated/dataModel";
import { renderHook } from "@testing-library/react";
import type { TableNamesInDataModel } from "convex/server";
import { describe, expect, it } from "vitest";
import { usePartyFormatting } from "./usePartyFormatting";

const asId = <T extends TableNamesInDataModel<DataModel>>(value: string) =>
	value as Id<T>;

describe("usePartyFormatting", () => {
	it("formats member labels with self/leader suffixes and account fallback", () => {
		const ownerId = asId<"users">("owner");
		const selfId = asId<"users">("self");
		const knownAccountId = asId<"playerAccounts">("account-0001");
		const unknownAccountId = asId<"playerAccounts">("account-9999");
		const { result } = renderHook(() =>
			usePartyFormatting({
				accountMap: new Map([[knownAccountId, "Known Name"]]),
				appUserId: selfId,
				partyOwnerId: ownerId,
			}),
		);

		expect(
			result.current.formatMemberName(selfId, knownAccountId, "Preferred"),
		).toBe("Preferred (You)");
		expect(result.current.formatMemberName(ownerId, knownAccountId)).toBe(
			"Known Name (Leader)",
		);
		expect(
			result.current.formatMemberName(ownerId, knownAccountId, "Leader Preferred"),
		).toBe("Leader Preferred (Leader)");
		expect(result.current.formatMemberName(selfId, unknownAccountId)).toBe(
			"Account #9999 (You)",
		);
	});

	it("builds account initials for empty, single-word, and multi-word labels", () => {
		const { result } = renderHook(() =>
			usePartyFormatting({
				accountMap: new Map(),
			}),
		);

		expect(result.current.getAccountInitials("")).toBe("GS");
		expect(result.current.getAccountInitials("Zephyr")).toBe("ZE");
		expect(result.current.getAccountInitials("Lunar Knight")).toBe("LK");
	});
});

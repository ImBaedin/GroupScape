import { contentScema, filtersUnionSchema } from "./index";
import { describe, expect, it } from "vitest";

describe("osrs-content schemas", () => {
	it("accepts supported filter variants and rejects invalid bounds", () => {
		expect(
			filtersUnionSchema.safeParse({
				label: "Kill Count",
				type: "killCount",
				value: 10,
			}).success,
		).toBe(true);

		expect(
			filtersUnionSchema.safeParse({
				label: "Total Level",
				type: "totalLevel",
				value: 2_376,
			}).success,
		).toBe(true);

		expect(
			filtersUnionSchema.safeParse({
				label: "Combat Level",
				type: "combatLevel",
				value: 126,
			}).success,
		).toBe(true);

		expect(
			filtersUnionSchema.safeParse({
				label: "Specific Skill Level",
				type: "specificLevel",
				skill: "sailing",
				value: 99,
			}).success,
		).toBe(true);

		expect(
			filtersUnionSchema.safeParse({
				label: "Total Level",
				type: "totalLevel",
				value: 2_377,
			}).success,
		).toBe(false);
		expect(
			filtersUnionSchema.safeParse({
				label: "Specific Skill Level",
				type: "specificLevel",
				skill: "attack",
				value: 0,
			}).success,
		).toBe(false);
	});

	it("accepts supported content variants and rejects unsupported names", () => {
		expect(
			contentScema.safeParse({
				contentName: "Royal Titans",
				contentDescription: "Branda and Eldric, fire and ice",
				partySizeLimit: 2,
				minPartySize: 2,
				maxPartySize: 2,
				filters: [],
			}).success,
		).toBe(true);

		expect(
			contentScema.safeParse({
				contentName: "Barbarian Assault",
				contentDescription: "RuneScape's most iconic raid",
				partySizeLimit: 5,
				minPartySize: 5,
				maxPartySize: 5,
				filters: [],
			}).success,
		).toBe(true);

		expect(
			contentScema.safeParse({
				contentName: "Theatre of Blood",
				contentDescription: "Verzik Vitur and her band of bloody besties",
				partySizeLimit: 4,
				minPartySize: 2,
				maxPartySize: 5,
				filters: [],
			}).success,
		).toBe(true);

		expect(
			contentScema.safeParse({
				contentName: "Tombs of Amascut",
				contentDescription: "Not yet modeled",
				partySizeLimit: 4,
				minPartySize: 1,
				maxPartySize: 8,
				filters: [],
			}).success,
		).toBe(false);
	});
});

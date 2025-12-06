/**
 * PartyData processing pipeline with extensible type registry.
 * Uses Zod schemas for validation and transformation of JSON data.
 */

import { z } from "zod";
import { parsePartyBatchedChange } from "./party-parser.js";

/**
 * Handler for a specific PartyData type
 */
export interface PartyDataTypeHandler<T = unknown> {
	/**
	 * Zod schema to validate the JSON data
	 */
	schema: z.ZodSchema<T>;
	/**
	 * Transform function to convert validated data to the desired output format
	 */
	transform: (data: T) => unknown;
}

/**
 * Registry of PartyData type handlers
 */
const typeHandlers = new Map<string, PartyDataTypeHandler<unknown>>();

/**
 * Register a new PartyData type handler
 * @param type - The type string (e.g., "PartyBatchedChange")
 * @param handler - The handler with schema and transform function
 */
export function registerPartyDataType<T>(
	type: string,
	handler: PartyDataTypeHandler<T>,
): void {
	if (typeHandlers.has(type)) {
		console.warn(
			`PartyData type "${type}" is already registered. Overwriting.`,
		);
	}
	// Safe to cast: the schema validates the data to type T before transform is called
	typeHandlers.set(type, handler as PartyDataTypeHandler<unknown>);
}

/**
 * Process PartyData JSON through the pipeline
 * @param type - The type string from the PartyData message
 * @param jsonData - The JSON object to validate and transform
 * @returns Success result with transformed data, or error result
 */
export function processPartyData(
	type: string,
	jsonData: unknown,
): { success: true; data: unknown } | { success: false; error: Error } {
	const handler = typeHandlers.get(type);

	if (!handler) {
		return {
			success: false,
			error: new Error(`No handler registered for PartyData type: ${type}`),
		};
	}

	try {
		// Validate the JSON data against the schema
		const validated = handler.schema.parse(jsonData);

		// Transform the validated data
		const transformed = handler.transform(validated);

		return {
			success: true,
			data: transformed,
		};
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				success: false,
				error: new Error(
					`Validation failed for PartyData type "${type}": ${error.message}`,
				),
			};
		}
		return {
			success: false,
			error:
				error instanceof Error
					? error
					: new Error(`Failed to process PartyData type "${type}"`),
		};
	}
}

/**
 * Check if a type is registered
 */
export function isTypeRegistered(type: string): boolean {
	return typeHandlers.has(type);
}

const partyBatchedChangeMiscEntryTypeSchema = z.enum([
	"S", // special
	"R", // run energy
	"C", // combat level
	"T", // total level
	"ST", // stamina duration
	"P", // poison
	"D", // disease
	"W", // world
	"U", // username
]);

// Register PartyBatchedChange type on module load
const partyBatchedChangeMiscEntrySchema = z.object({
	t: partyBatchedChangeMiscEntryTypeSchema,
	v: z.unknown().optional(), // value as int
	s: z.unknown().optional(), // value as string
});

const partyBatchedChangeSkillSchema = z
	.object({
		s: z.number(), // skill ordinal
		l: z.number(), // level
		b: z.number(), // boosted level
	})
	.required();

const partyBatchedChangeSchema = z.object({
	type: z.string().optional(),
	i: z.array(z.number()).optional(), // inventory
	e: z.array(z.number()).optional(), // equipment
	s: z.array(partyBatchedChangeSkillSchema).optional(), // stat changes
	m: z.array(partyBatchedChangeMiscEntrySchema).optional(), // misc changes
	ap: z.unknown().optional(), // Available Prayers, bit-packed & contains all available prayers on every change
	ep: z.unknown().optional(), // Enabled Prayers, bit-packed & contains all enabled prayers on every change
	up: z.unknown().optional(), // Unlocked Prayers, bit-packed & contains all unlocked prayers on every change. Only for deadeye/vigour currently
	rp: z.array(z.number()).optional(), // rune pouch itemId and quantity
	q: z.array(z.number()).optional(), // quiver itemId and quantity
});

registerPartyDataType("PartyBatchedChange", {
	schema: partyBatchedChangeSchema,
	transform: (data) =>
		parsePartyBatchedChange(
			data as Parameters<typeof parsePartyBatchedChange>[0],
		),
});

// Register StatusUpdate type on module load
const statusUpdateSchema = z.object({
	type: z.string().optional(),
	n: z.string().optional(), // player name
	hc: z.number().optional(), // health current
	hm: z.number().optional(), // health max
	pc: z.number().optional(), // prayer current
	pm: z.number().optional(), // prayer max
	r: z.number().optional(), // run energy
	s: z.number().optional(), // spec energy
	v: z.boolean().optional(), // vengeance active
	c: z.string().optional(), // member color
});

/**
 * Parse hex color string with alpha as first component
 * Format: "#AARRGGBB" where AA is alpha/opacity
 */
function parseMemberColor(hexColor: string | undefined):
	| {
			r: number;
			g: number;
			b: number;
			a: number;
	  }
	| undefined {
	if (!hexColor || !hexColor.startsWith("#")) {
		return undefined;
	}

	// Remove the # and parse
	const hex = hexColor.slice(1);
	if (hex.length < 8) {
		return undefined;
	}

	// Parse as AARRGGBB format
	const a = Number.parseInt(hex.slice(0, 2), 16);
	const r = Number.parseInt(hex.slice(2, 4), 16);
	const g = Number.parseInt(hex.slice(4, 6), 16);
	const b = Number.parseInt(hex.slice(6, 8), 16);

	return { r, g, b, a };
}

registerPartyDataType("StatusUpdate", {
	schema: statusUpdateSchema,
	transform: (data) => ({
		type: data.type,
		name: data.n,
		health: {
			current: data.hc,
			max: data.hm,
		},
		prayer: {
			current: data.pc,
			max: data.pm,
		},
		runEnergy: data.r,
		specEnergy: data.s,
		vengeanceActive: data.v,
		memberColor: parseMemberColor(data.c),
	}),
});

// Register LocationUpdate type on module load
const locationUpdateSchema = z.object({
	type: z.string().optional(),
	c: z.number(), // encoded coordinate
});

registerPartyDataType("LocationUpdate", {
	schema: locationUpdateSchema,
	transform: (data) => {
		const c = data.c;
		const x = (c >> 14) & 0x3fff;
		const y = c & 0x3fff;
		const plane = (c >> 28) & 3;
		return {
			type: data.type,
			coordinate: {
				encoded: c,
				x,
				y,
				plane,
			},
		};
	},
});

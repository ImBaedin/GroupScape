import { generateMemberId, generateSessionId, passphraseToId } from "./utils";
import { describe, expect, it, vi } from "vitest";

describe("utils", () => {
	it("passphraseToId is deterministic for the same passphrase", async () => {
		const a = await passphraseToId("same passphrase");
		const b = await passphraseToId("same passphrase");
		const c = await passphraseToId("different passphrase");

		expect(a).toBe(b);
		expect(a).not.toBe(c);
		expect(a >= 0n).toBe(true);
	});

	it("generateSessionId returns a UUID v4 string", () => {
		const sessionId = generateSessionId();
		expect(sessionId).toMatch(
			/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i,
		);
	});

	it("generateMemberId masks values into a positive signed-64-bit range", () => {
		const randomSpy = vi
			.spyOn(globalThis.crypto, "getRandomValues")
			.mockImplementation((array) => {
				const target = array as Uint8Array;
				target.fill(0xff);
				return target as typeof array;
			});

		const generated = generateMemberId();
		const LONG_MAX_VALUE = 0x7fffffffffffffffn;
		expect(generated).toBe(LONG_MAX_VALUE);

		randomSpy.mockRestore();
	});
});

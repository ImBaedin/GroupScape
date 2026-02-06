import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { VERIFICATION_WINDOW_MS } from "../lib/profile-view";
import type { VerificationChallenge, VerificationResult } from "../types";

export function ProfileVerificationWindowState({
	challenge,
	result,
	children,
}: {
	challenge?: VerificationChallenge;
	result?: VerificationResult;
	children: (state: { remainingMs?: number; isExpired: boolean }) => ReactNode;
}) {
	const shouldTick =
		Boolean(challenge) &&
		result?.status !== "verified" &&
		result?.status !== "expired" &&
		result?.remainingMs === undefined;
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(() => {
		if (!shouldTick) return;
		setNowMs(Date.now());
		const intervalId = window.setInterval(() => {
			setNowMs(Date.now());
		}, 1000);
		return () => {
			window.clearInterval(intervalId);
		};
	}, [shouldTick]);

	const challengeAgeMs = challenge
		? Math.max(0, nowMs - challenge.issuedAt)
		: undefined;
	const computedRemainingMs = challenge
		? Math.max(0, VERIFICATION_WINDOW_MS - (challengeAgeMs ?? 0))
		: undefined;
	const remainingMs = result?.remainingMs ?? computedRemainingMs;
	const isExpired = Boolean(
		result?.status === "expired" || (challenge && remainingMs === 0),
	);

	return <>{children({ remainingMs, isExpired })}</>;
}

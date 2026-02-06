import { createContext, type ReactNode, useContext } from "react";
import type { PartyDerivedState } from "./hooks/usePartyDerivedState";
import type { PartyFormatting } from "./hooks/usePartyFormatting";
import type { AppUser, PartyDoc, PartyLock, PlayerAccount } from "./types";

type PartyDetailContextValue = {
	party: PartyDoc;
	appUser: AppUser | undefined;
	partyLock: PartyLock | undefined;
	accountList: PlayerAccount[];
	derived: PartyDerivedState;
	formatting: PartyFormatting;
	isAuthenticated: boolean;
};

const PartyDetailContext = createContext<PartyDetailContextValue | null>(null);

export function PartyDetailProvider({
	value,
	children,
}: {
	value: PartyDetailContextValue;
	children: ReactNode;
}) {
	return (
		<PartyDetailContext.Provider value={value}>
			{children}
		</PartyDetailContext.Provider>
	);
}

export function usePartyDetailContext() {
	const context = useContext(PartyDetailContext);
	if (!context) {
		throw new Error("usePartyDetailContext must be used inside PartyDetailProvider");
	}
	return context;
}

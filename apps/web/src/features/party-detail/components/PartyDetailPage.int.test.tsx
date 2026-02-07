import { api } from "@GroupScape/backend/convex/_generated/api";
import type {
	DataModel,
	Id,
} from "@GroupScape/backend/convex/_generated/dataModel";
import { render, screen } from "@testing-library/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { getFunctionName, type TableNamesInDataModel } from "convex/server";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartyDetailPage } from "./PartyDetailPage";

vi.mock("convex/react", () => ({
	useConvexAuth: vi.fn(),
	useMutation: vi.fn(),
	useQuery: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		...rest
	}: { children?: any; to?: unknown }) => (
		<a href={typeof to === "string" ? to : "#"} {...rest}>
			{children}
		</a>
	),
	useNavigate: () => vi.fn(),
}));

const asId = <T extends TableNamesInDataModel<DataModel>>(value: string) =>
	value as Id<T>;

describe("PartyDetailPage integration", () => {
	const mockedUseConvexAuth = vi.mocked(useConvexAuth);
	const mockedUseMutation = vi.mocked(useMutation);
	const mockedUseQuery = vi.mocked(useQuery);
	const mockedToast = vi.mocked(toast);

		beforeEach(() => {
			vi.clearAllMocks();
			mockedUseMutation.mockImplementation(
				() =>
					vi.fn().mockResolvedValue(
						undefined,
					) as unknown as ReturnType<typeof useMutation>,
			);
			mockedUseQuery.mockImplementation((..._args: any[]) => undefined);
		});

	it("renders sign-in CTA when unauthenticated", () => {
		mockedUseConvexAuth.mockReturnValue({
			isAuthenticated: false,
			isLoading: false,
		} as ReturnType<typeof useConvexAuth>);

		render(<PartyDetailPage partyId={asId<"parties">("party-auth")} />);

		expect(screen.getByText("Sign in to view parties")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Sign In" })).toBeInTheDocument();
	});

	it("renders loading state while auth is resolving", () => {
		const partyId = asId<"parties">("party-loading");

		mockedUseConvexAuth.mockReturnValue({
			isAuthenticated: true,
			isLoading: true,
		} as ReturnType<typeof useConvexAuth>);
		render(<PartyDetailPage partyId={partyId} />);
		expect(screen.getByText("Loading party...")).toBeInTheDocument();
	});

	it("renders null-party fallback card when party query returns null", () => {
		const partyId = asId<"parties">("party-null");

		mockedUseConvexAuth.mockReturnValue({
			isAuthenticated: true,
			isLoading: false,
		} as ReturnType<typeof useConvexAuth>);
		mockedUseQuery.mockImplementation((...input: any[]) => {
			const [reference, args] = input;
			if (args === "skip") return undefined;
			const functionName = getFunctionName(reference as Parameters<
				typeof getFunctionName
			>[0]);
			if (functionName === "users:getCurrent") {
				return {
					_id: asId<"users">("user-1"),
					_creationTime: 1,
					tokenIdentifier: "token|user-1",
					playerAccounts: [],
					activePlayerAccountId: null,
				};
			}
			if (functionName === "parties:getActiveForUser") return null;
			if (functionName === "playerAccounts:list") return [];
			if (functionName === "parties:get") return null;
			return undefined;
		});

		render(<PartyDetailPage partyId={partyId} />);
		expect(screen.getByText("Party not found")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Back to parties" }),
		).toBeInTheDocument();
	});

	it("renders loaded roster sections with derived member data", () => {
		const partyId = asId<"parties">("party-loaded");
		const ownerId = asId<"users">("owner-1");
		const acceptedAccountId = asId<"playerAccounts">("account-accepted");
		const pendingAccountId = asId<"playerAccounts">("account-pending");

		mockedUseConvexAuth.mockReturnValue({
			isAuthenticated: true,
			isLoading: false,
		} as ReturnType<typeof useConvexAuth>);
		mockedUseQuery.mockImplementation((...input: any[]) => {
			const [reference, args] = input;
			if (args === "skip") return undefined;
			const functionName = getFunctionName(reference as Parameters<
				typeof getFunctionName
			>[0]);
			if (functionName === "users:getCurrent") {
				return {
					_id: ownerId,
					_creationTime: 1,
					tokenIdentifier: "token|owner",
					playerAccounts: [acceptedAccountId],
					activePlayerAccountId: acceptedAccountId,
				};
			}
			if (functionName === "parties:getActiveForUser") return null;
			if (functionName === "playerAccounts:list") {
				return [
					{
						_id: acceptedAccountId,
						_creationTime: 1,
						userId: ownerId,
						username: "Owner Main",
						verificationStatus: "verified",
					},
				];
			}
			if (functionName === "parties:get") {
				return {
					_id: partyId,
					_creationTime: 100,
					ownerId,
					name: "Loaded Party",
					description: "Loaded description",
					partySizeLimit: 4,
					status: "open",
					createdAt: 100,
					updatedAt: 200,
					members: [
						{
							memberId: ownerId,
							playerAccountId: acceptedAccountId,
							status: "accepted",
							role: "leader",
						},
						{
							memberId: asId<"users">("member-accepted"),
							playerAccountId: acceptedAccountId,
							status: "accepted",
							role: "member",
						},
						{
							memberId: asId<"users">("member-pending"),
							playerAccountId: pendingAccountId,
							status: "pending",
							role: "member",
						},
					],
				};
			}
			if (functionName === "playerAccounts:getMemberProfiles") {
				return [
					{
						accountId: acceptedAccountId,
						username: "Accepted Profile",
						verificationStatus: "verified",
						headshotUrl: undefined,
						summary: undefined,
						lastUpdated: undefined,
						isStale: true,
					},
					{
						accountId: pendingAccountId,
						username: "Pending Profile",
						verificationStatus: "pending",
						headshotUrl: undefined,
						summary: undefined,
						lastUpdated: undefined,
						isStale: true,
					},
				];
			}
			return undefined;
		});

		render(<PartyDetailPage partyId={partyId} />);

		expect(screen.getByText("Loaded Party")).toBeInTheDocument();
		expect(screen.getByText("Roster")).toBeInTheDocument();
		expect(screen.getByText("Accepted Profile (You, Leader)")).toBeInTheDocument();
		expect(screen.getAllByText("Pending Profile")).toHaveLength(2);
		expect(screen.getByText("Request awaiting approval")).toBeInTheDocument();
		expect(mockedToast.error).not.toHaveBeenCalled();
	});
});

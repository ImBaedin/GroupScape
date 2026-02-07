import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreatePartyForm from "./create-party-form";

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

describe("CreatePartyForm integration", () => {
	const mockedUseConvexAuth = vi.mocked(useConvexAuth);
	const mockedUseMutation = vi.mocked(useMutation);
	const mockedUseQuery = vi.mocked(useQuery);
	const mockedToast = vi.mocked(toast);

		beforeEach(() => {
			vi.clearAllMocks();
			mockedUseConvexAuth.mockReturnValue({
				isAuthenticated: true,
				isLoading: false,
			} as ReturnType<typeof useConvexAuth>);
			mockedUseQuery.mockReturnValue(null as unknown as ReturnType<typeof useQuery>);
		});

		it("disables submit while party lock exists", () => {
			mockedUseMutation.mockReturnValue(
				vi.fn() as unknown as ReturnType<typeof useMutation>,
			);
			mockedUseQuery.mockReturnValue({
				_id: "party-1",
				name: "Existing Party",
				membershipStatus: "accepted",
			} as ReturnType<typeof useQuery>);

		render(<CreatePartyForm />);

		expect(
			screen.getByRole("button", { name: "Create Party" }),
		).toBeDisabled();
		expect(
			screen.getByText(
				'You are already in "Existing Party". Leave or resolve that party before creating a new one.',
			),
		).toBeInTheDocument();
	});

		it("submits a trimmed payload when form is valid", async () => {
			const createParty = vi.fn().mockResolvedValue(undefined);
			mockedUseMutation.mockReturnValue(
				createParty as unknown as ReturnType<typeof useMutation>,
			);
		render(<CreatePartyForm />);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Party Name"), "  Raid Run  ");
		await user.type(
			screen.getByLabelText("Description (Optional)"),
			"  casual nightly runs  ",
		);
		await user.click(screen.getByRole("button", { name: "Create Party" }));

		await waitFor(() => {
			expect(createParty).toHaveBeenCalledWith({
				name: "Raid Run",
				description: "casual nightly runs",
				partySizeLimit: 5,
			});
		});
		expect(mockedToast.success).toHaveBeenCalledWith("Party created");
	});

		it("shows submit error when mutation fails", async () => {
			const createParty = vi.fn().mockRejectedValue(new Error("Create failed"));
			mockedUseMutation.mockReturnValue(
				createParty as unknown as ReturnType<typeof useMutation>,
			);
		render(<CreatePartyForm />);
		const user = userEvent.setup();

		await user.type(screen.getByLabelText("Party Name"), "Fail Party");
		await user.click(screen.getByRole("button", { name: "Create Party" }));

		await waitFor(() => {
			expect(mockedToast.error).toHaveBeenCalledWith("Create failed");
		});
		expect(screen.getByText("Create failed")).toBeInTheDocument();
	});
});

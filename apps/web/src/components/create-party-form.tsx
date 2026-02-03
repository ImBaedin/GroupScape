import { api } from "@GroupScape/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PARTY_NAME_MAX = 80;
const DESCRIPTION_MAX = 280;
const PARTY_SIZE_MIN = 2;
const PARTY_SIZE_MAX = 254;
const DEFAULT_PARTY_SIZE = 5;

export default function CreatePartyForm() {
	const [partySizeLimit, setPartySizeLimit] = useState<number>(
		DEFAULT_PARTY_SIZE,
	);
	const [partyName, setPartyName] = useState("");
	const [description, setDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const createParty = useMutation(api.parties.create);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedName = partyName.trim();
		if (!trimmedName) return;

		setIsSubmitting(true);
		setSubmitError(null);
		try {
			await createParty({
				name: trimmedName,
				description: description.trim() || undefined,
				partySizeLimit,
			});
			// Reset form
			setPartyName("");
			setDescription("");
			setPartySizeLimit(DEFAULT_PARTY_SIZE);
			toast.success("Party created");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to create party";
			setSubmitError(message);
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const isNameValid = partyName.trim().length > 0;
	const isSizeValid =
		partySizeLimit >= PARTY_SIZE_MIN && partySizeLimit <= PARTY_SIZE_MAX;

	return (
		<Card className="w-full max-w-2xl">
			<CardHeader>
				<CardTitle>Create a Party</CardTitle>
				<CardDescription>Kick off a new group with a clear goal.</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="partyName">Party Name</Label>
						<Input
							id="partyName"
							value={partyName}
							onChange={(e) => {
								setPartyName(e.target.value);
								if (submitError) setSubmitError(null);
							}}
							maxLength={PARTY_NAME_MAX}
							placeholder="Enter a short, clear title"
							required
						/>
						<p className="text-muted-foreground text-xs">
							{partyName.trim().length}/{PARTY_NAME_MAX}
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description (Optional)</Label>
						<Textarea
							id="description"
							value={description}
							onChange={(e) => {
								setDescription(e.target.value);
								if (submitError) setSubmitError(null);
							}}
							maxLength={DESCRIPTION_MAX}
							placeholder="Share expectations, schedule, or goals"
						/>
						<p className="text-muted-foreground text-xs">
							{description.trim().length}/{DESCRIPTION_MAX}
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="partySizeLimit">Party Size Limit</Label>
						<Input
							id="partySizeLimit"
							type="number"
							min={PARTY_SIZE_MIN}
							max={PARTY_SIZE_MAX}
							value={partySizeLimit}
							onChange={(e) => {
								const value = Number.parseInt(e.target.value, 10);
								if (Number.isNaN(value)) return;
								if (submitError) setSubmitError(null);
								setPartySizeLimit(
									Math.max(PARTY_SIZE_MIN, Math.min(PARTY_SIZE_MAX, value)),
								);
							}}
							required
						/>
						<p className="text-muted-foreground text-xs">
							Set a cap between {PARTY_SIZE_MIN} and {PARTY_SIZE_MAX} players,
							including the leader.
						</p>
					</div>

					<Button
						type="submit"
						disabled={!isNameValid || !isSizeValid || isSubmitting}
						className="w-full"
					>
						{isSubmitting ? "Creating..." : "Create Party"}
					</Button>
					{submitError && (
						<p className="text-sm text-destructive">{submitError}</p>
					)}
				</form>
			</CardContent>
		</Card>
	);
}

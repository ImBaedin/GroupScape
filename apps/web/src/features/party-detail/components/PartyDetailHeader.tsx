import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	Check,
	CircleDot,
	Crown,
	Loader2,
	PencilLine,
	Users,
	X,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { usePartyDetailContext } from "../context";
import { usePartyDetailsEditor } from "../hooks/usePartyDetailsEditor";

export function PartyDetailHeader() {
	const {
		party,
		derived: { isOwner, acceptedCount, pendingCount },
		formatting: { numberFormatter },
	} = usePartyDetailContext();

	const { saveDetails } = usePartyDetailsEditor({ partyId: party._id });
	const [draftName, setDraftName] = useState("");
	const [draftDescription, setDraftDescription] = useState("");
	const [isSavingDetails, setIsSavingDetails] = useState(false);
	const [detailsError, setDetailsError] = useState<string | null>(null);
	const [editingField, setEditingField] = useState<
		"name" | "description" | null
	>(null);

	const startEditing = (field: "name" | "description") => {
		if (!isOwner) return;
		setDraftName(party.name);
		setDraftDescription(party.description ?? "");
		setDetailsError(null);
		setEditingField(field);
	};

	const handleResetDetails = () => {
		setDraftName(party.name);
		setDraftDescription(party.description ?? "");
		setDetailsError(null);
		setEditingField(null);
	};

	const handleSaveDetails = async (event?: FormEvent) => {
		event?.preventDefault();
		if (isSavingDetails) return;
		setIsSavingDetails(true);
		setDetailsError(null);
		try {
			const result = await saveDetails({ draftName, draftDescription });
			if (result.ok) {
				setEditingField(null);
			} else {
				setDetailsError(result.error);
			}
		} catch (err) {
			setDetailsError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsSavingDetails(false);
		}
	};

	return (
		<header className="party-detail-header">
			<Link
				to="/parties"
				search={{ search: "" }}
				className={cn(
					buttonVariants({ variant: "secondary", size: "sm" }),
					"party-detail-back",
				)}
			>
				<ArrowLeft className="h-4 w-4" />
				Back to board
			</Link>
			<div className="party-detail-title">
				<p className="party-detail-eyebrow">Party Brief</p>
				{isOwner ? (
					<div className="party-detail-edit">
						{editingField === "name" ? (
							<form onSubmit={handleSaveDetails} className="party-edit-form">
								<Label htmlFor="party-name">Party name</Label>
								<Input
									id="party-name"
									value={draftName}
									onChange={(event) => setDraftName(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === "Escape") {
											event.preventDefault();
											handleResetDetails();
										}
									}}
									autoFocus
								/>
								<div className="party-edit-actions">
									<Button
										type="submit"
										className="party-join-button"
										disabled={!draftName.trim() || isSavingDetails}
									>
										{isSavingDetails ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Check className="h-4 w-4" />
										)}
										Save
									</Button>
									<Button
										type="button"
										variant="secondary"
										onClick={handleResetDetails}
										disabled={isSavingDetails}
									>
										<X className="h-4 w-4" />
										Cancel
									</Button>
								</div>
								{detailsError && (
									<div className="party-join-error">{detailsError}</div>
								)}
							</form>
						) : (
							<button
								type="button"
								className="party-edit-trigger"
								onClick={() => startEditing("name")}
							>
								<h1 className="party-detail-name text-4xl sm:text-5xl">
									{party.name}
								</h1>
								<span className="party-edit-icon">
									<PencilLine className="h-4 w-4" />
								</span>
							</button>
						)}
						{editingField === "description" ? (
							<form onSubmit={handleSaveDetails} className="party-edit-form">
								<Label htmlFor="party-description">Description</Label>
								<Textarea
									id="party-description"
									value={draftDescription}
									onChange={(event) => setDraftDescription(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === "Escape") {
											event.preventDefault();
											handleResetDetails();
										}
									}}
									rows={4}
									autoFocus
								/>
								<div className="party-edit-actions">
									<Button
										type="submit"
										className="party-join-button"
										disabled={isSavingDetails}
									>
										{isSavingDetails ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Check className="h-4 w-4" />
										)}
										Save
									</Button>
									<Button
										type="button"
										variant="secondary"
										onClick={handleResetDetails}
										disabled={isSavingDetails}
									>
										<X className="h-4 w-4" />
										Cancel
									</Button>
								</div>
								{detailsError && (
									<div className="party-join-error">{detailsError}</div>
								)}
							</form>
						) : (
							<button
								type="button"
								className="party-edit-trigger party-edit-trigger-desc"
								onClick={() => startEditing("description")}
							>
								<p className="party-detail-desc text-lg text-muted-foreground">
									{party.description?.trim()
										? party.description
										: "Click to add a description so recruits know the expectations."}
								</p>
								<span className="party-edit-icon">
									<PencilLine className="h-4 w-4" />
								</span>
							</button>
						)}
					</div>
				) : (
					<>
						<h1 className="party-detail-name text-4xl sm:text-5xl">
							{party.name}
						</h1>
						<p className="party-detail-desc text-lg text-muted-foreground">
							{party.description?.trim()
								? party.description
								: "No leader notes yet. Check roster details or send a request to ask about goals and loadouts."}
						</p>
					</>
				)}
			</div>
			<div className="party-detail-badges">
				<span className="party-detail-badge">
					<Crown className="h-4 w-4" />
					Leader {isOwner ? "You" : "Board"}
				</span>
				<span className="party-detail-badge">
					<Users className="h-4 w-4" />
					{numberFormatter.format(acceptedCount)} /{" "}
					{numberFormatter.format(party.partySizeLimit)} accepted
				</span>
				<span className="party-detail-badge">
					<CircleDot className="h-4 w-4" />
					{numberFormatter.format(pendingCount)} requests
				</span>
			</div>
		</header>
	);
}

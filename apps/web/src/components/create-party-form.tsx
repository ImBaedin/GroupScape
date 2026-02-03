import { api } from "@GroupScape/backend/convex/_generated/api";
import { contentScema, filtersUnionSchema } from "@GroupScape/osrs-content";
import { useMutation } from "convex/react";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ContentSchema = z.infer<typeof contentScema>;

const CONTENT_OPTIONS = contentScema.options.map((content) => ({
	name: content.shape.contentName.value,
	description: content.shape.contentDescription.value,
}));

const FILTER_TYPES = filtersUnionSchema.options.map((filter) => ({
	value: filter.shape.type.value,
	label: filter.shape.label.value,
}));

const SKILLS = [
	"attack",
	"defence",
	"strength",
	"hitpoints",
	"ranged",
	"prayer",
	"magic",
	"cooking",
	"woodcutting",
	"fletching",
	"fishing",
	"firemaking",
	"crafting",
	"smithing",
	"mining",
	"herblore",
	"agility",
	"thieving",
	"slayer",
	"farming",
	"runecraft",
	"hunter",
	"construction",
	"sailing",
] as const;

type Filter = ContentSchema["filters"][number];

export default function CreatePartyForm() {
	const [selectedContent, setSelectedContent] = useState<
		ContentSchema["name"] | null
	>(null);
	const [partySizeLimit, setPartySizeLimit] = useState<number>(2);
	const [partyName, setPartyName] = useState("");
	const [description, setDescription] = useState("");
	const [filters, setFilters] = useState<Filter[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const createParty = useMutation(api.parties.create);

	const contentSchema = selectedContent
		? CONTENT_OPTIONS.find((c) => c.name === selectedContent)
		: null;

	// Get min/max party size from schema
	const getPartySizeRange = () => {
		if (!selectedContent) return { min: 2, max: 254 };
		switch (selectedContent) {
			case "Royal Titans":
				return { min: 2, max: 2 };
			case "Barbarian Assault":
				return { min: 5, max: 5 };
			case "Theatre of Blood":
				return { min: 2, max: 5 };
			default:
				return { min: 2, max: 254 };
		}
	};

	const { min, max } = getPartySizeRange();

	// Update party size limit when content changes
	const handleContentChange = (contentName: ContentSchema["name"]) => {
		setSelectedContent(contentName);
		const range = getPartySizeRange();
		setPartySizeLimit(Math.max(range.min, Math.min(range.max, partySizeLimit)));
	};

	const handleAddFilter = (type: Filter["type"]) => {
		let newFilter: Filter;
		switch (type) {
			case "killCount":
				newFilter = { type: "killCount", value: 1 };
				break;
			case "totalLevel":
				newFilter = { type: "totalLevel", value: 1 };
				break;
			case "combatLevel":
				newFilter = { type: "combatLevel", value: 1 };
				break;
			case "specificLevel":
				newFilter = {
					type: "specificLevel",
					skill: "attack",
					value: 1,
				};
				break;
		}
		setFilters([...filters, newFilter]);
	};

	const handleRemoveFilter = (index: number) => {
		setFilters(filters.filter((_, i) => i !== index));
	};

	const handleUpdateFilter = (index: number, updates: Partial<Filter>) => {
		setFilters(
			filters.map((filter, i) =>
				i === index ? { ...filter, ...updates } : filter,
			),
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedContent || !partyName.trim()) return;

		setIsSubmitting(true);
		try {
			await createParty({
				name: partyName.trim(),
				description: description.trim() || undefined,
				contentName: selectedContent,
				partySizeLimit,
				filters: filters.map((f) => {
					if (f.type === "specificLevel") {
						return {
							type: "specificLevel",
							skill: f.skill,
							value: f.value,
						};
					}
					return {
						type: f.type,
						value: f.value,
					};
				}),
			});
			// Reset form
			setSelectedContent(null);
			setPartyName("");
			setDescription("");
			setPartySizeLimit(2);
			setFilters([]);
		} catch (error) {
			console.error("Failed to create party:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card className="w-full max-w-2xl">
			<CardHeader>
				<CardTitle>GroupScape</CardTitle>
				<CardDescription>Create or search for a party</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Content Selection */}
					<div className="space-y-2">
						<Label htmlFor="content">Content</Label>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button className="w-full justify-between">
									{selectedContent || "Select content"}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								{CONTENT_OPTIONS.map((content) => (
									<DropdownMenuItem
										key={content.name}
										onClick={() => handleContentChange(content.name)}
									>
										<div>
											<div className="font-medium">{content.name}</div>
											{content.description && (
												<div className="text-muted-foreground text-xs">
													{content.description}
												</div>
											)}
										</div>
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					{/* Party Name */}
					<div className="space-y-2">
						<Label htmlFor="partyName">Party Name</Label>
						<Input
							id="partyName"
							value={partyName}
							onChange={(e) => setPartyName(e.target.value)}
							placeholder="Enter party name"
							required
						/>
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">Description (Optional)</Label>
						<Input
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Enter party description"
						/>
					</div>

					{/* Party Size Limit */}
					{selectedContent && (
						<div className="space-y-2">
							<Label htmlFor="partySizeLimit">
								Party Size Limit ({min}-{max})
							</Label>
							<Input
								id="partySizeLimit"
								type="number"
								min={min}
								max={max}
								value={partySizeLimit}
								onChange={(e) => {
									const value = Number.parseInt(e.target.value, 10);
									if (!isNaN(value)) {
										setPartySizeLimit(Math.max(min, Math.min(max, value)));
									}
								}}
								required
							/>
							<p className="text-muted-foreground text-xs">
								Party size must be between {min} and {max} for {selectedContent}
							</p>
						</div>
					)}

					{/* Filters */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label>Filters</Label>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button type="button" size="sm">
										Add Filter
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									{FILTER_TYPES.map((filterType) => (
										<DropdownMenuItem
											key={filterType.value}
											onClick={() =>
												handleAddFilter(filterType.value as Filter["type"])
											}
										>
											{filterType.label}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						{filters.length > 0 && (
							<div className="space-y-3 rounded-md border p-3">
								{filters.map((filter, index) => (
									<div
										key={index}
										className="flex items-center gap-2 rounded-md border p-2"
									>
										<div className="flex-1 space-y-2">
											<div className="font-medium text-sm">
												{
													FILTER_TYPES.find((f) => f.value === filter.type)
														?.label
												}
											</div>
											{filter.type === "specificLevel" && (
												<div>
													<Label className="text-xs">Skill</Label>
													<select
														value={filter.skill}
														onChange={(e) =>
															handleUpdateFilter(index, {
																skill: e.target.value as typeof filter.skill,
															})
														}
														className="w-full rounded-md border px-2 py-1 text-sm"
													>
														{SKILLS.map((skill) => (
															<option key={skill} value={skill}>
																{skill.charAt(0).toUpperCase() + skill.slice(1)}
															</option>
														))}
													</select>
												</div>
											)}
											<div>
												<Label className="text-xs">Value</Label>
												<Input
													type="number"
													min={1}
													max={
														filter.type === "totalLevel"
															? 2376
															: filter.type === "combatLevel"
																? 126
																: filter.type === "specificLevel"
																	? 99
																	: undefined
													}
													value={filter.value}
													onChange={(e) => {
														const value = Number.parseInt(e.target.value, 10);
														if (!isNaN(value)) {
															handleUpdateFilter(index, { value });
														}
													}}
													className="text-sm"
												/>
											</div>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => handleRemoveFilter(index)}
										>
											Remove
										</Button>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Submit Button */}
					<Button
						type="submit"
						disabled={!selectedContent || !partyName.trim() || isSubmitting}
						className="w-full"
					>
						{isSubmitting ? "Creating..." : "Create Party"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

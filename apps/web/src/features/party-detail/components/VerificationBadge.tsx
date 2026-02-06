import { BadgeCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { statusLabels, type VerificationStatus } from "../constants";

export function VerificationBadge({ status }: { status: VerificationStatus }) {
	const Icon =
		status === "verified"
			? BadgeCheck
			: status === "pending"
				? ShieldAlert
				: ShieldQuestion;

	return (
		<span className={`account-status account-status-${status}`}>
			<Icon className="h-3.5 w-3.5" aria-hidden="true" />
			{statusLabels[status]}
		</span>
	);
}

export function PendingVerificationBadge({
	status,
}: {
	status?: VerificationStatus;
}) {
	if (!status) return null;
	return <VerificationBadge status={status} />;
}

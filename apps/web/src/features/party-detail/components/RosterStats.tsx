import { COMBAT_SKILL_LABELS } from "../constants";
import { usePartyDetailContext } from "../context";
import type { StatsSummary } from "../types";

export function RosterStats({
	summary,
	lastUpdated,
	isStale,
}: {
	summary?: StatsSummary;
	lastUpdated?: number;
	isStale: boolean;
}) {
	const {
		formatting: { dateFormatter, numberFormatter },
	} = usePartyDetailContext();

	if (!summary) {
		return <div className="party-stats-empty">No hiscores snapshot yet.</div>;
	}

	const updatedLabel = lastUpdated
		? dateFormatter.format(new Date(lastUpdated))
		: "Not updated yet";

	return (
		<div className="party-stats">
			<div className="party-stats-top">
				<div className="party-stats-metric">
					<span>Combat</span>
					<strong>{numberFormatter.format(summary.combatLevel)}</strong>
				</div>
				<div className="party-stats-metric">
					<span>Total</span>
					<strong>{numberFormatter.format(summary.totalLevel)}</strong>
				</div>
			</div>
			<div className="party-stats-skills">
				{COMBAT_SKILL_LABELS.map((skill) => (
					<div key={skill.key} className="party-stats-skill">
						<span className="party-stats-skill-label">
							<img
								src={skill.icon}
								alt={`${skill.label} icon`}
								className="party-stats-skill-icon"
								loading="lazy"
							/>
							{skill.label}
						</span>
						<strong>
							{numberFormatter.format(summary.combatSkills[skill.key])}
						</strong>
					</div>
				))}
			</div>
			<div className="party-stats-footer">
				<span>Updated {updatedLabel}</span>
				{isStale && <span className="party-stats-stale">Stale</span>}
			</div>
		</div>
	);
}

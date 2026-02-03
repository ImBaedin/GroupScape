/**
 * Convex-compatible OSRS hiscores fetcher. Replaces osrs-json-hiscores
 * because that package depends on jsdom (xhr-sync-worker.js) which fails
 * in Convex's V8 isolate runtime.
 */

const BASE_URL = "https://secure.runescape.com/m=hiscore_oldschool";
const JSON_STATS_URL = "index_lite.json?player=";

const GAMEMODE_URL: Record<string, string> = {
	main: `${BASE_URL}/`,
	ironman: `${BASE_URL}_ironman/`,
	hardcore: `${BASE_URL}_hardcore_ironman/`,
	ultimate: `${BASE_URL}_ultimate/`,
	deadman: `${BASE_URL}_deadman/`,
	seasonal: `${BASE_URL}_seasonal/`,
	tournament: `${BASE_URL}_tournament/`,
	skiller: `${BASE_URL}_skiller/`,
	oneDefence: `${BASE_URL}_skiller_defence/`,
	freshStart: `${BASE_URL}_fresh_start/`,
};

const GAMEMODES = Object.keys(GAMEMODE_URL);

const SKILLS = [
	"overall",
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
];

const FORMATTED_SKILL_NAMES: Record<string, string> = {
	overall: "Overall",
	attack: "Attack",
	defence: "Defence",
	strength: "Strength",
	hitpoints: "Hitpoints",
	ranged: "Ranged",
	prayer: "Prayer",
	magic: "Magic",
	cooking: "Cooking",
	woodcutting: "Woodcutting",
	fletching: "Fletching",
	fishing: "Fishing",
	firemaking: "Firemaking",
	crafting: "Crafting",
	smithing: "Smithing",
	mining: "Mining",
	herblore: "Herblore",
	agility: "Agility",
	thieving: "Thieving",
	slayer: "Slayer",
	farming: "Farming",
	runecraft: "Runecraft",
	hunter: "Hunter",
	construction: "Construction",
	sailing: "Sailing",
};

const BH_MODES = ["hunterV2", "rogueV2", "hunter", "rogue"] as const;
const FORMATTED_BH_NAMES: Record<string, string> = {
	rogue: "Bounty Hunter (Legacy) - Rogue",
	hunter: "Bounty Hunter (Legacy) - Hunter",
	rogueV2: "Bounty Hunter - Rogue",
	hunterV2: "Bounty Hunter - Hunter",
};

const CLUES = [
	"all",
	"beginner",
	"easy",
	"medium",
	"hard",
	"elite",
	"master",
] as const;
const FORMATTED_CLUE_NAMES: Record<string, string> = {
	all: "Clue Scrolls (all)",
	beginner: "Clue Scrolls (beginner)",
	easy: "Clue Scrolls (easy)",
	medium: "Clue Scrolls (medium)",
	hard: "Clue Scrolls (hard)",
	elite: "Clue Scrolls (elite)",
	master: "Clue Scrolls (master)",
};

const BOSSES = [
	"abyssalSire",
	"alchemicalHydra",
	"amoxliatl",
	"araxxor",
	"artio",
	"barrows",
	"bryophyta",
	"callisto",
	"calvarion",
	"cerberus",
	"chambersOfXeric",
	"chambersOfXericChallengeMode",
	"chaosElemental",
	"chaosFanatic",
	"commanderZilyana",
	"corporealBeast",
	"crazyArchaeologist",
	"dagannothPrime",
	"dagannothRex",
	"dagannothSupreme",
	"derangedArchaeologist",
	"doomOfMokhaiotl",
	"dukeSucellus",
	"generalGraardor",
	"giantMole",
	"grotesqueGuardians",
	"hespori",
	"kalphiteQueen",
	"kingBlackDragon",
	"kraken",
	"kreeArra",
	"krilTsutsaroth",
	"lunarChests",
	"mimic",
	"nex",
	"nightmare",
	"phosanisNightmare",
	"obor",
	"phantomMuspah",
	"sarachnis",
	"scorpia",
	"scurrius",
	"shellbaneGryphon",
	"skotizo",
	"solHeredit",
	"spindel",
	"tempoross",
	"gauntlet",
	"corruptedGauntlet",
	"hueycoatl",
	"leviathan",
	"royalTitans",
	"whisperer",
	"theatreOfBlood",
	"theatreOfBloodHardMode",
	"thermonuclearSmokeDevil",
	"tombsOfAmascut",
	"tombsOfAmascutExpertMode",
	"tzKalZuk",
	"tzTokJad",
	"vardorvis",
	"venenatis",
	"vetion",
	"vorkath",
	"wintertodt",
	"yama",
	"zalcano",
	"zulrah",
] as const;

const FORMATTED_BOSS_NAMES: Record<string, string> = {
	abyssalSire: "Abyssal Sire",
	alchemicalHydra: "Alchemical Hydra",
	amoxliatl: "Amoxliatl",
	araxxor: "Araxxor",
	artio: "Artio",
	barrows: "Barrows Chests",
	bryophyta: "Bryophyta",
	callisto: "Callisto",
	calvarion: "Calvar'ion",
	cerberus: "Cerberus",
	chambersOfXeric: "Chambers of Xeric",
	chambersOfXericChallengeMode: "Chambers of Xeric: Challenge Mode",
	chaosElemental: "Chaos Elemental",
	chaosFanatic: "Chaos Fanatic",
	commanderZilyana: "Commander Zilyana",
	corporealBeast: "Corporeal Beast",
	crazyArchaeologist: "Crazy Archaeologist",
	dagannothPrime: "Dagannoth Prime",
	dagannothRex: "Dagannoth Rex",
	dagannothSupreme: "Dagannoth Supreme",
	derangedArchaeologist: "Deranged Archaeologist",
	doomOfMokhaiotl: "Doom of Mokhaiotl",
	dukeSucellus: "Duke Sucellus",
	generalGraardor: "General Graardor",
	giantMole: "Giant Mole",
	grotesqueGuardians: "Grotesque Guardians",
	hespori: "Hespori",
	kalphiteQueen: "Kalphite Queen",
	kingBlackDragon: "King Black Dragon",
	kraken: "Kraken",
	kreeArra: "Kree'Arra",
	krilTsutsaroth: "K'ril Tsutsaroth",
	lunarChests: "Lunar Chests",
	mimic: "Mimic",
	nex: "Nex",
	nightmare: "Nightmare",
	phosanisNightmare: "Phosani's Nightmare",
	obor: "Obor",
	phantomMuspah: "Phantom Muspah",
	sarachnis: "Sarachnis",
	scorpia: "Scorpia",
	scurrius: "Scurrius",
	shellbaneGryphon: "Shellbane Gryphon",
	skotizo: "Skotizo",
	solHeredit: "Sol Heredit",
	spindel: "Spindel",
	tempoross: "Tempoross",
	gauntlet: "The Gauntlet",
	corruptedGauntlet: "The Corrupted Gauntlet",
	hueycoatl: "The Hueycoatl",
	leviathan: "The Leviathan",
	royalTitans: "The Royal Titans",
	whisperer: "The Whisperer",
	theatreOfBlood: "Theatre of Blood",
	theatreOfBloodHardMode: "Theatre of Blood: Hard Mode",
	thermonuclearSmokeDevil: "Thermonuclear Smoke Devil",
	tombsOfAmascut: "Tombs of Amascut",
	tombsOfAmascutExpertMode: "Tombs of Amascut: Expert Mode",
	tzKalZuk: "TzKal-Zuk",
	tzTokJad: "TzTok-Jad",
	vardorvis: "Vardorvis",
	venenatis: "Venenatis",
	vetion: "Vet'ion",
	vorkath: "Vorkath",
	wintertodt: "Wintertodt",
	yama: "Yama",
	zalcano: "Zalcano",
	zulrah: "Zulrah",
};

const FORMATTED_LMS = "LMS - Rank";
const FORMATTED_PVP_ARENA = "PvP Arena - Rank";
const FORMATTED_SOUL_WARS = "Soul Wars Zeal";
const FORMATTED_LEAGUE_POINTS = "League Points";
const FORMATTED_DEADMAN_POINTS = "Deadman Points";
const FORMATTED_RIFTS_CLOSED = "Rifts closed";
const FORMATTED_COLOSSEUM_GLORY = "Colosseum Glory";
const FORMATTED_COLLECTIONS_LOGGED = "Collections Logged";

export class PlayerNotFoundError extends Error {
	constructor() {
		super("Player not found");
		this.name = "PlayerNotFoundError";
	}
}

export class InvalidRSNError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidRSNError";
	}
}

function validateRSN(rsn: string): void {
	if (typeof rsn !== "string") {
		throw new InvalidRSNError("RSN must be a string");
	}
	if (!/^[a-zA-Z0-9 _-]+$/.test(rsn)) {
		throw new InvalidRSNError("RSN contains invalid character");
	}
	if (rsn.length > 12 || rsn.length < 1) {
		throw new InvalidRSNError("RSN must be between 1 and 12 characters");
	}
}

type HiscoresSkill = { name: string; rank: number; level: number; xp: number };
type HiscoresActivity = { name: string; rank: number; score: number };
type HiscoresResponse = {
	skills: HiscoresSkill[];
	activities: HiscoresActivity[];
};

type SkillStat = { rank: number; level: number; xp: number };
type ActivityStat = { rank: number; score: number };
export type Stats = {
	skills: Record<string, SkillStat>;
	leaguePoints: ActivityStat;
	deadmanPoints: ActivityStat;
	bountyHunter: Record<string, ActivityStat>;
	lastManStanding: ActivityStat;
	pvpArena: ActivityStat;
	soulWarsZeal: ActivityStat;
	riftsClosed: ActivityStat;
	colosseumGlory: ActivityStat;
	collectionsLogged: ActivityStat;
	clues: Record<string, ActivityStat>;
	bosses: Record<string, ActivityStat>;
};

function parseJsonStats(json: HiscoresResponse): Stats {
	const getActivity = (formattedName: string): ActivityStat => {
		const hiscoresActivity = json.activities.find(
			(a) => a.name.toLowerCase() === formattedName.toLowerCase(),
		);
		return {
			rank: hiscoresActivity?.rank ?? -1,
			score: hiscoresActivity?.score ?? -1,
		};
	};

	const reduceActivity = (
		keys: readonly string[],
		formattedNames: Record<string, string>,
	): Record<string, ActivityStat> => {
		const result: Record<string, ActivityStat> = {};
		for (const key of keys) {
			result[key] = getActivity(formattedNames[key]);
		}
		return result;
	};

	const skills: Record<string, SkillStat> = {};
	for (const skillName of SKILLS) {
		const hiscoresSkill = json.skills.find(
			(s) =>
				s.name.toLowerCase() === FORMATTED_SKILL_NAMES[skillName].toLowerCase(),
		);
		skills[skillName] = {
			rank: hiscoresSkill?.rank ?? -1,
			level: hiscoresSkill?.level ?? -1,
			xp: hiscoresSkill?.xp ?? -1,
		};
	}

	return {
		skills,
		leaguePoints: getActivity(FORMATTED_LEAGUE_POINTS),
		deadmanPoints: getActivity(FORMATTED_DEADMAN_POINTS),
		bountyHunter: reduceActivity(BH_MODES, FORMATTED_BH_NAMES),
		lastManStanding: getActivity(FORMATTED_LMS),
		pvpArena: getActivity(FORMATTED_PVP_ARENA),
		soulWarsZeal: getActivity(FORMATTED_SOUL_WARS),
		riftsClosed: getActivity(FORMATTED_RIFTS_CLOSED),
		colosseumGlory: getActivity(FORMATTED_COLOSSEUM_GLORY),
		collectionsLogged: getActivity(FORMATTED_COLLECTIONS_LOGGED),
		clues: reduceActivity(CLUES, FORMATTED_CLUE_NAMES),
		bosses: reduceActivity(BOSSES, FORMATTED_BOSS_NAMES),
	};
}

/**
 * Fetches stats from the OSRS JSON API and returns a parsed stats object.
 */
export async function getStatsByGamemode(
	rsn: string,
	mode = "main",
): Promise<Stats> {
	validateRSN(rsn);
	if (!GAMEMODES.includes(mode)) {
		throw new Error("Invalid game mode");
	}

	const url = GAMEMODE_URL[mode] + JSON_STATS_URL + encodeURIComponent(rsn);

	const res = await fetch(url, {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36",
		},
	});

	if (res.status === 404) {
		throw new PlayerNotFoundError();
	}
	if (!res.ok) {
		throw new Error("HiScores not responding");
	}

	const json = (await res.json()) as HiscoresResponse;
	return parseJsonStats(json);
}

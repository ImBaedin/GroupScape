import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { authClient } from "@/lib/auth-client";

const searchSchema = z.object({
	mode: z.enum(["sign-in", "sign-up"]).optional(),
});

export const Route = createFileRoute("/auth")({
	validateSearch: (search) => searchSchema.parse(search),
	component: AuthRoute,
});

function AuthRoute() {
	const search = Route.useSearch();
	const initialMode = useMemo<"sign-in" | "sign-up">(
		() => (search.mode === "sign-up" ? "sign-up" : "sign-in"),
		[search.mode],
	);
	const [mode, setMode] = useState<"sign-in" | "sign-up">(initialMode);
	const [discordPending, setDiscordPending] = useState(false);

	useEffect(() => {
		setMode(initialMode);
	}, [initialMode]);

	const handleDiscord = async () => {
		setDiscordPending(true);
		try {
			const callbackURL = `${window.location.origin}/parties`;
			await authClient.signIn.social(
				{
					provider: "discord",
					callbackURL,
					newUserCallbackURL: callbackURL,
				},
				{
					onSuccess: (ctx) => {
						const redirectUrl = ctx.data?.url;
						if (redirectUrl) {
							window.location.assign(redirectUrl);
							return;
						}
						toast.success("Discord sign-in started.");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		} finally {
			setDiscordPending(false);
		}
	};

	return (
		<div className="auth-page min-h-[calc(100svh-4rem)] px-4 py-10 sm:px-8">
			<div className="auth-grid mx-auto max-w-6xl">
				<section className="auth-hero">
					<div className="auth-crest">
						<img
							src="/logo.png"
							alt="GroupScape"
							className="h-12 w-12 rounded-full border border-border/60"
						/>
						<div>
							<p className="auth-brand">GroupScape</p>
							<p className="auth-brand-sub">Better Auth + Convex Sync</p>
						</div>
					</div>
					<div className="space-y-6">
						<p className="auth-eyebrow">Secure Your Party</p>
						<h1 className="auth-title text-4xl sm:text-5xl lg:text-6xl">
							Build crews faster with verified rosters.
						</h1>
						<p className="auth-lede text-lg text-muted-foreground">
							Lock your party behind better auth flows, then let Convex sync
							rosters in real time. No more missing calls, no more unsure
							invites.
						</p>
					</div>
					<div className="auth-hero-grid">
						<div className="auth-hero-card">
							<span className="auth-hero-label">Realtime Updates</span>
							<p>Convex keeps party status fresh without page reloads.</p>
						</div>
						<div className="auth-hero-card">
							<span className="auth-hero-label">Trusted Identities</span>
							<p>Better Auth verifies accounts and handles sessions.</p>
						</div>
						<div className="auth-hero-card">
							<span className="auth-hero-label">Guild Ready</span>
							<p>Invite with one link, track roles, and stay in sync.</p>
						</div>
					</div>
					<div className="auth-quote">
						<p className="auth-quote-text">
							“Everything you need for raid-ready coordination.”
						</p>
						<p className="auth-quote-author">— GroupScape Party Leads</p>
					</div>
				</section>

				<section className="auth-card">
					<div className="auth-card-header">
						<h2 className="auth-card-title">
							{mode === "sign-in" ? "Sign in" : "Create your account"}
						</h2>
						<p className="auth-card-subtitle">
							{mode === "sign-in"
								? "Return to your parties in seconds."
								: "Claim your roster and start syncing instantly."}
						</p>
					</div>

					<div className="auth-toggle" role="tablist" aria-label="Auth mode">
						<button
							type="button"
							data-active={mode === "sign-in"}
							onClick={() => setMode("sign-in")}
						>
							Sign In
						</button>
						<button
							type="button"
							data-active={mode === "sign-up"}
							onClick={() => setMode("sign-up")}
						>
							Sign Up
						</button>
					</div>

					<button
						type="button"
						className="auth-discord"
						onClick={handleDiscord}
						disabled={discordPending}
					>
						<span className="auth-discord-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" role="img">
								<path
									d="M19.7 4.8A16.1 16.1 0 0 0 15.3 3a11 11 0 0 0-.6 1.3 15.2 15.2 0 0 0-4.3 0A11 11 0 0 0 9.8 3a16.1 16.1 0 0 0-4.4 1.8A17.7 17.7 0 0 0 2 16.2a16 16 0 0 0 5 2.6 13 13 0 0 0 1-1.6 10.7 10.7 0 0 1-1.6-.8l.4-.3a11.5 11.5 0 0 0 10.4 0l.4.3c-.5.3-1 .6-1.6.8a13 13 0 0 0 1 1.6 16 16 0 0 0 5-2.6 17.7 17.7 0 0 0-3.3-11.4ZM8.7 14.2c-.8 0-1.5-.7-1.5-1.6s.6-1.6 1.5-1.6 1.6.7 1.6 1.6-.7 1.6-1.6 1.6Zm6.6 0c-.8 0-1.5-.7-1.5-1.6s.6-1.6 1.5-1.6 1.6.7 1.6 1.6-.7 1.6-1.6 1.6Z"
									fill="currentColor"
								/>
							</svg>
						</span>
						{discordPending ? "Connecting..." : "Continue with Discord"}
					</button>

					<div className="auth-or">
						<span>or use email</span>
					</div>

					{mode === "sign-in" ? (
						<SignInForm onSwitchToSignUp={() => setMode("sign-up")} />
					) : (
						<SignUpForm onSwitchToSignIn={() => setMode("sign-in")} />
					)}

					<div className="auth-footnote">
						By continuing, you agree to keep parties respectful and follow the
						GroupScape code.
					</div>
				</section>
			</div>
		</div>
	);
}

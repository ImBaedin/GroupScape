import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignInForm({
	onSwitchToSignUp,
	className,
	title = "Welcome Back",
	description = "Rejoin your party roster and sync up in seconds.",
}: {
	onSwitchToSignUp: () => void;
	className?: string;
	title?: string;
	description?: string;
}) {
	const navigate = useNavigate({
		from: "/auth",
	});

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: () => {
						navigate({
							to: "/parties",
						});
						toast.success("Sign in successful");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	return (
		<div className={cn("auth-form", className)}>
			<div className="auth-form-header">
				<h1 className="auth-form-title">{title}</h1>
				<p className="auth-form-subtitle">{description}</p>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="auth-form-body"
			>
				<div>
					<form.Field name="email">
						{(field) => (
							<div className="space-y-2">
								<Label className="auth-label" htmlFor={field.name}>
									Email
								</Label>
								<Input
									id={field.name}
									name={field.name}
									type="email"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									className="auth-input"
								/>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="auth-error">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>
				</div>

				<div>
					<form.Field name="password">
						{(field) => (
							<div className="space-y-2">
								<Label className="auth-label" htmlFor={field.name}>
									Password
								</Label>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									className="auth-input"
								/>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="auth-error">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>
				</div>

				<form.Subscribe>
					{(state) => (
						<Button
							type="submit"
							className="auth-submit"
							disabled={!state.canSubmit || state.isSubmitting}
						>
							{state.isSubmitting ? "Submitting..." : "Sign In"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<div className="auth-form-footer">
				<Button
					variant="link"
					onClick={onSwitchToSignUp}
					className="auth-link"
				>
					Need an account? Sign Up
				</Button>
			</div>
		</div>
	);
}

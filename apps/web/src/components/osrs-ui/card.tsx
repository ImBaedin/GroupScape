import type * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card"
			className={cn(
				"flex flex-col gap-2 rounded-xl border bg-[url(/ui/background.png)] px-1 pt-2 pb-6 text-card-foreground shadow-sm [border-image:url(/ui/metal-border.png)_9_9/9px_repeat] [image-rendering:pixelated] dark:bg-[url(/ui/background-dark.png)]",
				className,
			)}
			{...props}
		/>
	);
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				"@container/card-header after:-bottom-1.5 relative flex flex-row justify-center px-6 after:absolute after:inset-x-0 after:h-1.5 after:bg-[url(/ui/metal-border-horizontal.png)] has-data-[slot=card-action]:grid-cols-[1fr_auto] after:[calc(w-full+var(--spacing)*6)] [.border-b]:pb-6",
				className,
			)}
			{...props}
		/>
	);
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<span
			data-slot="card-title"
			className={cn("font-semibold", className)}
			{...props}
		/>
	);
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<span
			data-slot="card-description"
			className={cn(
				"ml-0.5 font-semibold text-muted-foreground before:content-['_-_']",
				className,
			)}
			{...props}
		/>
	);
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-action"
			className={cn(
				"col-start-2 row-span-2 row-start-1 self-start justify-self-end",
				className,
			)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-content"
			className={cn("px-6", className)}
			{...props}
		/>
	);
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-footer"
			className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
			{...props}
		/>
	);
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
};

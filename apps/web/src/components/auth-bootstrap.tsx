import { api } from "@GroupScape/backend/convex/_generated/api";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";

export default function AuthBootstrap() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const getOrCreate = useMutation(api.users.getOrCreate);
	const hasBootstrappedRef = useRef(false);

	useEffect(() => {
		if (isLoading) return;
		if (!isAuthenticated) {
			hasBootstrappedRef.current = false;
			return;
		}
		if (hasBootstrappedRef.current) return;

		hasBootstrappedRef.current = true;
		void getOrCreate().catch((error) => {
			console.error("Failed to bootstrap user", error);
		});
	}, [getOrCreate, isAuthenticated, isLoading]);

	return null;
}

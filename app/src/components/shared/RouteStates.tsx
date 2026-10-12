import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";

// Shown while a route's code or loader data is on its way.
export function RoutePending() {
  return (
    <div className="container py-6">
      <LoadingState variant="page" className="p-0" />
    </div>
  );
}

// Route-level error boundary: retrying resets failed queries and re-runs loaders.
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  useEffect(() => {
    queryErrorResetBoundary.reset();
  }, [queryErrorResetBoundary]);

  return (
    <div className="container py-6">
      <ErrorState
        title="This page couldn't load"
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => router.invalidate()}
      />
    </div>
  );
}

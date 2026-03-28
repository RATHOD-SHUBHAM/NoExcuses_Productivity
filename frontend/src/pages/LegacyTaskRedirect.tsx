import { Navigate, useParams } from "react-router-dom";

/** Old path `/task/:id` → `/tasks/:task_id` */
export function LegacyTaskRedirect() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/" replace />;
  return <Navigate to={`/tasks/${id}`} replace />;
}

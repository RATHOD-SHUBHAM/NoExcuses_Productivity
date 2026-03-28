export type Task = {
  id: string;
  title: string;
  completedToday: boolean;
  /** Per-task rest for local “today” (streak bridging for this habit only). */
  restToday: boolean;
  createdAt?: string;
};

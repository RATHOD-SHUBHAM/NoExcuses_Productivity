/** Shapes returned by the FastAPI backend (JSON). */

export type ApiTask = {
  id: string;
  title: string;
  created_at: string;
  task_kind?: "daily" | "monthly";
  month_bucket?: string | null;
  window_start?: string | null;
  window_end?: string | null;
};

export type ApiTaskLog = {
  date: string;
  completed: boolean;
};

export type ApiDailyCompletion = {
  date: string;
  count: number;
  rest_marks?: number;
  global_rest?: boolean;
};

export type ApiCalendarDayTask = {
  task_id: string;
  title: string;
  task_kind: "daily" | "monthly";
  month_bucket?: string | null;
  completed: boolean;
  rest_today: boolean;
  window_start?: string | null;
  window_end?: string | null;
};

export type ApiCalendarDay = {
  date: string;
  global_rest: boolean;
  tasks: ApiCalendarDayTask[];
};

export type ApiTaskStats = {
  task_id: string;
  total_completed_days: number;
  current_streak: number;
  longest_streak: number;
  completion_percent: number;
  total_days_tracked: number;
  rest_days_count?: number;
  accounted_days?: number;
  accounted_percent?: number;
};

export type ApiWeeklyReview = {
  id: string | null;
  week_start: string;
  what_worked: string;
  what_to_improve: string;
  what_to_drop: string;
  created_at: string | null;
  updated_at: string | null;
};

export type ApiWeekendWishlistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type ApiWeekendPlan = {
  id: string | null;
  weekend_start: string;
  items: ApiWeekendWishlistItem[];
  created_at: string | null;
  updated_at: string | null;
};

export type ApiRestDay = {
  date: string;
};

/** Per-task rest row for a given calendar day (from GET /api/task-rest-days?on=) */
export type ApiTaskRestDay = {
  task_id: string;
  date: string;
};

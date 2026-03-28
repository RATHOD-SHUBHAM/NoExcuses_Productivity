/** Stable per-task accent (reference: purple / amber / green rows). */
export function heatmapAccentForTask(taskId: string): {
  done: string;
  dim: string;
  rest: string;
} {
  let h = 2166136261;
  for (let i = 0; i < taskId.length; i++) {
    h ^= taskId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hue = Math.abs(h) % 360;
  const restHue = (hue + 38) % 360;
  return {
    done: `hsl(${hue} 72% 48%)`,
    dim: `hsl(${hue} 32% 16%)`,
    rest: `hsl(${restHue} 72% 46%)`,
  };
}

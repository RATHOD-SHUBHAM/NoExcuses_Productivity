import type { ReactNode } from "react";
import { sectionTitle, sectionTitleRule } from "../../lib/ui";

export function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h2 id={id} className={sectionTitle}>
      <span className={sectionTitleRule} aria-hidden />
      {children}
    </h2>
  );
}

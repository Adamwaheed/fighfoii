import type { ReactNode } from "react";
import { blockStyleCss, isPlain, parseBlockStyle } from "@/lib/block-style";

/**
 * Wraps a block's content in its configured surface — background, border,
 * radius, lift and opacity. An unstyled block renders no wrapper at all, so
 * the default article keeps its clean markup and vertical rhythm.
 */
export function BlockShell({
  style: raw,
  children,
}: {
  style: string;
  children: ReactNode;
}) {
  const style = parseBlockStyle(raw);
  if (isPlain(style)) return <>{children}</>;

  return (
    <div className="my-5" style={blockStyleCss(style)}>
      {children}
    </div>
  );
}

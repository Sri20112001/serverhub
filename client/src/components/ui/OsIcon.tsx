import type { SVGProps } from "react";
import { Monitor, SquareTerminal } from "lucide-react";
import { detectOs } from "../../utils/osDetect";

export function WindowsIcon({
  size = 18,
  className = "",
  color = "currentColor",
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      aria-hidden="true"
    >
      <path d="M0 3.449L9.75 2.1v9.451H0V3.449zm10.949-1.551L24 0v11.4H10.949V1.898zM0 12.6h9.75v9.451L0 20.701V12.6zm10.949 0H24V24l-13.051-1.898V12.6z" />
    </svg>
  );
}

export function OsIcon({
  os = "",
  platform = "",
  size = 18,
  className = "",
  colored = true,
}: {
  os?: string;
  platform?: string;
  size?: number;
  className?: string;
  colored?: boolean;
}) {
  const { meta, iconType, simpleIcon } = detectOs(os, platform);

  if (iconType === "windows") {
    return (
      <WindowsIcon
        size={size}
        className={className}
        color={colored && meta.color ? meta.color : "currentColor"}
      />
    );
  }

  if (iconType === "simple" && simpleIcon) {
    return (
      <svg
        role="img"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={colored && meta.color ? meta.color : "currentColor"}
        className={className}
        aria-hidden="true"
      >
        <path d={simpleIcon.path} />
      </svg>
    );
  }

  if (iconType === "terminal") {
    return <SquareTerminal size={size} className={className} />;
  }

  return <Monitor size={size} className={className} />;
}

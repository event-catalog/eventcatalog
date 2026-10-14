import { memo } from "react";
import { Background } from "@xyflow/react";

/**
 * A diagram's background: dots on the canvas colour (`.react-flow` in styles-core.css), the same wherever a
 * diagram is drawn (the visualiser and Studio)
 */
const DiagramBackground = memo(function DiagramBackground() {
  return <Background color="var(--ec-bg-dots)" gap={16} />;
});

export default DiagramBackground;

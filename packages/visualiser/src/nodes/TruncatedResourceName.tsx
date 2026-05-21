import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type TruncatedResourceNameProps = {
  as?: "div" | "span";
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  tooltipBorderColor?: string;
  value: string;
};

export function TruncatedResourceName({
  as: Component = "span",
  children,
  className,
  style,
  tooltipBorderColor = "rgb(var(--ec-page-border))",
  value,
}: TruncatedResourceNameProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth);
    };

    updateTruncation();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateTruncation);
      return () => window.removeEventListener("resize", updateTruncation);
    }

    const observer = new ResizeObserver(updateTruncation);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  return (
    <Component className="ec-truncated-resource-name group relative min-w-0 max-w-full flex-1">
      <span
        ref={ref}
        className={`block min-w-0 ${className || ""}`}
        style={style}
      >
        {children}
      </span>
      {isTruncated && (
        <span
          className="ec-truncated-resource-name-tooltip pointer-events-none absolute left-1/2 bottom-full z-[9999] mb-4 hidden w-max max-w-[320px] -translate-x-1/2 rounded-md border-2 bg-slate-950 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-white shadow-lg group-hover:block group-focus-within:block"
          style={{ borderColor: tooltipBorderColor }}
        >
          <span className="block whitespace-normal break-words">{value}</span>
          <span
            className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r bg-slate-950"
            style={{
              borderBottomColor: tooltipBorderColor,
              borderRightColor: tooltipBorderColor,
            }}
          />
        </span>
      )}
    </Component>
  );
}

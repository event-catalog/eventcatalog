import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import { getIcon } from "../utils/badges";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { buildUrl } from "../utils/url-builder";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { usePortalContainer } from "../context/PortalContainerContext";
import {
  HANDLE_LEFT_OFFSET_STYLE,
  HANDLE_RIGHT_OFFSET_STYLE,
  EMPTY_ARRAY,
} from "./shared-styles";
import { TruncatedResourceName } from "./TruncatedResourceName";

export const ENTITY_TARGET_HANDLE_ID = "__eventcatalog-entity-target";

export interface EntityProperty {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  references?: string;
  referencesIdentifier?: string;
  referenceTarget?: "entity";
  relationType?: string;
  enum?: string[];
  properties?: EntityProperty[];
  items?: {
    type: string;
    properties?: EntityProperty[];
  };
}

interface EntityData {
  id: string;
  name: string;
  version: string;
  properties?: EntityProperty[];
  aggregateRoot?: boolean;
  sidebar?: any;
  styles?: {
    backgroundColor?: string;
    borderColor?: string;
    icon?: string;
    node?: {
      color?: string;
      label?: string;
    };
  };
}

interface Data {
  title: string;
  label: string;
  bgColor: string;
  color: string;
  mode: "simple" | "full";
  entity: {
    data: EntityData;
  };
  showTarget?: boolean;
  showSource?: boolean;
  externalToDomain?: boolean;
  domainName?: string;
  domainId?: string;
  entityTargetHandle?: string;
  referencePropertyNames?: string[];
  group?: {
    type: string;
    value: string;
  };
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

export const getPropertyTypeLabel = (property: any) => {
  if (property.type === "array" && property.items?.type) {
    return `${property.items.type}[]`;
  }

  return property.type;
};

export const getNestedEntityProperties = (
  property: EntityProperty,
): EntityProperty[] => {
  if (property.properties?.length) return property.properties;
  if (property.type === "array" && property.items?.properties?.length) {
    return property.items.properties;
  }
  return [];
};

export default memo(function EntityNode({
  id,
  data,
  sourcePosition,
  targetPosition,
}: any) {
  const {
    mode,
    entity,
    externalToDomain,
    domainName,
    entityTargetHandle = ENTITY_TARGET_HANDLE_ID,
    referencePropertyNames = EMPTY_ARRAY,
  } = data as Data;
  const {
    name,
    version,
    properties = EMPTY_ARRAY,
    aggregateRoot,
    styles,
    sidebar: _sidebar,
  } = entity.data;

  const {
    node: { color: _color = "blue", label: _label } = {},
    icon = "CubeIcon",
  } = styles || {};

  const Icon = useMemo(() => getIcon(icon), [icon]);

  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(
    () => new Set(),
  );
  const previousExpandedProperties = useRef(expandedProperties);
  const updateNodeInternals = useUpdateNodeInternals();
  const portalContainer = usePortalContainer();
  const referenceProperties = useMemo(
    () => new Set(referencePropertyNames),
    [referencePropertyNames],
  );

  const toggleProperty = useCallback((propertyPath: string) => {
    setExpandedProperties((current) => {
      const next = new Set(current);
      if (next.has(propertyPath)) {
        next.delete(propertyPath);
      } else {
        next.add(propertyPath);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (previousExpandedProperties.current === expandedProperties) return;
    previousExpandedProperties.current = expandedProperties;
    updateNodeInternals(id);
  }, [expandedProperties, id, updateNodeInternals]);

  const renderPropertyRows = (
    entityProperties: EntityProperty[],
    depth = 0,
    parentPath = "",
  ): React.ReactNode =>
    entityProperties.map((property, index) => {
      const propertyPath = parentPath
        ? `${parentPath}.${property.name}`
        : property.name;
      const propertyKey = `${propertyPath}-${index}`;
      const isHovered = hoveredProperty === propertyKey;
      const nestedProperties = getNestedEntityProperties(property);
      const isExpandable = nestedProperties.length > 0;
      const isExpanded = expandedProperties.has(propertyPath);
      const isTopLevel = depth === 0;
      const referencedEntityId =
        property.references ||
        (isTopLevel && referenceProperties.has(property.name)
          ? property.items?.type
          : undefined);

      return (
        <div key={propertyKey}>
          <div
            className={classNames(
              "relative flex items-center justify-between py-2 pr-4 hover:bg-[rgb(var(--ec-page-border)/0.2)]",
              isExpandable && "nodrag nopan cursor-pointer",
            )}
            style={{ paddingLeft: `${16 + depth * 16}px` }}
            role={isExpandable ? "button" : undefined}
            tabIndex={isExpandable ? 0 : undefined}
            aria-label={
              isExpandable
                ? `${isExpanded ? "Collapse" : "Expand"} ${property.name}`
                : undefined
            }
            aria-expanded={isExpandable ? isExpanded : undefined}
            onClick={(event) => {
              if (!isExpandable) return;
              const target = event.target as HTMLElement;
              if (target.closest(".react-flow__handle")) return;
              toggleProperty(propertyPath);
            }}
            onKeyDown={(event) => {
              if (!isExpandable || (event.key !== "Enter" && event.key !== " "))
                return;
              event.preventDefault();
              toggleProperty(propertyPath);
            }}
            onMouseEnter={() =>
              property.description && setHoveredProperty(propertyKey)
            }
            onMouseLeave={() => setHoveredProperty(null)}
          >
            {isTopLevel && (
              <>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${property.name}-target`}
                  className="!w-3 !h-3 !bg-[rgb(var(--ec-card-bg))] !border-2 !border-[rgb(var(--ec-page-border))] !rounded-full !left-[-0px]"
                  style={HANDLE_LEFT_OFFSET_STYLE}
                />
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${property.name}-source`}
                  className="!w-3 !h-3 !bg-[rgb(var(--ec-card-bg))] !border-2 !border-[rgb(var(--ec-page-border))] !rounded-full !right-[-0px]"
                  style={HANDLE_RIGHT_OFFSET_STYLE}
                />
              </>
            )}

            <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                {isExpandable && (
                  <span
                    className="shrink-0 text-[rgb(var(--ec-page-text-muted))]"
                    aria-hidden="true"
                  >
                    {isExpanded ? (
                      <ChevronDownIcon className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRightIcon className="h-3.5 w-3.5" />
                    )}
                  </span>
                )}
                <span className="text-sm font-medium text-[rgb(var(--ec-page-text))] truncate">
                  {property.name}
                </span>
                {property.required && (
                  <span className="text-red-500 text-xs">*</span>
                )}
              </div>
              <span className="text-sm text-[rgb(var(--ec-page-text-muted))] font-mono shrink-0">
                {getPropertyTypeLabel(property)}
              </span>
            </div>

            {referencedEntityId && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full"
                  title={`References ${referencedEntityId}`}
                ></div>
              </div>
            )}

            {isHovered && property.description && (
              <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 z-[9999] w-[200px] bg-gray-900 text-white text-xs rounded-lg py-2 px-3 pointer-events-none shadow-xl max-w-xl opacity-100">
                <div className="text-gray-200 whitespace-normal break-words">
                  {property.description}
                </div>
                <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
              </div>
            )}
          </div>

          {isExpandable && isExpanded && (
            <div className="divide-y divide-[rgb(var(--ec-page-border))] border-t border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover)/0.18)]">
              {renderPropertyRows(nestedProperties, depth + 1, propertyPath)}
            </div>
          )}
        </div>
      );
    });

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div
          className={classNames(
            "bg-[rgb(var(--ec-card-bg))] border rounded-lg shadow-sm min-w-[200px]",
            externalToDomain ? "border-amber-500/60" : "border-blue-400/50",
          )}
        >
          {/* Table Header */}
          <div
            className={classNames(
              "relative px-4 py-2 rounded-t-lg border-b border-[rgb(var(--ec-page-border))]",
              externalToDomain ? "bg-amber-500/20" : "bg-blue-500/15",
            )}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={entityTargetHandle}
              className="!w-3 !h-3 !bg-[rgb(var(--ec-card-bg))] !border-2 !border-[rgb(var(--ec-page-border))] !rounded-full !left-[-0px]"
              style={HANDLE_LEFT_OFFSET_STYLE}
            />
            <div className="flex items-center gap-2 min-w-0">
              {Icon && (
                <Icon className="w-4 h-4 text-[rgb(var(--ec-page-text-muted))]" />
              )}
              <TruncatedResourceName
                value={name}
                tooltipBorderColor={externalToDomain ? "#f59e0b" : "#60a5fa"}
                className="font-semibold text-[rgb(var(--ec-page-text))] text-sm truncate"
              >
                {name}
              </TruncatedResourceName>
              {aggregateRoot && (
                <span className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium shrink-0">
                  AR
                </span>
              )}
            </div>
            {domainName && (
              <div className="text-xs text-[rgb(var(--ec-page-text-muted))] font-medium mt-1">
                from {domainName} domain
              </div>
            )}
            {mode === "full" && (
              <div className="text-xs text-[rgb(var(--ec-page-text-muted))] mt-1">
                v{version}
              </div>
            )}
          </div>

          {/* Properties Table */}
          {properties.length > 0 ? (
            <div className="divide-y divide-[rgb(var(--ec-page-border))] relative">
              {renderPropertyRows(properties)}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-[rgb(var(--ec-page-text-muted))] text-center">
              No properties defined
            </div>
          )}

          {/* Main node handles (if no properties) */}
          {properties.length === 0 && (
            <>
              {targetPosition && (
                <Handle type="target" position={targetPosition} />
              )}
              {sourcePosition && (
                <Handle type="source" position={sourcePosition} />
              )}
            </>
          )}
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal container={portalContainer}>
        <ContextMenu.Content
          className="min-w-[220px] bg-[rgb(var(--ec-card-bg))] rounded-md p-1 shadow-md border border-[rgb(var(--ec-page-border))]"
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenu.Item
            asChild
            className="text-sm text-[rgb(var(--ec-page-text))] px-2 py-1.5 outline-none cursor-pointer hover:bg-[rgb(var(--ec-accent-subtle))] rounded-sm flex items-center"
          >
            <a href={buildUrl(`/docs/entities/${entity.data.id}/${version}`)}>
              Read documentation
            </a>
          </ContextMenu.Item>
          <ContextMenu.Item
            asChild
            className="text-sm text-[rgb(var(--ec-page-text))] px-2 py-1.5 outline-none cursor-pointer hover:bg-[rgb(var(--ec-accent-subtle))] rounded-sm flex items-center"
          >
            <a
              href={buildUrl(
                `/visualiser/entities/${entity.data.id}/${version}`,
              )}
            >
              Focus node
            </a>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
});

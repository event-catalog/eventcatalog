import React, { useCallback, useEffect } from 'react';
import classes from './styles.module.css';
import { useSlots } from './useSlots';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';

// ----------------------------------------------------------------------------
// Context

const RootContext = React.createContext<{
  // We cache the expanded state of tree items so we can preserve the state
  // across remounts. This is necessary because we unmount tree items
  // when their parent is collapsed.
  expandedStateCache: React.RefObject<Map<string, boolean> | null>;
}>({
  expandedStateCache: { current: new Map() },
});

const ItemContext = React.createContext<{
  level: number;
  isExpanded: boolean;
}>({
  level: 1,
  isExpanded: false,
});

// ----------------------------------------------------------------------------
// TreeView

export type TreeViewProps = {
  'aria-label'?: React.AriaAttributes['aria-label'];
  'aria-labelledby'?: React.AriaAttributes['aria-labelledby'];
  children: React.ReactNode;
  flat?: boolean;
  truncate?: boolean;
  style?: React.CSSProperties;
};

/* Size of toggle icon in pixels. */
const TOGGLE_ICON_SIZE = 12;

const Root: React.FC<TreeViewProps> = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  children,
  flat,
  truncate = true,
  style,
}) => {
  const containerRef = React.useRef<HTMLUListElement>(null);
  const mouseDownRef = React.useRef<boolean>(false);

  const onMouseDown = useCallback(() => {
    mouseDownRef.current = true;
  }, []);

  useEffect(() => {
    function onMouseUp() {
      mouseDownRef.current = false;
    }
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const expandedStateCache = React.useRef<Map<string, boolean> | null>(null);

  if (expandedStateCache.current === null) {
    expandedStateCache.current = new Map();
  }

  return (
    <RootContext.Provider
      value={{
        expandedStateCache,
      }}
    >
      <ul
        ref={containerRef}
        role="tree"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        data-omit-spacer={flat}
        data-truncate-text={truncate || false}
        onMouseDown={onMouseDown}
        className={classes.TreeViewRootUlStyles}
        style={style}
      >
        {children}
      </ul>
    </RootContext.Provider>
  );
};

Root.displayName = 'TreeView';

// ----------------------------------------------------------------------------
// TreeView.Item

export type TreeViewItemProps = {
  id: string;
  children: React.ReactNode;
  current?: boolean;
  defaultExpanded?: boolean;
  onSelect?: (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void;
};

const Item = React.forwardRef<HTMLElement, TreeViewItemProps>(
  ({ id: itemId, current: isCurrentItem = false, defaultExpanded, onSelect, children }, ref) => {
    const [slots, rest] = useSlots(children, {
      leadingVisual: LeadingVisual,
    });
    const { expandedStateCache } = React.useContext(RootContext);

    const [isExpanded, setIsExpanded] = React.useState(
      expandedStateCache.current?.get(itemId) ?? defaultExpanded ?? isCurrentItem
    );
    const { level } = React.useContext(ItemContext);
    const { hasSubTree, subTree, childrenWithoutSubTree } = useSubTree(rest);
    const [isFocused, setIsFocused] = React.useState(false);

    // Set the expanded state and cache it
    const setIsExpandedWithCache = React.useCallback(
      (newIsExpanded: boolean) => {
        setIsExpanded(newIsExpanded);
        expandedStateCache.current?.set(itemId, newIsExpanded);
      },
      [itemId, setIsExpanded, expandedStateCache]
    );

    // Expand or collapse the subtree
    const toggle = React.useCallback(
      (event?: React.MouseEvent | React.KeyboardEvent) => {
        setIsExpandedWithCache(!isExpanded);
        event?.stopPropagation();
      },
      [isExpanded, setIsExpandedWithCache]
    );

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLElement>) => {
        switch (event.key) {
          case 'Enter':
          case ' ':
            if (onSelect) {
              onSelect(event);
            } else {
              toggle(event);
            }
            event.stopPropagation();
            break;
          case 'ArrowRight':
            // Ignore if modifier keys are pressed
            if (event.altKey || event.metaKey) return;
            event.preventDefault();
            event.stopPropagation();
            setIsExpandedWithCache(true);
            break;
          case 'ArrowLeft':
            // Ignore if modifier keys are pressed
            if (event.altKey || event.metaKey) return;
            event.preventDefault();
            event.stopPropagation();
            setIsExpandedWithCache(false);
            break;
        }
      },
      [onSelect, setIsExpandedWithCache, toggle]
    );

    return (
      <ItemContext.Provider
        value={{
          level: level + 1,
          isExpanded,
        }}
      >
        <li
          className={classes.TreeViewItem}
          ref={ref as React.ForwardedRef<HTMLLIElement>}
          tabIndex={0}
          id={itemId}
          role="treeitem"
          aria-level={level}
          aria-expanded={isExpanded}
          aria-current={isCurrentItem ? 'true' : undefined}
          aria-selected={isFocused ? 'true' : 'false'}
          onKeyDown={handleKeyDown}
          onFocus={(event) => {
            // Scroll the first child into view when the item receives focus
            event.currentTarget.firstElementChild?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

            // Set the focused state
            setIsFocused(true);

            // Prevent focus event from bubbling up to parent items
            event.stopPropagation();
          }}
          onBlur={() => setIsFocused(false)}
          onClick={(event) => {
            if (onSelect) {
              onSelect(event);
              // if has children open them too
              if (hasSubTree) {
                toggle(event);
              }
            } else {
              toggle(event);
            }
            event.stopPropagation();
          }}
          onAuxClick={(event) => {
            if (onSelect && event.button === 1) {
              onSelect(event);
            }
            event.stopPropagation();
          }}
        >
          <div
            className={classes.TreeViewItemContainer}
            style={{
              // @ts-ignore CSS custom property
              '--level': level,
            }}
          >
            <div style={{ gridArea: 'spacer', display: 'flex' }}>{/* <LevelIndicatorLines level={level} /> */}</div>

            <div className={classes.TreeViewItemContent}>
              {slots.leadingVisual}
              <span className={classes.TreeViewItemContentText}>{childrenWithoutSubTree}</span>
            </div>
            {hasSubTree ? (
              <div
                className={[classes.TreeViewItemToggle, classes.TreeViewItemToggleHover, classes.TreeViewItemToggleEnd].join(' ')}
                onClick={(event) => {
                  if (onSelect) {
                    toggle(event);
                  }
                }}
              >
                {isExpanded ? <ChevronDownIcon size={TOGGLE_ICON_SIZE} /> : <ChevronRightIcon size={TOGGLE_ICON_SIZE} />}
              </div>
            ) : null}
          </div>
          {subTree}
        </li>
      </ItemContext.Provider>
    );
  }
);

Item.displayName = 'TreeView.Item';

// ----------------------------------------------------------------------------
// TreeView.SubTree

export type TreeViewSubTreeProps = {
  children?: React.ReactNode;
};

const SubTree: React.FC<TreeViewSubTreeProps> = ({ children }) => {
  const { isExpanded } = React.useContext(ItemContext);
  const ref = React.useRef<HTMLUListElement>(null);

  if (!isExpanded) {
    return null;
  }

  return (
    <ul
      role="group"
      style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
      }}
      ref={ref}
    >
      {children}
    </ul>
  );
};

SubTree.displayName = 'TreeView.SubTree';

function useSubTree(children: React.ReactNode) {
  return React.useMemo(() => {
    const subTree = React.Children.toArray(children).find((child) => React.isValidElement(child) && child.type === SubTree);

    const childrenWithoutSubTree = React.Children.toArray(children).filter(
      (child) => !(React.isValidElement(child) && child.type === SubTree)
    );

    return {
      subTree,
      childrenWithoutSubTree,
      hasSubTree: Boolean(subTree),
    };
  }, [children]);
}

// ----------------------------------------------------------------------------
// TreeView.LeadingVisual

export type TreeViewLeadingVisualProps = {
  children: React.ReactNode | ((props: { isExpanded: boolean }) => React.ReactNode);
};

const LeadingVisual: React.FC<TreeViewLeadingVisualProps> = (props) => {
  const { isExpanded } = React.useContext(ItemContext);
  const children = typeof props.children === 'function' ? props.children({ isExpanded }) : props.children;
  return (
    <div className={classes.TreeViewItemVisual} aria-hidden={true}>
      {children}
    </div>
  );
};

LeadingVisual.displayName = 'TreeView.LeadingVisual';

// ----------------------------------------------------------------------------
// Export

export const TreeView = Object.assign(Root, {
  Item,
  SubTree,
  LeadingVisual,
});

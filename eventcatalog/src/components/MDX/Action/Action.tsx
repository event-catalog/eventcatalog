import { useState, useId } from 'react';
import { useStore } from '@nanostores/react';
import {
  PlayIcon,
  BellIcon,
  CheckIcon,
  BoltIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  CogIcon,
  RocketLaunchIcon,
  BeakerIcon,
  CloudArrowUpIcon,
  CommandLineIcon,
  CursorArrowRaysIcon,
  XCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  actionStates,
  startAction,
  completeAction,
  failAction,
  resetAction,
  openResultModal,
  showSuccessToast,
  showErrorToast,
} from '@stores/action-store';
import type {
  ActionContext,
  ActionIconName,
  ActionVariant,
  ResultDisplay,
  ActionExecuteResponse,
} from '@enterprise/actions/action-types';

// Map icon names to Heroicon components
const iconMap: Record<ActionIconName, React.ComponentType<{ className?: string }>> = {
  play: PlayIcon,
  bell: BellIcon,
  check: CheckIcon,
  bolt: BoltIcon,
  'paper-airplane': PaperAirplaneIcon,
  'arrow-path': ArrowPathIcon,
  cog: CogIcon,
  'rocket-launch': RocketLaunchIcon,
  beaker: BeakerIcon,
  'cloud-arrow-up': CloudArrowUpIcon,
  'command-line': CommandLineIcon,
  'cursor-arrow-rays': CursorArrowRaysIcon,
};

// Get variant classes for button styling
const getVariantClasses = (variant: ActionVariant, isDisabled: boolean): string => {
  if (isDisabled) {
    return 'bg-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))] cursor-not-allowed';
  }

  switch (variant) {
    case 'primary':
      return 'bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))] hover:opacity-90 focus:ring-[rgb(var(--ec-accent))]';
    case 'secondary':
      return 'bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] border border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-accent-subtle))] focus:ring-[rgb(var(--ec-accent))]';
    case 'danger':
      return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
    default:
      return 'bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))] hover:opacity-90 focus:ring-[rgb(var(--ec-accent))]';
  }
};

export interface ActionProps {
  name: string;
  label?: string;
  input?: Record<string, unknown>;
  context: ActionContext;
  // From action metadata (passed from Astro)
  actionLabel?: string;
  actionIcon?: ActionIconName;
  actionVariant?: ActionVariant;
  actionResultDisplay?: ResultDisplay;
  actionsEnabled?: boolean;
}

export default function Action({
  name,
  label,
  input,
  context,
  actionLabel,
  actionIcon = 'play',
  actionVariant = 'primary',
  actionResultDisplay = 'modal',
  actionsEnabled = true,
}: ActionProps) {
  const instanceId = useId();
  const states = useStore(actionStates);
  const state = states[instanceId] || { status: 'idle', result: null, error: null };
  const [showInlineSuccess, setShowInlineSuccess] = useState(false);

  const displayLabel = label || actionLabel || name;
  const IconComponent = iconMap[actionIcon] || PlayIcon;

  const handleClick = async () => {
    if (state.status === 'loading' || !actionsEnabled) return;

    startAction(instanceId);

    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context,
          input,
        }),
      });

      const result: ActionExecuteResponse = await response.json();

      if (result.success) {
        completeAction(instanceId, result);

        // Show result based on display preference
        if (actionResultDisplay === 'modal') {
          openResultModal(displayLabel, result);
        } else {
          showSuccessToast(result.message || 'Action completed successfully');
          // Show brief inline success state
          setShowInlineSuccess(true);
          setTimeout(() => {
            setShowInlineSuccess(false);
            resetAction(instanceId);
          }, 2000);
        }
      } else {
        failAction(instanceId, result.error || 'Action failed');

        if (actionResultDisplay === 'modal') {
          openResultModal(displayLabel, result);
        } else {
          showErrorToast(result.error || 'Action failed');
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to execute action';
      failAction(instanceId, errorMessage);

      if (actionResultDisplay === 'modal') {
        openResultModal(displayLabel, {
          success: false,
          error: errorMessage,
        });
      } else {
        showErrorToast(errorMessage);
      }
    }
  };

  const isLoading = state.status === 'loading';
  const isSuccess = state.status === 'success' || showInlineSuccess;
  const isError = state.status === 'error';

  // Render status icon
  const renderStatusIcon = () => {
    if (isLoading) {
      return (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      );
    }

    if (isSuccess && actionResultDisplay === 'toast') {
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
    }

    if (isError && actionResultDisplay === 'toast') {
      return <XCircleIcon className="h-4 w-4 text-red-500" />;
    }

    return <IconComponent className="h-4 w-4" />;
  };

  if (!actionsEnabled) {
    return (
      <button
        disabled
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${getVariantClasses(actionVariant, true)}`}
        title="Actions are not enabled for this catalog"
      >
        <IconComponent className="h-4 w-4" />
        <span>{displayLabel}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${getVariantClasses(actionVariant, isLoading)}`}
    >
      {renderStatusIcon()}
      <span>{isLoading ? 'Running...' : displayLabel}</span>
    </button>
  );
}

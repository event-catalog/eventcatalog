import { ArrowUpRight, Check } from 'lucide-react';
import { Row, cn } from './Row';
import { PRICING_URL } from './SettingsShared';

export type PlanId = 'community' | 'starter' | 'scale' | 'enterprise';

interface Props {
  currentPlan: PlanId;
}

interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  price: string;
  priceSuffix?: string;
  audience: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  /** Visual accent applied to selected/featured cards. */
  accent?: 'default' | 'highlight';
}

const PLANS: Plan[] = [
  {
    id: 'community',
    name: 'Community',
    tagline: 'Open source. Self-hosted.',
    price: 'Free',
    audience: 'For individuals and open source projects.',
    features: [
      'Document domains, services, events, commands and queries',
      'Visualize your architecture',
      'Public schema fetch & sync',
      'Schema Explorer (Basic)',
      'Owners, versioning, and flows',
      'Community support (Discord)',
    ],
    ctaLabel: 'Get started',
    ctaHref: PRICING_URL,
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For teams customising and scaling.',
    price: '$199',
    priceSuffix: '/month',
    audience: 'Up to 20 active users.',
    features: [
      'Everything in Community',
      'Custom landing page',
      'Bring your own documentation',
      'Embed Miro, IcePanel, Lucid, DrawIO, FigJam',
      'EventCatalog Assistant',
      'Remove EventCatalog branding',
      'Custom themes',
      'Email support',
    ],
    ctaLabel: 'Try Starter for 14 days',
    ctaHref: 'https://eventcatalog.cloud',
  },
  {
    id: 'scale',
    name: 'Scale',
    tagline: 'For platform teams managing multiple catalogs.',
    price: '$399',
    priceSuffix: '/month',
    audience: 'Up to 50 active users.',
    accent: 'highlight',
    features: [
      'Everything in Starter',
      'Field Intelligence',
      'Resource-level documentation',
      'EventCatalog MCP server',
      'Architecture Change Detection',
      'Private schema fetch & sync',
      'GitHub authentication',
      'Federate up to 3 catalogs',
      'Custom tools for AI Assistant',
      'Slack bot integration',
    ],
    ctaLabel: 'Try Scale for 14 days',
    ctaHref: 'https://eventcatalog.cloud',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For complex systems and regulated environments.',
    price: 'Contact us',
    audience: 'Unlimited users, all integrations included.',
    features: [
      'Everything in Scale',
      'Unlimited users',
      'Unlimited integrations',
      'SSO & SAML',
      'Advanced governance & audit logging',
      'Migration & onboarding support',
      'Dedicated account manager',
    ],
    ctaLabel: 'Schedule a call',
    ctaHref: 'mailto:hello@eventcatalog.dev?subject=Enterprise%20Plan%20Enquiry',
  },
];

const PLAN_LABELS: Record<PlanId, string> = {
  community: 'Community',
  starter: 'Starter',
  scale: 'Scale',
  enterprise: 'Enterprise',
};

const PLAN_RANK: Record<PlanId, number> = {
  community: 0,
  starter: 1,
  scale: 2,
  enterprise: 3,
};

export const BillingSettingsForm = ({ currentPlan }: Props) => {
  const isPaid = currentPlan === 'starter' || currentPlan === 'scale' || currentPlan === 'enterprise';
  const upgradable = currentPlan !== 'enterprise';
  // Show the current plan and any tier above it. Hides plans the user has already passed.
  const visiblePlans = PLANS.filter((plan) => PLAN_RANK[plan.id] >= PLAN_RANK[currentPlan]);
  const gridCols =
    visiblePlans.length === 1 ? 'grid-cols-1' : visiblePlans.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="divide-y divide-[rgb(var(--ec-page-border))]">
      <Row
        title="Billing plan"
        description="View and manage your billing plan. Upgrade unlocks the AI assistant, MCP server, and other Scale-only features."
        canEdit={false}
        dirty={false}
      >
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-input-bg,var(--ec-page-bg)))] px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] text-[rgb(var(--ec-page-text))]">
            <span className="text-[rgb(var(--ec-page-text-muted))]">Current plan:</span>
            <span className="font-semibold">{PLAN_LABELS[currentPlan]}</span>
            {isPaid && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                Active
              </span>
            )}
          </div>
          <div className="ml-auto">
            {upgradable ? (
              <a
                href={PRICING_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-[rgb(var(--ec-page-text))] px-3 py-1.5 text-[12px] font-semibold text-[rgb(var(--ec-page-bg))] transition-opacity hover:opacity-90"
              >
                Upgrade
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </a>
            ) : (
              <a
                href={PRICING_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] px-3 py-1.5 text-[12px] font-medium text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-page-bg)/0.78)]"
              >
                Manage billing
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </a>
            )}
          </div>
        </div>
      </Row>

      <Row
        title={upgradable ? 'Upgrade' : 'Your plan'}
        description={
          upgradable
            ? 'Plans available to upgrade to. Pricing shown in USD; visit our website for EUR pricing and the full feature comparison.'
            : 'You are on our highest tier. Visit the website for the full feature comparison.'
        }
        canEdit={false}
        dirty={false}
      >
        <div className={cn('grid grid-cols-1 gap-3', gridCols)}>
          {visiblePlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} isCurrent={plan.id === currentPlan} />
          ))}
        </div>
        <p className="mt-4 text-[12px] text-[rgb(var(--ec-page-text-muted))]">
          Prices update with annual billing.{' '}
          <a href={PRICING_URL} target="_blank" rel="noreferrer" className="text-[rgb(var(--ec-accent))] hover:underline">
            See full plan comparison →
          </a>
        </p>
      </Row>
    </div>
  );
};

interface PlanCardProps {
  plan: Plan;
  isCurrent: boolean;
}

const PlanCard = ({ plan, isCurrent }: PlanCardProps) => (
  <div
    className={cn(
      'flex flex-col rounded-xl border p-5 transition-colors',
      isCurrent
        ? 'border-[rgb(var(--ec-accent)/0.5)] bg-[rgb(var(--ec-accent-subtle)/0.4)]'
        : plan.accent === 'highlight'
          ? 'border-[rgb(var(--ec-page-text)/0.25)] bg-[rgb(var(--ec-input-bg,var(--ec-page-bg)))]'
          : 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-input-bg,var(--ec-page-bg)))]'
    )}
  >
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-[13px] font-semibold text-[rgb(var(--ec-page-text))]">{plan.name}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">{plan.tagline}</p>
      </div>
      {isCurrent && (
        <span className="rounded-full border border-[rgb(var(--ec-accent)/0.4)] bg-[rgb(var(--ec-accent-subtle))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--ec-accent-text))]">
          Current
        </span>
      )}
      {!isCurrent && plan.accent === 'highlight' && (
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
          Popular
        </span>
      )}
    </div>

    <div className="mt-4">
      <span className="text-[24px] font-semibold leading-none tracking-tight text-[rgb(var(--ec-page-text))]">{plan.price}</span>
      {plan.priceSuffix && <span className="ml-1 text-[12px] text-[rgb(var(--ec-page-text-muted))]">{plan.priceSuffix}</span>}
      <p className="mt-1 text-[11px] text-[rgb(var(--ec-page-text-muted))]">{plan.audience}</p>
    </div>

    <a
      href={plan.ctaHref}
      target="_blank"
      rel="noreferrer"
      aria-disabled={isCurrent}
      onClick={isCurrent ? (e) => e.preventDefault() : undefined}
      className={cn(
        'mt-4 inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
        isCurrent
          ? 'pointer-events-none cursor-default border border-[rgb(var(--ec-page-border))] bg-transparent text-[rgb(var(--ec-page-text-muted))]'
          : plan.accent === 'highlight'
            ? 'bg-[rgb(var(--ec-page-text))] text-[rgb(var(--ec-page-bg))] hover:opacity-90'
            : 'border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-page-bg)/0.78)]'
      )}
    >
      {isCurrent ? 'Current plan' : plan.ctaLabel}
      {!isCurrent && <ArrowUpRight className="h-3 w-3" aria-hidden />}
    </a>

    <ul className="mt-5 space-y-1.5">
      {plan.features.map((feature) => (
        <li key={feature} className="flex items-start gap-2 text-[12px] leading-snug text-[rgb(var(--ec-page-text))]">
          <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-[rgb(var(--ec-page-text-muted))]" aria-hidden />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  </div>
);

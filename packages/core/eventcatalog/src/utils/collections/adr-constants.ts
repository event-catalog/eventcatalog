export const ADR_STATUS = {
  PROPOSED: 'proposed',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  DEPRECATED: 'deprecated',
  SUPERSEDED: 'superseded',
} as const;

export const ADR_STATUS_VALUES = [
  ADR_STATUS.PROPOSED,
  ADR_STATUS.ACCEPTED,
  ADR_STATUS.REJECTED,
  ADR_STATUS.DEPRECATED,
  ADR_STATUS.SUPERSEDED,
] as const;

export type AdrStatus = (typeof ADR_STATUS)[keyof typeof ADR_STATUS];

export const adrStatusBadgeColor: Record<AdrStatus, string> = {
  [ADR_STATUS.PROPOSED]: 'amber',
  [ADR_STATUS.ACCEPTED]: 'green',
  [ADR_STATUS.REJECTED]: 'red',
  [ADR_STATUS.DEPRECATED]: 'gray',
  [ADR_STATUS.SUPERSEDED]: 'purple',
};

export const isAdrCollection = (collection: string | undefined): collection is 'adrs' => collection === 'adrs';

export const hasAdrStatus = (adr: { data?: { status?: string } }, status: AdrStatus) => adr.data?.status === status;

export const isDeprecatedAdr = (adr: { data?: { status?: string } }) => hasAdrStatus(adr, ADR_STATUS.DEPRECATED);

export const isSupersededAdr = (adr: { data?: { status?: string } }) => hasAdrStatus(adr, ADR_STATUS.SUPERSEDED);

export const formatAdrStatus = (status: AdrStatus) =>
  status
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const formatAdrDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);

export const createAdrStatusBadge = (status: AdrStatus) => ({
  content: formatAdrStatus(status),
  backgroundColor: adrStatusBadgeColor[status],
  textColor: adrStatusBadgeColor[status],
});

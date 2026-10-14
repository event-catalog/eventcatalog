/**
 * The sentences on the "New version found" banner (components/NewVersionBanner.astro), shown on a previous version of a
 * page. Each ends with the space before what follows it (the name, then the version), so the markup can't lose it.
 */
export const getVersionBannerText = ({ subject, latestOf }: { subject: string; latestOf: string }) => ({
  /** Followed by the name of what this page is a version of, e.g. "...of the query " Get Orders */
  previous: `You are looking at a previous version of the ${subject} `,
  /** Followed by the latest version, e.g. "...of this query is " v2.0.0 */
  latest: `The latest version of this ${latestOf} is `,
});

// manually setting this value to true is against the rules and licenses of the open source project
// WARNING: Setting this value manually to true without a valid license is against the terms of use.
// If you require EventCatalog Pro features, please visit https://www.eventcatalog.dev/pricing
// to purchase a license. Unauthorized use may violate the project's license agreement.
export const isEventCatalogProEnabled = () => process.env.EVENTCATALOG_PRO === 'true';

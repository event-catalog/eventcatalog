// Global rule: a confidential or regulated data store must be written to by a single service, which owns that data.
// Uses a custom property of the data store (classification) to decide which stores the rule applies to.
import { defineFitnessFunction } from '@eventcatalog/fitness';

const SENSITIVE = ['confidential', 'regulated'];

export default defineFitnessFunction({
  id: 'confidential-data-has-one-writer',
  name: 'Confidential data has a single writer',
  description: 'Sensitive data is easier to protect and audit when only one service can change it.',

  async run({ catalog }) {
    const dataStores = (await catalog.getDataStores({ latestOnly: true })) ?? [];
    const services = (await catalog.getServices({ latestOnly: true })) ?? [];

    return dataStores
      .filter((dataStore) => SENSITIVE.includes(String(dataStore.classification)))
      .map((dataStore) => ({
        dataStore,
        writers: services.filter((service) => service.writesTo?.some((pointer) => pointer.id === dataStore.id)),
      }))
      .filter(({ writers }) => writers.length > 1)
      .map(({ dataStore, writers }) => ({
        message: `${dataStore.name} (${dataStore.classification}) is written to by ${writers.length} services: ${writers.map((service) => service.name).join(', ')}`,
        resources: [
          { type: 'dataStore', id: dataStore.id, version: dataStore.version },
          ...writers.map((service) => ({ type: 'service', id: service.id, version: service.version })),
        ],
        suggestion: 'Choose one service to own writes, and have the others ask it to make changes.',
      }));
  },
});

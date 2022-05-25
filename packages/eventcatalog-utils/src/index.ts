import fs from 'fs-extra';
import path from 'path';

import { FunctionInitInterface } from './types';
import {
  writeEventToCatalog,
  getAllEventsFromCatalog,
  buildEventMarkdownForCatalog,
  getEventFromCatalog,
  versionEvent,
} from './events';
import {
  writeServiceToCatalog,
  buildServiceMarkdownForCatalog,
  getAllServicesFromCatalog,
  getServiceFromCatalog,
} from './services';
import { getDomainFromCatalog, writeDomainToCatalog, buildDomainMarkdownForCatalog } from './domains';

interface ExistsInCatalogInterface {
  type: 'service' | 'event';
}

export const existsInCatalog =
  ({ catalogDirectory }: FunctionInitInterface) =>
  (name: string, options: ExistsInCatalogInterface) => {
    const { type } = options;
    const folder = `${type}s`;
    return fs.existsSync(path.join(catalogDirectory, folder, name));
  };

const utils = ({ catalogDirectory }: FunctionInitInterface) => ({
  // event funcs
  writeEventToCatalog: writeEventToCatalog({ catalogDirectory }),
  getEventFromCatalog: getEventFromCatalog({ catalogDirectory }),
  buildEventMarkdownForCatalog: buildEventMarkdownForCatalog(),
  getAllEventsFromCatalog: getAllEventsFromCatalog({ catalogDirectory }),
  versionEvent: versionEvent({ catalogDirectory }),

  // service funcs
  writeServiceToCatalog: writeServiceToCatalog({ catalogDirectory }),
  buildServiceMarkdownForCatalog: buildServiceMarkdownForCatalog(),
  getServiceFromCatalog: getServiceFromCatalog({ catalogDirectory }),
  getAllServicesFromCatalog: getAllServicesFromCatalog({ catalogDirectory }),

  // domain funcs
  getDomainFromCatalog: getDomainFromCatalog({ catalogDirectory }),
  writeDomainToCatalog: writeDomainToCatalog({ catalogDirectory }),
  buildDomainMarkdownForCatalog: buildDomainMarkdownForCatalog(),

  // generic
  existsInCatalog: existsInCatalog({ catalogDirectory }),
});

export default utils;

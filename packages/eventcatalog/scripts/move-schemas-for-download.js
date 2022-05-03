const path = require('path');
const fs = require('fs');

const getAllEventsAndSchemaPaths = (directory) => {
  const folders = fs.readdirSync(directory);
  return folders.map((folder) => {
    const allFilesInEventFolder = fs.readdirSync(path.join(directory, folder));
    const schemaFileName = allFilesInEventFolder.find((fileName) => fileName.includes('schema'));
    const eventHasVersions = !!allFilesInEventFolder.find((fileName) => fileName.includes('versioned'));
    let versions = [];

    if (eventHasVersions) {
      versions = getAllEventsAndSchemaPaths(path.join(directory, folder, 'versioned'));
    }

    return {
      name: folder,
      schemaFileName,
      schemaContent: schemaFileName ? fs.readFileSync(path.join(directory, folder, schemaFileName), 'utf-8') : null,
      versions,
    };
  });
};

const parseEventDirectory = (publicSchemaDir, eventsDir) => {
  const eventsWithSchemaPaths = getAllEventsAndSchemaPaths(eventsDir);
  const eventsWithSchemas = eventsWithSchemaPaths.filter((event) => !!event.schemaContent);

  eventsWithSchemas.forEach((event) => {
    const eventDir = path.join(publicSchemaDir, event.name);

    if (!fs.existsSync(eventDir)) {
      fs.mkdirSync(eventDir);
    }

    const eventVersions = event.versions;
    const versionsWithSchemas = eventVersions.filter((version) => !!version.schemaContent);

    versionsWithSchemas.forEach((version) => {
      const versionDir = path.join(eventDir, version.name);
      if (!fs.existsSync(versionDir)) {
        fs.mkdirSync(versionDir);
      }
      fs.writeFileSync(path.join(versionDir, version.schemaFileName), version.schemaContent);
    });

    fs.writeFileSync(path.join(eventDir, event.schemaFileName), event.schemaContent);
  });
};

const main = async () => {
  const publicDir = path.join(__dirname, '../public');
  const publicSchemaDir = path.join(publicDir, 'schemas');

  const eventsWithoutDomainsDir = path.join(process.env.PROJECT_DIR, 'events');
  const domainsDir = path.join(process.env.PROJECT_DIR, 'domains');

  if (fs.existsSync(publicSchemaDir)) {
    fs.rmSync(publicSchemaDir, { recursive: true, force: true });
  }

  fs.mkdirSync(publicSchemaDir);

  if (fs.existsSync(domainsDir)) {
    // Write all events within domains
    const domains = fs.readdirSync(domainsDir);
    domains.forEach((domain) => {
      if (fs.existsSync(path.join(domainsDir, domain, 'events'))) {
        parseEventDirectory(publicSchemaDir, path.join(domainsDir, domain, 'events'));
      }
    });
  }

  if (fs.existsSync(eventsWithoutDomainsDir)) {
    // just parse the events directory (without domains)
    parseEventDirectory(publicSchemaDir, eventsWithoutDomainsDir);
  }
};

main();

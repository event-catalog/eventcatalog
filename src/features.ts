import boxen from 'boxen';

type LicenseResponse = {
  is_trial: boolean;
  plugin: string;
  state: string;
};

// Checks to see if the backstage feature is enabled (or not)
export const isBackstagePluginEnabled = async (licenseKey?: string) => {
  const LICENSE_KEY = process.env.EVENTCATALOG_LICENSE_KEY_BACKSTAGE || null;

  // no license key, so it's not enabled
  if (!LICENSE_KEY) {
    return false;
  }

  // Verify the license key
  const response = await fetch('https://api.eventcatalog.cloud/functions/v1/license', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LICENSE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status !== 200) {
    console.log(
      '\nTried to verify your backstage license but it is not valid. Please check your license key or purchase a license at https://eventcatalog.cloud/\n'
    );
    return false;
  }

  if (response.status === 200) {
    const data = (await response.json()) as LicenseResponse;

    if ('@eventcatalog/backstage-plugin-eventcatalog' !== data.plugin) {
      console.log(
        '\nInvalid license key for backstage integration, please check your license key or purchase a license at https://eventcatalog.cloud/\n'
      );
      return false;
    }

    let message = 'Backstage integration is enabled for EventCatalog';

    if (data.is_trial) {
      message += '\nYou are using a trial license for backstage integration.';
    }

    console.log(
      boxen(message, {
        padding: 1,
        margin: 1,
        borderColor: 'green',
        title: '@eventcatalog/backstage-plugin-eventcatalog',
        titleAlignment: 'center',
      })
    );
  }

  return true;
};

export const isEventCatalogProEnabled = async (licenseKey?: string) => {
  const LICENSE_KEY = process.env.EVENTCATALOG_PRO_LICENSE_KEY || null;

  console.log('LICENSE_KEY', LICENSE_KEY);

  if (!LICENSE_KEY) {
    return false;
  }

  // Verify the license key
  const response = await fetch('https://api.eventcatalog.cloud/functions/v1/license', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LICENSE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status !== 200) {
    console.log(
      '\nTried to verify your EventCatalog Pro license but it is not valid. Please check your license key or purchase a license at https://eventcatalog.cloud/\n'
    );
    return false;
  }

  if (response.status === 200) {
    const data = (await response.json()) as LicenseResponse;

    if ('@eventcatalog/eventcatalog-pro' !== data.plugin) {
      console.log(
        '\nInvalid license key for EventCatalog Pro, please check your license key or purchase a license at https://eventcatalog.cloud/\n'
      );
      return false;
    }

    let message = 'EventCatalog Pro is enabled for EventCatalog';

    if (data.is_trial) {
      message += '\nYou are using a trial license for EventCatalog Pro.';
    }

    console.log(
      boxen(message, {
        padding: 1,
        margin: 1,
        borderColor: 'green',
        title: '@eventcatalog/eventcatalog-pro',
        titleAlignment: 'center',
      })
    );
  }

  return true;
};

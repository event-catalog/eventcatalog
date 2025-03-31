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

export const isEventCatalogScaleEnabled = async (licenseKey?: string) => {
  const LICENSE_KEY = process.env.EVENTCATALOG_SCALE_LICENSE_KEY || null;

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
      '\nTried to verify your EventCatalog Scale plan, but your license key is not valid. Please check your license key or purchase a license at https://eventcatalog.cloud/\n'
    );
    return false;
  }

  if (response.status === 200) {
    const data = (await response.json()) as LicenseResponse;

    if ('@eventcatalog/eventcatalog-scale' !== data.plugin) {
      console.log(
        '\nInvalid license key for EventCatalog Scale plan, please check your license key or purchase a license at https://eventcatalog.cloud/\n'
      );
      return false;
    }

    let message = 'EventCatalog Scale plan is enabled for EventCatalog';

    if (data.is_trial) {
      message += '\nYou are using a trial license for EventCatalog Scale plan.';
    }

    console.log(
      boxen(message, {
        padding: 1,
        margin: 1,
        borderColor: 'green',
        title: '@eventcatalog/eventcatalog-scale',
        titleAlignment: 'center',
      })
    );
  }

  return true;
};
export const isEventCatalogStarterEnabled = async (licenseKey?: string) => {
  const LICENSE_KEY = process.env.EVENTCATALOG_STARTER_LICENSE_KEY || null;

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
      '\nTried to verify your EventCatalog Starter plan, but your license key is not valid. Please check your license key or purchase a license at https://eventcatalog.cloud/\n'
    );
    return false;
  }

  if (response.status === 200) {
    const data = (await response.json()) as LicenseResponse;

    if ('@eventcatalog/eventcatalog-starter' !== data.plugin) {
      console.log(
        '\nInvalid license key for EventCatalog Starter plan, please check your license key or purchase a license at https://eventcatalog.cloud/\n'
      );
      return false;
    }

    let message = 'EventCatalog Starter plan is enabled for EventCatalog';

    if (data.is_trial) {
      message += '\nYou are using a trial license for EventCatalog Starter Plan.';
    }

    console.log(
      boxen(message, {
        padding: 1,
        margin: 1,
        borderColor: 'green',
        title: '@eventcatalog/eventcatalog-starter',
        titleAlignment: 'center',
      })
    );
  }

  return true;
};

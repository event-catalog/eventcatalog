import type { Example } from './types';

export const example: Example = {
  name: 'Channel Routing',
  group: 'Architecture Patterns',
  description: 'IoT pipeline with channel-to-channel routing (Kafka \u2192 Kafka \u2192 MQTT)',
  source: {
    'main.ec': `visualizer main {
  name "IoT Sensor Pipeline"
  legend true

  channel SensorIngestion {
    version 1.0.0
    address "sensors.raw"
    protocol "Kafka"
    summary "Raw sensor data ingestion topic"
    route SensorFiltered
  }

  channel SensorFiltered {
    version 1.0.0
    address "sensors.filtered"
    protocol "Kafka"
    summary "Filtered and validated sensor data"
    route DeviceCommands
  }

  channel DeviceCommands {
    version 1.0.0
    address "devices/+/commands"
    protocol "MQTT"
    summary "MQTT topic for device command delivery"
  }

  service SensorGateway {
    version 1.0.0
    summary "Ingests raw sensor readings from IoT devices"

    sends event SensorReading to SensorIngestion {
      version 1.0.0
      summary "Raw sensor reading from a device"
    }

    sends event DeviceHeartbeat to SensorIngestion {
      version 1.0.0
      summary "Periodic device health check"
    }
  }

  service FilterService {
    version 1.0.0
    summary "Validates and filters raw sensor data"

    receives event SensorReading from SensorIngestion
    receives event DeviceHeartbeat from SensorIngestion

    sends event SensorReading to SensorFiltered
    sends event DeviceAlert to SensorFiltered {
      version 1.0.0
      summary "Alert when device readings are anomalous"
    }
  }

  service DeviceBridge {
    version 1.0.0
    summary "Bridges Kafka events to MQTT for device delivery"

    receives event DeviceAlert from SensorFiltered

    sends command RecalibrateDevice to DeviceCommands {
      version 1.0.0
      summary "Instructs a device to recalibrate its sensors"
    }
  }

  service DashboardService {
    version 1.0.0
    summary "Real-time monitoring dashboard"

    receives event SensorReading from SensorFiltered
    receives event DeviceAlert from SensorFiltered
  }
}
`,
  },
};

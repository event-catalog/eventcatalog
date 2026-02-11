import { Server, Radio, Wifi, Network, Globe } from "lucide-react";

// Map protocol names to Lucide icons
const protocolIconMap: { [key: string]: any } = {
  http: Server,
  https: Server,
  ws: Radio,
  wss: Radio,
  websocket: Radio,
  mqtt: Wifi,
  amqp: Network,
  kafka: Network,
  rabbitmq: Network,
  redis: Network,
  grpc: Globe,
  graphql: Globe,
};

export const getIconForProtocol = (protocol: string) => {
  if (!protocol) return Server;
  const normalizedProtocol = protocol.replace("-", "").toLowerCase();
  return protocolIconMap[normalizedProtocol] || Server;
};

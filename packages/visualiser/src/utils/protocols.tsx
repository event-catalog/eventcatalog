import { Server, Radio, Wifi, Network, Globe, Cloud } from "lucide-react";

// AWS Architecture Icons (from official AWS icon set)
// Source: https://github.com/boyney123/awsicons (MIT)
function AwsEventBridge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <defs>
        <linearGradient x1="0%" y1="100%" x2="100%" y2="0%" id="eb-g">
          <stop stopColor="#B0084D" offset="0%" />
          <stop stopColor="#FF4F8B" offset="100%" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="4" fill="url(#eb-g)" />
      <path
        fill="#FFF"
        d="M11.056 28.594a2.09 2.09 0 01-2.08-2.096 2.09 2.09 0 012.08-2.095c1.146 0 2.08.94 2.08 2.095a2.09 2.09 0 01-2.08 2.096zm1.857.363a3.093 3.093 0 001.223-2.459c0-1.711-1.382-3.103-3.08-3.103-.42 0-.817.086-1.181.24l-1.799-3.139 2.362-4.122-.865-.504-2.506 4.375a.504.504 0 000 .503l1.966 3.43a3.09 3.09 0 00-1.056 2.32c0 1.712 1.38 3.104 3.079 3.104.342 0 .665-.07.973-.174l1.531 2.844a.5.5 0 00.44.263h5.5v-1.008h-5.203l-1.385-2.57zM29.944 16.56a2.09 2.09 0 01-2.08-2.096 2.09 2.09 0 012.08-2.096 2.09 2.09 0 012.078 2.096 2.09 2.09 0 01-2.079 2.096zm2.023.224a3.095 3.095 0 001.055-2.32c0-1.711-1.38-3.104-3.079-3.104-.34 0-.662.07-.97.173L27.442 8.62A.497.497 0 0027 8.351h-5.5V9.36h5.2l1.39 2.644a3.1 3.1 0 00-1.226 2.462c0 1.71 1.381 3.103 3.08 3.103.42 0 .818-.086 1.18-.24l1.799 3.14-2.362 4.12.866.504 2.505-4.373a.504.504 0 000-.504l-1.965-3.43zm-4.573 16.207a2.09 2.09 0 01-2.08-2.095 2.09 2.09 0 012.08-2.095 2.09 2.09 0 012.079 2.095 2.09 2.09 0 01-2.08 2.095zm-9.19-8.491l-2.293-4.002 2.292-4h4.584l2.294 4-2.294 4.002h-4.584zm-4.568-12.303a2.09 2.09 0 01-2.08-2.095 2.09 2.09 0 012.08-2.095c1.146 0 2.08.94 2.08 2.095a2.09 2.09 0 01-2.08 2.095zm13.758 15.596c-.625 0-1.206.191-1.692.515l-2.07-3.267 2.46-4.29a.504.504 0 000-.504l-2.582-4.505a.498.498 0 00-.433-.252h-4.752l-2.279-3.481a3.088 3.088 0 00.67-1.907c0-1.711-1.382-3.103-3.08-3.103-1.699 0-3.08 1.392-3.08 3.103 0 1.712 1.381 3.103 3.08 3.103a3.04 3.04 0 001.668-.502l2.09 3.194-2.492 4.35a.504.504 0 000 .503l2.58 4.506a.497.497 0 00.433.252h4.828l2.218 3.505A3.092 3.092 0 0027.395 34c1.698 0 3.079-1.393 3.079-3.103 0-1.712-1.381-3.103-3.08-3.103z"
      />
    </svg>
  );
}

function AwsSqs({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <defs>
        <linearGradient x1="0%" y1="100%" x2="100%" y2="0%" id="sqs-g">
          <stop stopColor="#B0084D" offset="0%" />
          <stop stopColor="#FF4F8B" offset="100%" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="4" fill="url(#sqs-g)" />
      <path
        fill="#FFF"
        d="M14.342 22.35l1.505-1.444a.501.501 0 00.013-.708l-1.505-1.555-.72.695.676.7h-2.32v.999h2.274l-.617.592.694.72zm12.016.003l1.55-1.453a.5.5 0 00.011-.717l-1.55-1.546-.708.707.694.694H24.01v.999H26.3l-.627.588.686.728zm-8.77 1.008a6.458 6.458 0 012.417-.467c.842 0 1.665.163 2.416.467-.669-1.771-.669-3.971 0-5.742-1.502.607-3.331.607-4.833 0 .669 1.77.669 3.97 0 5.742zm-1.944 1.98a.494.494 0 010-.707c1.94-1.936 1.94-6.352 0-8.289a.494.494 0 010-.706.502.502 0 01.709 0c.921.92 2.252 1.447 3.652 1.447 1.4 0 2.731-.528 3.653-1.447a.502.502 0 01.854.354c0 .128-.05.255-.146.352-1.942 1.937-1.942 6.353 0 8.29a.501.501 0 01-.708.706c-.922-.92-2.253-1.447-3.653-1.447s-2.731.527-3.652 1.447a.502.502 0 01-.709 0zm16.898-5.905a1.562 1.562 0 00-1.106-.456 1.558 1.558 0 00-1.105 2.662c.61.608 1.601.608 2.211 0a1.56 1.56 0 000-2.206zm.708 2.913a2.56 2.56 0 01-1.814.749 2.56 2.56 0 01-1.813-4.369c1-.997 2.628-.997 3.627 0 1 .999 1 2.622 0 3.62zM9.67 19.447a1.562 1.562 0 00-1.106-.456 1.56 1.56 0 00-1.105 2.662 1.56 1.56 0 102.21-2.206zm.708 2.912a2.56 2.56 0 01-1.814.749A2.559 2.559 0 016.75 18.74c1-.997 2.627-.997 3.627 0 1 .999 1 2.622 0 3.62zm17.057 6.551A10.514 10.514 0 0119.957 32a10.51 10.51 0 01-7.475-3.09c-1.316-1.312-2.074-2.44-2.537-3.774l-.947.327c.51 1.466 1.365 2.747 2.776 4.154A11.506 11.506 0 0019.957 33c3.093 0 6-1.201 8.185-3.383 1.14-1.139 2.279-2.43 2.87-4.156l-.948-.323c-.525 1.532-1.575 2.719-2.63 3.772zM9.945 15.86l-.947-.328c.512-1.467 1.368-2.749 2.778-4.156 4.51-4.5 11.85-4.502 16.362 0 1.08 1.077 2.266 2.414 2.874 4.156l-.948.328c-.54-1.55-1.635-2.78-2.634-3.777a10.508 10.508 0 00-7.473-3.087 10.508 10.508 0 00-7.472 3.087c-1.298 1.295-2.081 2.46-2.54 3.777z"
      />
    </svg>
  );
}

function AwsSns({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <defs>
        <linearGradient x1="0%" y1="100%" x2="100%" y2="0%" id="sns-g">
          <stop stopColor="#B0084D" offset="0%" />
          <stop stopColor="#FF4F8B" offset="100%" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="4" fill="url(#sns-g)" />
      <path
        fill="#FFF"
        d="M7.01 20.078a1.1 1.1 0 011.105-1.093 1.1 1.1 0 011.104 1.093 1.1 1.1 0 01-1.104 1.093 1.1 1.1 0 01-1.105-1.093zM20.776 33C14.813 33 9.645 28.375 8.47 22.136a2.1 2.1 0 001.69-1.558h2.949v-1h-2.95a2.104 2.104 0 00-1.653-1.554C9.72 12.252 14.838 8 20.776 8c2.933 0 5.354.643 7.194 1.911l.575-.821C26.534 7.703 23.92 7 20.776 7c-6.51 0-12.104 4.726-13.308 11.096C6.62 18.368 6 19.149 6 20.078c0 .916.602 1.688 1.431 1.971C8.591 28.894 14.24 34 20.776 34c3.285 0 6.788-1.667 8.786-3.094l-.59-.811C26.947 31.541 23.627 33 20.777 33zM14.79 18.242c1.111.274 2.523.321 3.343.321.833 0 2.271-.047 3.402-.32l-2.401 5.014a.507.507 0 00-.048.215v2.324l-1.957.915v-3.239a.514.514 0 00-.044-.206l-2.295-5.024zm3.343-1.757c2.314 0 3.554.311 3.951.52-.417.234-1.745.558-3.95.558-2.184 0-3.483-.327-3.873-.558.37-.206 1.582-.52 3.872-.52zm-1.78 11.438a.511.511 0 00.486.03l2.968-1.388a.5.5 0 00.288-.452v-2.529l2.909-6.074a.806.806 0 00.189-.51c0-1.252-2.751-1.515-5.06-1.515-2.266 0-4.969.263-4.969 1.515 0 .19.067.355.18.502l2.775 6.077V27.5c0 .172.088.331.235.423zM30.877 27a1.1 1.1 0 011.104 1.093 1.1 1.1 0 01-1.104 1.093 1.1 1.1 0 01-1.104-1.093A1.1 1.1 0 0130.876 27zm0-16.03a1.1 1.1 0 011.104 1.093 1.1 1.1 0 01-1.104 1.093 1.1 1.1 0 01-1.104-1.093 1.1 1.1 0 011.104-1.093zm1.01 8.015a1.1 1.1 0 011.104 1.093 1.1 1.1 0 01-1.104 1.093 1.1 1.1 0 01-1.104-1.093 1.1 1.1 0 011.104-1.093zm-4.607 1.593h2.561a2.108 2.108 0 002.046 1.593A2.106 2.106 0 0034 20.078a2.106 2.106 0 00-2.114-2.093c-.992 0-1.818.681-2.046 1.593H27.28v-7.015h1.551a2.108 2.108 0 002.046 1.593 2.106 2.106 0 002.114-2.093 2.106 2.106 0 00-2.114-2.093c-.991 0-1.818.681-2.046 1.593h-2.056a.502.502 0 00-.505.5v7.515h-3.061v1h3.061v7.515c0 .277.226.5.505.5h2.056a2.108 2.108 0 002.046 1.593 2.106 2.106 0 002.114-2.093A2.106 2.106 0 0030.876 26c-.991 0-1.818.681-2.046 1.593H27.28v-7.015z"
      />
    </svg>
  );
}

// Icon type: "svg" = full self-contained SVG, "lucide" = Lucide component (needs wrapper)
type IconEntry = { component: any; type: "svg" | "lucide" };

// Map protocol names to icons
const protocolIconMap: { [key: string]: IconEntry } = {
  // Web protocols
  http: { component: Server, type: "lucide" },
  https: { component: Server, type: "lucide" },
  ws: { component: Radio, type: "lucide" },
  wss: { component: Radio, type: "lucide" },
  websocket: { component: Radio, type: "lucide" },

  // Messaging protocols
  mqtt: { component: Wifi, type: "lucide" },
  amqp: { component: Network, type: "lucide" },
  grpc: { component: Globe, type: "lucide" },
  graphql: { component: Globe, type: "lucide" },

  // Message brokers
  kafka: { component: Network, type: "lucide" },
  rabbitmq: { component: Network, type: "lucide" },
  redis: { component: Network, type: "lucide" },
  nats: { component: Network, type: "lucide" },
  pulsar: { component: Network, type: "lucide" },
  solace: { component: Network, type: "lucide" },
  activemq: { component: Network, type: "lucide" },

  // AWS
  sqs: { component: AwsSqs, type: "svg" },
  sns: { component: AwsSns, type: "svg" },
  eventbridge: { component: AwsEventBridge, type: "svg" },
  kinesis: { component: Network, type: "lucide" },
  msk: { component: Network, type: "lucide" },

  // Google Cloud
  pubsub: { component: Cloud, type: "lucide" },
  googlepubsub: { component: Cloud, type: "lucide" },
  cloudtasks: { component: Cloud, type: "lucide" },

  // Azure
  servicebus: { component: Cloud, type: "lucide" },
  azureservicebus: { component: Cloud, type: "lucide" },
  eventhubs: { component: Cloud, type: "lucide" },
  azureeventhubs: { component: Cloud, type: "lucide" },
  eventgrid: { component: Cloud, type: "lucide" },
  azureeventgrid: { component: Cloud, type: "lucide" },
};

export const getIconForProtocol = (protocol?: string): IconEntry | null => {
  if (!protocol) return null;
  const normalizedProtocol = protocol.replace(/[-_\s]/g, "").toLowerCase();
  return protocolIconMap[normalizedProtocol] || null;
};

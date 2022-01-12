import { InformationCircleIcon, ExclamationIcon } from '@heroicons/react/solid';

const getConfigurationByType = (type: string) => {
  switch (type) {
    case 'alert':
      return { color: 'red', icon: ExclamationIcon };
    case 'warning':
      return { color: 'yellow', icon: ExclamationIcon };
    default:
      return { color: 'indigo', icon: InformationCircleIcon };
  }
};

interface AdmonitionProps {
  children: JSX.Element;
  type?: string;
  className?: string;
}

export default function Admonition({ children, type, className = '' }: AdmonitionProps) {
  const { color, icon: Icon } = getConfigurationByType(type);

  return (
    <div className={`bg-${color}-50 border-l-4 border-${color}-400 my-4 ${className}`}>
      <div className="flex">
        <div className="ml-3 py-4">
          <Icon className={`inline-block mr-2 h-5 w-5 text-${color}-400`} aria-hidden="true" />
          {children}
        </div>
      </div>
    </div>
  );
}

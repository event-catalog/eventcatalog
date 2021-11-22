/* This example requires Tailwind CSS v2.0+ */
import { InformationCircleIcon, ExclamationIcon } from '@heroicons/react/solid'

const getConfigurationByType = (type: string) => {
  switch (type) {
    case 'alert':
      return { color: 'red', icon: ExclamationIcon }
    case 'warning':
      return { color: 'yellow', icon: ExclamationIcon }
    default:
      return { color: 'indigo', icon: InformationCircleIcon }
  }
}

export default function Example({ children, type, className }) {
  const { color, icon: Icon } = getConfigurationByType(type)

  return (
    <div className={`bg-${color}-50 border-l-4 border-${color}-400 my-4 ${className}`}>
      <div className="flex">
        <div className="ml-3 py-4">
          <Icon className={`inline-block mr-2 h-5 w-5 text-${color}-400`} aria-hidden="true" />
          {children}
        </div>
      </div>
    </div>
  )
}

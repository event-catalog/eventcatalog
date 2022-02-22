import React from 'react';
import {
  GlobeAltIcon,
  ChatAltIcon,
  DocumentReportIcon,
  HeartIcon,
  CodeIcon,
  DocumentIcon,
  ChartBarIcon,
  UserGroupIcon,
} from '@heroicons/react/outline';

const features = [
  {
    name: 'Open Source',
    description: 'Designed and Developed for the community. Free for everybody to use.',
    icon: CodeIcon,
  },
  {
    name: 'Markdown',
    description: 'Use Markdown to define your events and services. EventCatalog will handle the rest.',
    icon: DocumentIcon,
  },
  {
    name: 'Visualise',
    description:
      'Visualise your services and events, understand how things connect and how events flow through your Architecture.',
    icon: ChartBarIcon,
  },
  {
    name: 'Deploy Anywhere',
    description: 'EventCatalog outputs a static website, which means you can deploy anywhere you want.',
    icon: GlobeAltIcon,
  },
  {
    name: 'Plugins and API',
    description: 'Generate your documentation using Plugins. Generate your EventCatalog using your code.',
    icon: DocumentReportIcon,
  },
  {
    name: 'Users & Teams',
    description: 'User and Team pages. Document who owns which events and services.',
    icon: UserGroupIcon,
  },
  {
    name: 'Version Control',
    description: "It's just Markdown. Version your events like you would version your blog.",
    icon: ChatAltIcon,
  },
  {
    name: 'Community',
    description: 'Join the community, learn from each other and help shape the project.',
    icon: HeartIcon,
  },
];

export default function Example() {
  return (
    <div className="bg-gradient-to-r from-gray-800  to-gray-700">
      <div className="max-w-7xl mx-auto py-8 md:py-16 px-4 sm:px-6 lg:py-24 lg:px-8 lg:grid lg:grid-cols-3 lg:gap-x-8">
        <div>
          <p className="mt-2 text-3xl font-extrabold text-gray-200 wide">
            Bring <span className="text-green-500">visibility</span> to your Architecture.
          </p>
          <p className="mt-4 text-lg text-gray-300">Document, version and stay ontop of your Event Driven Architecture.</p>
        </div>
        <div className="mt-12 lg:mt-0 lg:col-span-2">
          <dl className="space-y-10 sm:space-y-0 sm:grid sm:grid-cols-2 sm:grid-rows-4 sm:grid-flow-col sm:gap-x-6 sm:gap-y-10 lg:gap-x-8">
            {features.map((feature) => (
              <div key={feature.name} className="relative">
                <dt>
                  <feature.icon className="absolute text-gray-200 h-6 w-6" aria-hidden="true" />
                  {/* <CheckIcon className="absolute h-6 w-6 text-green-500" aria-hidden="true" /> */}
                  <p className="ml-9 text-lg leading-6 font-bold text-gray-200">{feature.name}</p>
                </dt>
                <dd className="mt-2 ml-9 text-base text-gray-300">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

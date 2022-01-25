import React, { useEffect } from 'react';
import ReactArrows, { useXarrow, Xwrapper } from 'react-xarrows';
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
    description: 'EventCatalog generates a static website. You can deploy anywhere you like!',
    icon: GlobeAltIcon,
  },
  {
    name: 'Plugins and API',
    description: 'Plugin system supported. Generate your docs using AsyncAPI Plugin, AWS Plugins and more...',
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

function Arrow(props) {
  const updateXarrow = useXarrow();

  useEffect(() => {
    setTimeout(() => {
      updateXarrow();
    }, 200);
  }, [updateXarrow]);

  // eslint-disable-next-line react/prop-types
  const { className } = props;

  return <ReactArrows {...props} passProps={{ className }} />;
}

export default function Example() {
  return (
    <Xwrapper>
      <div className="relative max-w-xl mx-auto px-4 sm:px-6 lg:px-8 lg:max-w-7xl">
        <div className="md:py-16 bg-white overflow-hidden lg:py-24">
          <svg
            className="hidden lg:block absolute left-full transform -translate-x-1/2 -translate-y-1/4"
            width={404}
            height={784}
            fill="none"
            viewBox="0 0 404 784"
            aria-hidden="true"
          >
            <defs>
              <pattern id="b1e6e422-73f8-40a6-b5d9-c8586e37e0e7" x={0} y={0} width={20} height={20} patternUnits="userSpaceOnUse">
                <rect x={0} y={0} width={4} height={4} className="text-gray-200" fill="currentColor" />
              </pattern>
            </defs>
            <rect width={404} height={784} fill="url(#b1e6e422-73f8-40a6-b5d9-c8586e37e0e7)" />
          </svg>

          <div className="relative lg:mt-24 lg:grid lg:grid-cols-2 lg:gap-8">
            <div className="relative pt-6 md:pt-10">
              <hr className="border-gray-100 block md:hidden" />
              <img className="md:block w-12 md:w-16 py-8" src="/img/text.svg" alt="Text icon" />
              <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-3xl">Powered by Markdown</h3>
              <div className="space-y-6 md:space-y-10">
                <p className="mt-3 text-lg text-gray-500">
                  EventCatalog is designed to help you and your teams document your Event Architecture.
                </p>
                <p className="mt-3 text-lg text-gray-500">
                  Document your events and upstream/downstream services with Markdown and our custom MDX components.
                </p>
                <p className="mt-3 text-lg text-gray-500">
                  Don&apos;t want to maintain your documentation? EventCatalog supports Plugins to generate documentation for you.
                </p>
              </div>
            </div>

            <div className="mt-10 -mx-4 relative lg:mt-0 z-20" aria-hidden="true">
              <svg
                className="hidden md:absolute left-1/2 transform -translate-x-1/2 translate-y-16 lg:hidden"
                width={784}
                height={404}
                fill="none"
                viewBox="0 0 784 404"
              >
                <defs>
                  <pattern
                    id="ca9667ae-9f92-4be7-abcb-9e3d727f2941"
                    x={0}
                    y={0}
                    width={20}
                    height={20}
                    patternUnits="userSpaceOnUse"
                  >
                    <rect x={0} y={0} width={4} height={4} className="text-gray-200" fill="currentColor" />
                  </pattern>
                </defs>
                <rect width={784} height={404} fill="url(#ca9667ae-9f92-4be7-abcb-9e3d727f2941)" />
              </svg>
              <img
                id="markdown-example"
                width={520}
                className="px-4 md:px-0 z-90 mx-auto shadow-md "
                src="/img/markdown-example2.png"
                alt=""
              />
              <span className="text-right block pr-14 text-sm mt-2 text-gray-900 tracking-wide italic">
                /events/AddedItemToCart/index.md
              </span>
            </div>
          </div>

          <Arrow
            start="markdown-example"
            startAnchor="bottom"
            endAnchor="top"
            end="page-example"
            zIndex={10}
            color="#1f2937"
            className="hidden md:block"
          />

          <div className="relative mt-12 lg:mt-24 lg:grid lg:grid-cols-2 lg:gap-8">
            <div className="relative">
              <img className="w-16 py-8" src="/img/book-mag.svg" alt="Sun icon" />
              <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-3xl">Discover Events</h3>
              <div className="space-y-6 md:space-y-10">
                <p className="mt-3 text-lg text-gray-500">
                  EventCatalog will render your documents, schemas, diagrams, code examples and much more...
                </p>
                <p className="mt-3 text-lg text-gray-500">
                  Use EventCatalog to discover your events and their upstream and downstream services.
                </p>
              </div>
            </div>

            <div className="mt-10 -mx-4 relative lg:mt-0 z-20" aria-hidden="true">
              <svg
                className="absolute left-1/2 transform -translate-x-1/2 translate-y-16 lg:hidden"
                width={784}
                height={404}
                fill="none"
                viewBox="0 0 784 404"
              >
                <defs>
                  <pattern
                    id="ca9667ae-9f92-4be7-abcb-9e3d727f2941"
                    x={0}
                    y={0}
                    width={20}
                    height={20}
                    patternUnits="userSpaceOnUse"
                  >
                    <rect x={0} y={0} width={4} height={4} className="text-gray-200" fill="currentColor" />
                  </pattern>
                </defs>
                <rect width={784} height={404} fill="url(#ca9667ae-9f92-4be7-abcb-9e3d727f2941)" />
              </svg>
              <img
                id="page-example"
                width={520}
                className="px-4 md:px-0 z-90 mx-auto shadow-md "
                src="/img/page-example.png"
                alt=""
              />
            </div>
          </div>

          <hr className="hidden md:block mt-28 mb-14 border-gray-100" />

          <div className="hidden md:block mx-auto max-w-md px-4 text-center sm:px-6 sm:max-w-3xl lg:px-8 lg:max-w-7xl">
            <div>
              <img className="w-16 py-8 mx-auto" src="/img/dictionary.svg" alt="Sun icon" />
              <p className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">Event Ownership</p>
              <p className="mt-5 max-w-prose mx-auto text-xl text-gray-500">
                Specify owners for each event or service. <br />
                Quickly find who owns their part of the architecture.
              </p>
            </div>
            <div className="mt-12">
              <img className="rounded-lg shadow-xl ring-1 ring-black ring-opacity-5" src="/img/user-page.png" alt="" />
            </div>
          </div>
        </div>
      </div>

      <hr className="hidden md:block mt-14 mb-14 border-gray-100 max-w-xl lg:max-w-7xl mx-auto" />
      <div className="bg-white">
        <div className="max-w-7xl mx-auto py-8 md:py-16 px-4 sm:px-6 lg:py-24 lg:px-8 lg:grid lg:grid-cols-3 lg:gap-x-8">
          <div>
            <img className="w-16 py-8" src="/img/dictionary.svg" alt="Sun icon" />
            <p className="mt-2 text-3xl font-extrabold text-gray-900 wide">Bring visibility to your Event Architecture</p>
            <p className="mt-4 text-lg text-gray-500">Document, version and stay ontop of your event architecture.</p>
          </div>
          <div className="mt-12 lg:mt-0 lg:col-span-2">
            <dl className="space-y-10 sm:space-y-0 sm:grid sm:grid-cols-2 sm:grid-rows-4 sm:grid-flow-col sm:gap-x-6 sm:gap-y-10 lg:gap-x-8">
              {features.map((feature) => (
                <div key={feature.name} className="relative">
                  <dt>
                    <feature.icon className="absolute text-gray-900 h-6 w-6" aria-hidden="true" />
                    {/* <CheckIcon className="absolute h-6 w-6 text-green-500" aria-hidden="true" /> */}
                    <p className="ml-9 text-lg leading-6 font-bold text-gray-900">{feature.name}</p>
                  </dt>
                  <dd className="mt-2 ml-9 text-base text-gray-500">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <hr className="mt-10 border-gray-100 max-w-xl lg:max-w-7xl mx-auto" />
    </Xwrapper>
  );
}

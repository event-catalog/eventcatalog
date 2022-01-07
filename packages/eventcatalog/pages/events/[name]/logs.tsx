import { MDXRemote } from 'next-mdx-remote';
import React, { useEffect } from 'react';
import Link from 'next/link';

import * as Diff2Html from 'diff2html/lib/ui/js/diff2html-ui-slim';
import 'diff2html/bundles/css/diff2html.min.css';

import { CodeIcon } from '@heroicons/react/solid';
import BreadCrumbs from '@/components/BreadCrumbs';

import { getLogsForEvent, getEventByName } from '@/lib/events';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

interface LogsProps {
  name: string;
  currentVersion: string;
  changes: any;
}

function Logs({ changes, name: eventName, currentVersion }: LogsProps) {
  const pages = [
    { name: 'Events', href: '/events', current: false },
    { name: eventName, href: `/events/${eventName}`, current: false },
    { name: 'Logs', href: `/events/${eventName}/history`, current: true },
  ];

  useEffect(() => {
    const configuration = {
      drawFileList: false,
      matching: 'lines',
      highlight: true,
      fileListToggle: false,
      outputFormat: 'side-by-side',
    };

    changes.forEach((diff, index) => {
      if (diff.value) {
        const targetElement = document.getElementById(`code-diff-${index}`);

        // @ts-ignore
        const diff2htmlUi = new Diff2Html.Diff2HtmlUI(targetElement, diff.value, configuration);
        diff2htmlUi.draw();
        diff2htmlUi.highlightCode();
      }
    });
  }, [changes]);

  return (
    <div className="flex relative min-h-screen">
      <div className=" flex flex-col w-0 flex-1 ">
        <main className="flex-1 ">
          <div className="py-8 xl:py-10">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 xl:max-w-7xl xl:grid xl:grid-cols-4">
              <div className="xl:col-span-4 flex-col justify-between flex ">
                <div className="mb-5 border-b border-gray-100 pb-4">
                  <BreadCrumbs pages={pages} />
                </div>
                <div>
                  <div>
                    <div className="border-b pb-4 flex justify-between mb-4">
                      <div className="space-y-2 w-full">
                        <h1 className="text-3xl font-bold text-gray-900 relative">EmailSent</h1>
                      </div>
                    </div>
                  </div>

                  {changes.length === 0 && (
                    <div className="text-gray-400 text-xl">No versions for Event found.</div>
                  )}

                  <div className="flow-root mb-20">
                    <ul className="">
                      {changes.map((event, eventIdx) => (
                        <li key={eventIdx} className="">
                          <div className="relative pb-8">
                            {eventIdx !== changes.length - 1 ? (
                              <span
                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-100"
                                aria-hidden="true"
                              />
                            ) : null}
                            <div className="relative flex space-x-3">
                              <div>
                                <span
                                  className={classNames(
                                    'h-8 text-white text-xs w-8 rounded-full flex items-center justify-center ring-8 ring-white bg-blue-500'
                                  )}
                                >
                                  <CodeIcon className="h-4 w-4" />
                                  {/* {event.versions[0]} */}
                                </span>
                              </div>
                              <div>
                                <div>
                                  <p className="font-bold text-gray-800 text-xl">
                                    Schema version update
                                    {event.versions.map((version, index) => {
                                      const linkHref =
                                        version === currentVersion
                                          ? `/events/${eventName}`
                                          : `/events/${eventName}/v/${version}`;
                                      return (
                                        <Link key={version} href={linkHref}>
                                          <a className="font-medium">
                                            {index === 0 && ` from`}
                                            <span className="text-blue-500 underline px-1">
                                              {version}
                                              {version === currentVersion ? '(latest)' : ''}
                                            </span>
                                            {index === 0 && `to`}
                                          </a>
                                        </Link>
                                      );
                                    })}
                                  </p>
                                  {event.changelog.source && (
                                    <>
                                      <h2 className="text-xl text-blue-500 font-bold mt-4 border-b border-gray-100 pb-2">
                                        Changelog
                                      </h2>
                                      <div className="prose max-w-none mt-2">
                                        <MDXRemote {...event.changelog.source} />
                                      </div>
                                    </>
                                  )}
                                  {!event.changelog.source && (
                                    <h2 className="text-base text-gray-300 font-bold mt-4">
                                      No changelog file found.
                                    </h2>
                                  )}
                                </div>
                                <div className="text-right text-sm text-gray-500 py-4">
                                  <div id={`code-diff-${eventIdx}`} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export const getServerSideProps = async ({ query }) => {
  const { name: eventName } = query;

  const history = await getLogsForEvent(eventName);
  const { event: { version } = {} } = await getEventByName(eventName);

  return {
    props: {
      changes: history,
      name: eventName,
      currentVersion: version,
    },
  };
};

export default Logs;

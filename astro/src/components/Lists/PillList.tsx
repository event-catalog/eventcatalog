import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

interface Props {
  title: string;
  color: string;
  pills: {
    label: string;
    badge?: string;
    href: string;
    tag?: string;
    color?: string;
  }[];
  emptyMessage: string;
}

const PillList = ({ title, pills, emptyMessage, color = 'gray' }: Props) => {
  return (
    <div>
      <div className="mx-auto w-full max-w-lg divide-y divide-white/5 rounded-xl bg-white/5">
        <Disclosure as="div" className="py-4" defaultOpen={pills.length <= 2}>
          <DisclosureButton className="group flex w-full items-center justify-between">
            <span className="font-light text-black group-data-[hover]:text-black/80 capitalize"> {title} </span>
            <ChevronDownIcon className="size-5 fill-black/60 group-data-[hover]:fill-black/50 group-data-[open]:rotate-180" />
          </DisclosureButton>
          <DisclosurePanel className="mt-2 text-sm/5 text-black/50">
            <ul role="list" className=" py-2 ">
              {pills.map((item) => {
                return (
                  <li className="py-1" key={item.href}>
                    <a
                      className={`flex items-start  group border border-gray-200 px-4 rounded-md border-l border-l-${item.color || color}-500 border-l-8`}
                      href={item.href}
                    >
                      <div className="w-full">
                        <h3 className="flex-auto truncate text-sm font-semibold leading-6 text-black group-hover:underline group-hover:text-primary">
                          {item.label}
                        </h3>
                        <div className=" flex justify-between">
                          <span className="text-xs font-light bg-gray-100 text-gray-700 rounded-md py-0.5 group-hover:bg-primary/20">
                            {item.tag}
                          </span>
                          {item.badge && (
                            <span className="text-xs font-light bg-gray-100 text-gray-700 rounded-md py-0.5 group-hover:bg-primary/20 capitalize">
                              {item.badge.slice(0, -1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  </li>
                );
              })}
              {pills.length === 0 && (
                <li className="inline mr-2 leading-tight text-xs">
                  <span className="text-gray-400">{emptyMessage}</span>
                </li>
              )}
            </ul>
          </DisclosurePanel>
        </Disclosure>
      </div>
    </div>
  );
};

export default PillList;

import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

interface Props {
  title: string;
  color: string;
  items: {
    label: string;
    version: string;
    badge?: string;
    href: string;
    color: string;
    active: boolean;
  }[];
  emptyMessage: string;
}

const BasicList = ({ title, items, emptyMessage, color = 'gray' }: Props) => {
  return (
    <div>
      <div className="mx-auto w-full max-w-lg divide-y divide-white/5 rounded-xl bg-white/5 py-2 ">
        <Disclosure as="div" className="pb-4" defaultOpen={true}>
          <DisclosureButton className="group flex w-full items-center justify-between">
            <span className="font-semibold capitalize"> {title} </span>
            <ChevronDownIcon className="size-5 fill-black/60 group-data-[hover]:fill-black/50 group-data-[open]:rotate-180" />
          </DisclosureButton>
          <DisclosurePanel className="mt-2 text-sm/5 text-black/80">
            <ul role="list" className="">
              {items.map((item) => {
                return (
                  <li key={item.version} className="px-2 w-full text-md xl:text-lg border-l border-gray-200 py-1 ">
                    <a
                      className={`flex justify-between items-center w-full px-2 rounded-md font-normal   ${item.active ? 'bg-purple-200 text-purple-800 ' : 'font-thin'}`}
                      href={item.href}
                    >
                      <span className="block">{item.label}</span>
                      {item.version && (
                        <span className="block text-sm bg-purple-100 p-0.5 px-1 text-gray-600  rounded-md font-light">
                          v{item.version}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
              {items.length === 0 && (
                <li className="inline mr-2 leading-6 text-sm">
                  <span className="text-gray-500">{emptyMessage}</span>
                </li>
              )}
            </ul>
          </DisclosurePanel>
        </Disclosure>
      </div>
    </div>
  );
};

export default BasicList;

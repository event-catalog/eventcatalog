import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { UserGroupIcon, UserIcon } from '@heroicons/react/24/outline';

interface Props {
  title: string;
  owners: {
    label: string;
    badge?: string;
    type: string;
    avatarUrl?: string;
    href: string;
  }[];
  emptyMessage: string;
}

const OwnersList = ({ title, owners, emptyMessage }: Props) => {
  return (
    <div>
      <div className="mx-auto w-full max-w-lg divide-y divide-white/5 rounded-xl bg-white/5">
        <Disclosure as="div" className="" defaultOpen={owners.length <= 5}>
          <DisclosureButton className="group flex w-full items-center justify-start space-x-4">
            <span className="text-sm text-black font-semibold group-data-[hover]:text-black/80 capitalize"> {title} </span>
            <ChevronDownIcon className="size-5 fill-black/60 group-data-[hover]:fill-black/50 group-data-[open]:rotate-180" />
          </DisclosureButton>
          <DisclosurePanel className="mt-2 text-sm/5 text-black/50">
            <ul role="list" className="space-y-2">
              {owners.map((item) => {
                return (
                  <li
                    className="has-tooltip rounded-md text-gray-600 group px-1 w-full hover:bg-gradient-to-l hover:from-purple-500 hover:to-purple-700 hover:text-white hover:font-normal  "
                    key={item.href}
                  >
                    <a className={`flex items-center space-x-2`} href={item.href}>
                      {item.type === 'users' && (
                        <UserIcon className="h-4 w-4 text-gray-800 group-hover:text-white" strokeWidth={1} />
                      )}
                      {item.type === 'teams' && (
                        <UserGroupIcon className="h-4 w-4 text-gray-800 group-hover:text-white" strokeWidth={1} />
                      )}
                      <span className="font-light text-sm truncate">{item.label}</span>
                      {item.label.length > 24 && (
                        <span className="tooltip rounded relative shadow-lg p-1 font-normal text-xs bg-white  text-black ml-[30px] mt-12">
                          {item.label}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
              {owners.length === 0 && (
                <li className="inline mr-2 leading-6 text-sm">
                  <span className="text-gray-500">{emptyMessage}</span>
                </li>
              )}
            </ul>
          </DisclosurePanel>
        </Disclosure>
      </div>
      <div className="border-b border-gray-100 my-4"></div>
    </div>
  );
};

export default OwnersList;

import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { UserGroupIcon, UserIcon } from '@heroicons/react/24/outline';
import './PillListFlat.styles.css';

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
      <div className="mx-auto w-full max-w-lg divide-y divide-[rgb(var(--ec-page-border))] rounded-xl">
        <Disclosure as="div" className="" defaultOpen={owners.length <= 5}>
          <DisclosureButton className="group flex w-full items-center justify-start space-x-4">
            <span className="text-sm text-[rgb(var(--ec-page-text))] font-semibold group-data-[hover]:opacity-80 capitalize"> {title} </span>
            <ChevronDownIcon className="size-5 fill-[rgb(var(--ec-icon-color))] group-data-[hover]:opacity-80 group-data-[open]:rotate-180" />
          </DisclosureButton>
          <DisclosurePanel className="mt-2 text-sm/5 text-[rgb(var(--ec-page-text-muted))]">
            <ul role="list" className="space-y-2">
              {owners.map((item) => {
                return (
                  <li
                    className="owner-item has-tooltip rounded-md text-[rgb(var(--ec-page-text-muted))] group px-1 w-full hover:text-white hover:font-normal"
                    key={item.href}
                  >
                    <a className={`flex items-center space-x-2`} href={item.href}>
                      {item.type === 'users' && (
                        <UserIcon className="h-4 w-4 text-[rgb(var(--ec-page-text))] group-hover:text-white" strokeWidth={1} />
                      )}
                      {item.type === 'teams' && (
                        <UserGroupIcon className="h-4 w-4 text-[rgb(var(--ec-page-text))] group-hover:text-white" strokeWidth={1} />
                      )}
                      <span className="font-light text-sm truncate">{item.label}</span>
                      {item.label.length > 24 && (
                        <span className="tooltip rounded relative shadow-lg p-1 font-normal text-xs bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] text-[rgb(var(--ec-page-text))] border border-[rgb(var(--ec-page-border))] ml-[30px] mt-12">
                          {item.label}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
              {owners.length === 0 && (
                <li className="inline mr-2 leading-6 text-sm">
                  <span className="text-[rgb(var(--ec-page-text-muted))]">{emptyMessage}</span>
                </li>
              )}
            </ul>
          </DisclosurePanel>
        </Disclosure>
      </div>
      <div className="border-b border-[rgb(var(--ec-page-border))] my-4"></div>
    </div>
  );
};

export default OwnersList;

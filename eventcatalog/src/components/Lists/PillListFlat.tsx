import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { getIconForCollection as getIconForCollectionOriginal } from '@utils/collections/icons';
import { useMemo } from 'react';

import './PillListFlat.styles.css';

interface Props {
  title: string;
  color: string;
  icon?: any;
  pills: {
    label: string;
    badge?: string;
    href?: string;
    tag?: string;
    color?: string;
    collection?: string;
    description?: string;
    icon?: string;
  }[];
  emptyMessage?: string;
}

const PillList = ({ title, pills, emptyMessage, color = 'gray', ...props }: Props) => {
  const getIconForCollection = useMemo(() => getIconForCollectionOriginal, []);
  return (
    <div>
      <div className="mx-auto w-full max-w-lg divide-y divide-white/5 rounded-xl bg-white/5">
        <Disclosure as="div" className="pb-8" defaultOpen={pills.length <= 10}>
          <DisclosureButton className="group flex w-full items-center justify-start space-x-4">
            <span className="text-sm text-black group-data-[hover]:text-black/80 capitalize"> {title} </span>
            <ChevronDownIcon className="size-5 ml-2 fill-black/60 group-data-[hover]:fill-black/50 group-data-[open]:rotate-180" />
          </DisclosureButton>
          <DisclosurePanel className="mt-2 text-sm/5 text-black/50">
            <ul role="list" className="space-y-2">
              {pills.map((item) => {
                const href = item.href ?? '#';
                const Icon = item.collection ? getIconForCollection(item.collection) : null;

                return (
                  <li
                    className=" has-tooltip rounded-md text-gray-600 group px-1 w-full hover:bg-gradient-to-l hover:from-purple-500 hover:to-purple-700 hover:text-white hover:font-normal  "
                    key={item.href}
                  >
                    <a className={`leading-3`} href={href}>
                      <span className="space-x-2 flex items-center">
                        {Icon && <Icon className={`h-4 w-4`} />}
                        <span className="font-light text-sm truncate">
                          {item.label} {item.tag && <>({item.tag})</>}
                        </span>
                        {item.label.length > 24 && (
                          <span className="tooltip rounded relative shadow-lg p-1 font-normal text-xs bg-white  text-black ml-[30px] mt-12">
                            {item.label} ({item.tag})
                          </span>
                        )}
                      </span>
                      {item.description && <span className="text-[9px] block ml-6 mt-1 leading-0">{item.description}</span>}
                    </a>
                  </li>
                );
              })}
              {pills.length === 0 && emptyMessage && (
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

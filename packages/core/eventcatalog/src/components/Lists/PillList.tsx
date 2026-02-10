import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDownIcon, ServerIcon } from '@heroicons/react/20/solid';

interface Props {
  title: string;
  color: string;
  icon?: React.ReactElement;
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
              {pills.map((item, index) => {
                return (
                  <li className="py-1 " key={`${item.href}-${index}`}>
                    <a
                      className={`flex items-start  group border border-pink-200 hover:border-pink-400  rounded-md`}
                      href={item.href}
                    >
                      <div className="flex w-full">
                        <div
                          className={`bg-${color}-500 bg-gradient-to-b from-pink-500 to-pink-700 flex items-start py-2 px-2 rounded-tl rounded-bl`}
                        >
                          <ServerIcon className="h-4 w-4 text-white" />
                        </div>
                        <div className="w-full px-2 py-1 ">
                          <h3 className="flex-auto truncate text-xs font-semibold  text-black">{item.label}</h3>
                          <div className="flex justify-between w-full">
                            <span className="text-[10px] font-light  text-gray-700 rounded-md ">{item.tag}</span>
                            {item.badge && (
                              <span className="text-[10px] font-light  text-gray-700 rounded-md  capitalize">
                                {item.badge.slice(0, -1)}
                              </span>
                            )}
                          </div>
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

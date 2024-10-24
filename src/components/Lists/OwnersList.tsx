import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

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

const OwnersList2 = ({ title, owners, emptyMessage }: Props) => {
  return (
    <div>
      <div className="mx-auto w-full max-w-lg divide-y divide-white/5 rounded-xl bg-white/5">
        <Disclosure as="div" className="pb-8" defaultOpen={owners.length <= 5}>
        <DisclosureButton className="group flex w-full items-center justify-start space-x-4">
            <span className="text-sm text-black group-data-[hover]:text-black/80 capitalize"> {title} </span>
            <ChevronDownIcon className="size-5 fill-black/60 group-data-[hover]:fill-black/50 group-data-[open]:rotate-180" />
          </DisclosureButton>
          <DisclosurePanel className="text-sm/5 text-black/50">
            <ul role="list" className="divide-y  divide-black/5">
              {owners.map((item) => {
                return (
                  <li className="py-3" key={item.href}>
                    <a className="flex items-center gap-x-3 group " href={item.href}>
                      {item.type === 'users' && item.avatarUrl && (
                        <img
                          src={item.avatarUrl}
                          alt={item.label}
                          className="w-7 h-7 rounded-full border group-hover:border-primary/60"
                        />
                      )}
                      {(item.type === 'teams' || !item.avatarUrl) && (
                        <span className="w-6 rounded-full mt-1 bg-red-500 block text-center text-white uppercase group-hover:bg-primary">
                          {item.label.charAt(0)}
                        </span>
                      )}
                      {/*  <span className="w-6 rounded-full mt-1 bg-red-500 block text-center text-white uppercase">{item.label.charAt(0)}</span> */}
                      <div>
                        <h3 className="flex-auto truncate text-[12px] text-black group-hover:underline group-hover:text-primary">
                          {item.label}
                        </h3>
                        <div className="-mt-0.5">
                          <span className="text-[10px] font-light  text-gray-500 rounded-md group-hover:bg-primary/10">
                            {item.badge}
                          </span>
                        </div>
                      </div>
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
    </div>
  );
};

export default OwnersList2;

// <div class="py-4">
//   <span class="font-light capitalize">{title}</span>
//   <ul role="list" class="divide-y divide-black/5">
//     {owners.map((item) => {
//       return (
//         <li class="py-3">
//           <a class="flex items-center gap-x-3 group " href={item.href}>
//             {item.type === 'users' && item.avatarUrl && <img src={item.avatarUrl} alt={item.label} class="w-7 h-7 rounded-full border group-hover:border-purple-300" />}
//             {(item.type === 'teams' || !item.avatarUrl) && (
//               <span class="w-6 rounded-full mt-1 bg-red-500 block text-center text-white uppercase group-hover:bg-primary">{item.label.charAt(0)}</span>
//             )}
//             {/* // <span class="w-6 rounded-full mt-1 bg-red-500 block text-center text-white uppercase">{item.label.charAt(0)}</span> */}
//             <div>
//               <h3 class="flex-auto truncate text-sm font-semibold leading-6 text-black group-hover:underline group-hover:text-purple-500">{item.label}</h3>
//               <div class="-mt-0.5">
//                 <span class="text-xs font-light bg-gray-100 text-gray-700 rounded-md py-0.5 group-hover:bg-purple-100">{item.badge}</span>
//               </div>
//             </div>
//           </a>
//         </li>
//       );
//     })}
//     {owners.length === 0 && (
//       <li class="inline mr-2 leading-6 text-sm">
//         <span class="text-gray-500">{emptyMessage}</span>
//       </li>
//     )}
//   </ul>
// </div>;

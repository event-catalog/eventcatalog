import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { MinusIcon } from '@heroicons/react/16/solid';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function Example({ title, children }: any) {
  return (
    <div className="border border-gray-200 rounded-md px-4 shadow-sm py-2 accordion">
      <Disclosure as="div" key={title} className="">
        {({ open }) => (
          <>
            <DisclosureButton className="flex w-full items-start justify-between text-left text-gray-900">
              <span className="text-base font-semibold leading-7">{title}</span>
              <span className="ml-6 flex h-7 items-center">
                {open ? (
                  <MinusIcon className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <PlusIcon className="h-6 w-6" aria-hidden="true" />
                )}
              </span>
            </DisclosureButton>
            <DisclosurePanel as="dd" className="pr-12 not-prose py-4">
              <p className="text-base leading-7 text-gray-600">{children}</p>
            </DisclosurePanel>
          </>
        )}
      </Disclosure>
    </div>
  );
}

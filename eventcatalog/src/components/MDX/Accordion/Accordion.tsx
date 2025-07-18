import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { MinusIcon } from '@heroicons/react/16/solid';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'react';

declare global {
  interface Window {
    renderDiagrams?: (graphs: HTMLCollectionOf<Element>) => void;
    renderPlantUML?: (graphs: HTMLCollectionOf<Element>) => void;
  }
}

export default function Example({ title, children }: any) {
  return (
    <div className="border border-gray-200 rounded-md px-4 shadow-sm py-2 accordion">
      <Disclosure as="div" key={title} className="">
        {({ open }) => {
          useEffect(() => {
            if (open) {
              const graphs = document.getElementsByClassName('mermaid');
              const plantUML = document.getElementsByClassName('plantuml');
              if (graphs.length > 0 && window.renderDiagrams) {
                window.renderDiagrams(graphs);
              }
              if (plantUML.length > 0 && window.renderPlantUML) {
                window.renderPlantUML(plantUML);
              }
            }
          }, [open]);

          return (
            <div>
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
              <DisclosurePanel as="dd" className="pr-12 py-4 prose prose-sm max-w-none">
                <div className="text-base leading-7 text-gray-600">{children}</div>
              </DisclosurePanel>
            </div>
          );
        }}
      </Disclosure>
    </div>
  );
}

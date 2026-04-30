import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { useEffect } from 'react';

declare global {
  interface Window {
    renderDiagrams?: (graphs: HTMLCollectionOf<Element>) => void;
    renderPlantUML?: (graphs: HTMLCollectionOf<Element>) => void;
  }
}

export default function Example({ title, children }: any) {
  return (
    <div className="accordion border border-[rgb(var(--ec-page-border))] rounded-lg bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] my-3">
      <Disclosure as="div" key={title}>
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
              <DisclosureButton className="group flex w-full items-center gap-3 px-5 py-4 text-left text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-page-text)/0.03)] transition-colors">
                <ChevronDownIcon
                  className={`h-5 w-5 shrink-0 text-[rgb(var(--ec-page-text-muted))] transition-transform duration-200 ${
                    open ? 'rotate-0' : '-rotate-90'
                  }`}
                  aria-hidden="true"
                />
                <span className="text-base font-semibold leading-6">{title}</span>
              </DisclosureButton>
              <DisclosurePanel as="dd" className="px-5 pb-5 pt-1 pl-12 prose prose-sm max-w-none">
                <div className="text-base leading-7 text-[rgb(var(--ec-page-text-muted))]">{children}</div>
              </DisclosurePanel>
            </div>
          );
        }}
      </Disclosure>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';

interface Environment {
  name: string;
  url: string;
  description?: string;
  shortName?: string;
}

interface EnvironmentDropdownProps {
  environments: Environment[];
}

const stripTrailingSlash = (pathname: string) => pathname.replace(/\/$/, '') || '/';

const startsWithPath = (pathname: string, basePathname: string) =>
  basePathname === '/' || pathname === basePathname || pathname.startsWith(`${basePathname}/`);

export const findCurrentEnvironment = (environments: Environment[], currentHref: string) => {
  const currentUrl = new URL(currentHref);

  return (
    environments
      .filter((env) => {
        const envUrl = new URL(env.url, currentUrl.href);
        const envPathname = stripTrailingSlash(envUrl.pathname);

        return envUrl.origin === currentUrl.origin && startsWithPath(currentUrl.pathname, envPathname);
      })
      .sort(
        (a, b) =>
          stripTrailingSlash(new URL(b.url, currentUrl.href).pathname).length -
          stripTrailingSlash(new URL(a.url, currentUrl.href).pathname).length
      )[0] || null
  );
};

export const buildEnvironmentUrl = (environmentUrl: string, currentHref: string, currentEnvironmentUrl?: string) => {
  const currentUrl = new URL(currentHref);
  const targetUrl = new URL(environmentUrl, currentUrl.href);
  const currentEnvironmentUrlObject = currentEnvironmentUrl ? new URL(currentEnvironmentUrl, currentUrl.href) : currentUrl;
  const currentBasePathname = stripTrailingSlash(currentEnvironmentUrlObject.pathname);
  const targetBasePathname = stripTrailingSlash(targetUrl.pathname);
  const pathWithinEnvironment =
    startsWithPath(currentUrl.pathname, currentBasePathname) && currentBasePathname !== '/'
      ? currentUrl.pathname.slice(currentBasePathname.length)
      : currentUrl.pathname;

  targetUrl.pathname = `${targetBasePathname}${pathWithinEnvironment}`.replace(/\/+/g, '/');
  targetUrl.search = currentUrl.search;
  targetUrl.hash = currentUrl.hash;

  return targetUrl.toString();
};

export const EnvironmentDropdown: React.FC<EnvironmentDropdownProps> = ({ environments }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentEnvironment, setCurrentEnvironment] = useState<Environment | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentEnvironment(findCurrentEnvironment(environments, window.location.href));
  }, [environments]);

  useEffect(() => {
    // Handle click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Handle escape key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="group inline-flex items-center gap-2.5 rounded-xl border border-[rgb(var(--ec-header-border))] bg-[rgb(var(--ec-header-bg))] px-3.5 py-2 text-[13px] font-medium text-[rgb(var(--ec-header-text)/0.82)] shadow-xs transition-colors hover:border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-dropdown-hover)/0.35)] hover:text-[rgb(var(--ec-header-text))] focus:outline-hidden focus:ring-2 focus:ring-[rgb(var(--ec-accent))]"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]" aria-hidden="true" />
        <span className="truncate">
          <span className="font-semibold text-[rgb(var(--ec-header-text))]">Environments</span>
          {currentEnvironment && (
            <span className="font-medium text-[rgb(var(--ec-header-text)/0.72)]">
              {' '}
              ({currentEnvironment.shortName || currentEnvironment.name})
            </span>
          )}
        </span>
        <svg
          className={`ml-0.5 h-4 w-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`${isOpen ? '' : 'hidden'} absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-[rgb(var(--ec-dropdown-border))] bg-[rgb(var(--ec-dropdown-bg))] p-1.5 shadow-2xl z-[100]`}
      >
        {environments.map((env) => {
          const isCurrentEnv = currentEnvironment?.name === env.name;

          return (
            <a
              key={env.name}
              href={env.url}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = buildEnvironmentUrl(env.url, window.location.href, currentEnvironment?.url);
              }}
              className={`block rounded-xl px-3 py-3 transition-colors ${
                isCurrentEnv
                  ? 'bg-[rgb(var(--ec-accent)/0.12)] text-[rgb(var(--ec-dropdown-text))]'
                  : 'text-[rgb(var(--ec-dropdown-text))] hover:bg-[rgb(var(--ec-dropdown-hover))]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${isCurrentEnv ? 'bg-emerald-400' : 'bg-[rgb(var(--ec-icon-color))]'}`}
                      aria-hidden="true"
                    />
                    <div
                      className={`truncate text-[13px] font-semibold ${isCurrentEnv ? 'text-[rgb(var(--ec-accent-text))]' : ''}`}
                    >
                      {env.name}
                    </div>
                  </div>
                  {env.description && (
                    <div
                      className={`mt-1 pl-4 text-[12px] leading-5 ${isCurrentEnv ? 'text-[rgb(var(--ec-accent-text)/0.78)]' : 'text-[rgb(var(--ec-icon-color))]'}`}
                    >
                      {env.description}
                    </div>
                  )}
                </div>
                {isCurrentEnv && (
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-[rgb(var(--ec-accent-text))]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};

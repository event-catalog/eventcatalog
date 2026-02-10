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

export const EnvironmentDropdown: React.FC<EnvironmentDropdownProps> = ({ environments }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentEnvironment, setCurrentEnvironment] = useState<Environment | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if current URL matches any environment
    const currentUrl = window.location.origin;
    const matchedEnv = environments.find((env) => {
      // Normalize URLs for comparison
      const envUrl = new URL(env.url).origin;
      return envUrl === currentUrl;
    });
    setCurrentEnvironment(matchedEnv || null);
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
        className="flex items-center space-x-1 text-sm font-medium text-[rgb(var(--ec-header-text))] hover:text-[rgb(var(--ec-icon-hover))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--ec-accent))] rounded-md px-3 py-2"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
        <span>
          Environments
          {currentEnvironment && (
            <span className="font-normal"> ({currentEnvironment.shortName || currentEnvironment.name})</span>
          )}
        </span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`${isOpen ? '' : 'hidden'} absolute right-0 mt-2 w-64 bg-[rgb(var(--ec-dropdown-bg))] rounded-md shadow-lg py-1 border border-[rgb(var(--ec-dropdown-border))] overflow-hidden z-[100]`}
      >
        {environments.map((env) => {
          const isCurrentEnv = currentEnvironment?.name === env.name;

          return (
            <a
              key={env.name}
              href={env.url}
              onClick={(e) => {
                e.preventDefault();
                // Construct the full URL with the current path when clicked
                const currentPath = window.location.pathname + window.location.search + window.location.hash;
                const targetUrl = new URL(env.url);
                targetUrl.pathname = currentPath;
                window.location.href = targetUrl.toString();
              }}
              className={`block px-4 py-3 text-sm transition-colors border-b border-[rgb(var(--ec-dropdown-border)/0.3)] last:border-b-0 ${
                isCurrentEnv
                  ? 'bg-[rgb(var(--ec-accent)/0.1)] text-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent)/0.2)]'
                  : 'text-[rgb(var(--ec-dropdown-text))] hover:bg-[rgb(var(--ec-dropdown-hover))]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-medium ${isCurrentEnv ? 'text-[rgb(var(--ec-accent))]' : ''}`}>{env.name}</div>
                  {env.description && (
                    <div
                      className={`text-xs font-light mt-1 ${isCurrentEnv ? 'text-[rgb(var(--ec-accent)/0.8)]' : 'text-[rgb(var(--ec-icon-color))]'}`}
                    >
                      {env.description}
                    </div>
                  )}
                </div>
                {isCurrentEnv && (
                  <svg
                    className="w-4 h-4 text-[rgb(var(--ec-accent))] flex-shrink-0 ml-2"
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

import { useState } from 'react';

/**
 * Someone's picture from their sign-in provider (SSO), loaded from there. By default it covers their avatar's
 * initials, which show again if it doesn't load (blocked, expired, or no longer there).
 */
export default function Picture({ src, className = 'absolute inset-0 h-full w-full' }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState<string>();
  if (!src || failed === src) return null;
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      // Some providers (e.g. Google) refuse pictures loaded with a referrer from another site
      referrerPolicy="no-referrer"
      onError={() => setFailed(src)}
      className={`rounded-full object-cover ${className}`}
    />
  );
}

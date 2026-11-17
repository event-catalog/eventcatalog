import React, { useState, useEffect } from 'react';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useStore } from '@nanostores/react';
import { favoritesStore, toggleFavorite, type FavoriteItem } from '../stores/favorites-store';

interface FavoriteButtonProps {
  nodeKey: string;
  title: string;
  badge?: string;
  href?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function FavoriteButton({ nodeKey, title, badge, href, size = 'md' }: FavoriteButtonProps) {
  const favorites = useStore(favoritesStore);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isFavorite = isClient && favorites.some((fav) => fav.nodeKey === nodeKey);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-[18px] w-[18px]',
    lg: 'h-8 w-8',
  };

  const handleToggleFavorite = () => {
    const favoriteItem: FavoriteItem = {
      nodeKey,
      path: [],
      title,
      badge,
      href,
    };
    toggleFavorite(favoriteItem);
  };

  return (
    <button
      onClick={handleToggleFavorite}
      // Quiet until it matters: light grey, amber on hover with a soft wash; amber once favourited
      className={`p-1.5 rounded-md transition-colors ${
        isFavorite
          ? 'text-amber-400 hover:bg-amber-500/10 hover:text-amber-500'
          : 'text-[rgb(var(--ec-page-text-muted)/0.45)] hover:bg-amber-500/10 hover:text-amber-500'
      }`}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorite ? <StarIconSolid className={sizeClasses[size]} /> : <StarIconOutline className={sizeClasses[size]} />}
    </button>
  );
}

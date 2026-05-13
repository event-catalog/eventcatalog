export type CollectionColor =
  | 'orange'
  | 'blue'
  | 'green'
  | 'pink'
  | 'yellow'
  | 'teal'
  | 'purple'
  | 'red'
  | 'gray'
  | 'cyan'
  | 'indigo';

export const getColorForCollection = (collection: string): CollectionColor => {
  switch (collection) {
    case 'events':
      return 'orange';
    case 'commands':
      return 'blue';
    case 'queries':
      return 'green';
    case 'flows':
      return 'teal';
    case 'teams':
      return 'gray';
    case 'users':
      return 'gray';
    case 'channels':
      return 'purple';
    case 'ubiquitousLanguages':
      return 'green';
    case 'entities':
      return 'purple';
    case 'domains':
      return 'yellow';
    case 'services':
      return 'pink';
    case 'data-products':
      return 'cyan';
    case 'containers':
      return 'indigo';
    default:
      return 'gray';
  }
};

export const tailwind500RgbByColor: Record<CollectionColor, string> = {
  orange: '249 115 22',
  blue: '59 130 246',
  green: '34 197 94',
  pink: '236 72 153',
  yellow: '234 179 8',
  teal: '20 184 166',
  purple: '168 85 247',
  red: '239 68 68',
  gray: '107 114 128',
  cyan: '6 182 212',
  indigo: '99 102 241',
};

export const collectionTextColorClassByColor: Record<CollectionColor, string> = {
  orange: 'text-orange-500',
  blue: 'text-blue-500',
  green: 'text-green-500',
  pink: 'text-pink-500',
  yellow: 'text-yellow-500',
  teal: 'text-teal-500',
  purple: 'text-purple-500',
  red: 'text-red-500',
  gray: 'text-gray-500',
  cyan: 'text-cyan-500',
  indigo: 'text-indigo-500',
};

export const getCollectionTextColorClass = (color: string, fallback = 'text-gray-500'): string =>
  collectionTextColorClassByColor[color as CollectionColor] || fallback;

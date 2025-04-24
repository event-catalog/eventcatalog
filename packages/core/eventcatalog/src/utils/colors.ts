export const getColor = (type: string) => {
  switch (type) {
    case 'event':
      return 'green';
    case 'domain':
      return 'pink';
    case 'command':
      return 'blue';
    case 'service':
      return 'purple';
    default:
      return 'gray';
  }
};

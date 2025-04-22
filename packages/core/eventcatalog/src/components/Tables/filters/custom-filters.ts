// Filter by a given property name, used to filter collections
export const filterCollectionByName = (property: string) => (row: any, key: string, searchValue: string) => {
  const collection = row?.original?.data[property] || [];
  return !!collection.find((item: any) => {
    const name = `${item?.data?.name} (v${item.data.version})` || '';
    return name.toLowerCase().includes(searchValue.toLowerCase());
  });
};

// Filter by name e.g My Event (v.0.0.1)
export const filterByName = (row: any, key: string, searchValue: string) => {
  const label = `${row?.original?.data.name} (v${row?.original?.data.version})` || '';
  return label.toLowerCase().includes(searchValue.toLowerCase());
};

export const filterByBadge = (row: any, key: string, searchValue: string) => {
  const badges = row?.original?.data?.badges || [];
  return badges.some((badge: any) => badge.content.toLowerCase().includes(searchValue.toLowerCase()));
};

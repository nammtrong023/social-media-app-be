import { FilterType } from 'types';

export const parseFilters = (filters: FilterType) => {
  const itemsPerPage = Number(filters.itemsPerPage) || 5;
  const page = Number(filters.page) || 1;
  const search = filters.search || '';

  const skip = page > 1 ? (page - 1) * itemsPerPage : 0;

  return { itemsPerPage, page, search, skip };
};

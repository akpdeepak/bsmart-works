import { useState } from 'react';
import { Pagination } from './pagination';

export default {
  title: 'Works/Atoms/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  args: {
    page: 0,
    totalPages: 10,
  },
};

export const Default = {
  args: { page: 0, totalPages: 10 },
};

export const MiddlePage = {
  name: 'Middle page',
  args: { page: 5, totalPages: 10 },
};

export const LastPage = {
  name: 'Last page',
  args: { page: 9, totalPages: 10 },
};

export const FewPages = {
  name: 'Few pages (3)',
  args: { page: 1, totalPages: 3 },
};

export const SinglePage = {
  name: 'Single page (renders nothing)',
  args: { page: 0, totalPages: 1 },
};

export const Interactive = {
  render: () => {
    const [page, setPage] = useState(0);
    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <p className="text-sm text-neutral-600">Current page: {page + 1} of 12</p>
        <Pagination page={page} totalPages={12} onPageChange={setPage} />
      </div>
    );
  },
};

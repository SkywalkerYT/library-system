import { defineStore } from 'pinia';
import { ref } from 'vue';
import { booksApi } from '@/api/books';
import type { Book, BookStats, ListQuery } from '@/types';

export const useBooksStore = defineStore('books', () => {
  const items = ref<Book[]>([]);
  const total = ref(0);
  const stats = ref<BookStats>({ total: 0, borrowed: 0, available: 0 });
  const loading = ref(false);

  // 最近一次成功的查询条件（用于分页切换）
  const lastQuery = ref<ListQuery>({ page: 1, pageSize: 12 });

  async function fetchList(q: ListQuery) {
    loading.value = true;
    lastQuery.value = q;
    try {
      const data = await booksApi.list(q);
      items.value = data.items;
      total.value = data.total;
    } finally {
      loading.value = false;
    }
  }

  async function fetchStats() {
    stats.value = await booksApi.stats();
  }

  async function create(input: Parameters<typeof booksApi.create>[0]) {
    await booksApi.create(input);
    await Promise.all([fetchList(lastQuery.value), fetchStats()]);
  }

  async function update(id: number, input: Parameters<typeof booksApi.update>[1]) {
    await booksApi.update(id, input);
    await Promise.all([fetchList(lastQuery.value), fetchStats()]);
  }

  async function remove(id: number) {
    await booksApi.remove(id);
    await Promise.all([fetchList(lastQuery.value), fetchStats()]);
  }

  async function batchRemove(ids: number[]) {
    await booksApi.batchDelete(ids);
    await Promise.all([fetchList(lastQuery.value), fetchStats()]);
  }

  async function borrow(id: number, input: Parameters<typeof booksApi.borrow>[1]) {
    await booksApi.borrow(id, input);
    await Promise.all([fetchList(lastQuery.value), fetchStats()]);
  }

  async function returnBook(id: number) {
    await booksApi.return(id);
    await Promise.all([fetchList(lastQuery.value), fetchStats()]);
  }

  return {
    items,
    total,
    stats,
    loading,
    lastQuery,
    fetchList,
    fetchStats,
    create,
    update,
    remove,
    batchRemove,
    borrow,
    returnBook,
  };
});

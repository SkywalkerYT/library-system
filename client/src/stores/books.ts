import { defineStore } from 'pinia';
import { ref } from 'vue';
import { booksApi } from '@/api/books';
import type { Book, BookStats, CategoryItem, ListQuery } from '@/types';

export const useBooksStore = defineStore('books', () => {
  const items = ref<Book[]>([]);
  const total = ref(0);
  const stats = ref<BookStats>({ total: 0, borrowed: 0, available: 0 });
  // ★ 全量分类池：mount 拉一次 + 任何会改变分类集合的操作（create / update / remove / batchRemove）后刷新。
  //   借 / 还不影响分类（status 切换不动 category 字段），所以不刷。
  const categories = ref<CategoryItem[]>([]);
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

  async function fetchCategories() {
    categories.value = await booksApi.categories();
  }

  async function create(input: Parameters<typeof booksApi.create>[0]) {
    await booksApi.create(input);
    // create 可能引入新分类——并发刷新分类池
    await Promise.all([fetchList(lastQuery.value), fetchStats(), fetchCategories()]);
  }

  async function update(id: number, input: Parameters<typeof booksApi.update>[1]) {
    await booksApi.update(id, input);
    // update 改分类名可能让旧分类消失 / 新分类出现
    await Promise.all([fetchList(lastQuery.value), fetchStats(), fetchCategories()]);
  }

  async function remove(id: number) {
    await booksApi.remove(id);
    await Promise.all([fetchList(lastQuery.value), fetchStats(), fetchCategories()]);
  }

  async function batchRemove(ids: number[]) {
    await booksApi.batchDelete(ids);
    await Promise.all([fetchList(lastQuery.value), fetchStats(), fetchCategories()]);
  }

  async function borrow(id: number, input: Parameters<typeof booksApi.borrow>[1]) {
    await booksApi.borrow(id, input);
    // 借不改变分类集合——只刷 list + stats
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
    categories,
    loading,
    lastQuery,
    fetchList,
    fetchStats,
    fetchCategories,
    create,
    update,
    remove,
    batchRemove,
    borrow,
    returnBook,
  };
});

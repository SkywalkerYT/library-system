<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import StatsPanel from '@/components/StatsPanel.vue';
import BookCard from '@/components/BookCard.vue';
import BookFormDialog from '@/components/BookFormDialog.vue';
import BorrowDialog from '@/components/BorrowDialog.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { useBooksStore } from '@/stores/books';
import type { Book, BookStatus, ListQuery } from '@/types';
import { ApiError } from '@/api/client';

const books = useBooksStore();

const keyword = ref('');
const category = ref('');
const status = ref<BookStatus | ''>('');
const page = ref(1);
const pageSize = 12;
const selectedIds = ref<Set<number>>(new Set());

const formOpen = ref(false);
const formBook = ref<Book | null>(null);

const borrowOpen = ref(false);
const borrowBook = ref<Book | null>(null);

const confirmState = ref<{
  open: boolean;
  title: string;
  message: string;
  danger?: boolean;
  onConfirm: () => void;
}>({ open: false, title: '', message: '', onConfirm: () => {} });

const categories = computed(() => {
  const set = new Set<string>();
  for (const b of books.items) if (b.category) set.add(b.category);
  return Array.from(set).sort();
});

const totalPages = computed(() => Math.max(1, Math.ceil(books.total / pageSize)));

async function reload() {
  const q: ListQuery = {
    page: page.value,
    pageSize,
    keyword: keyword.value.trim() || undefined,
    category: category.value || undefined,
    status: status.value || undefined,
  };
  await books.fetchList(q);
  selectedIds.value.clear();
}

onMounted(async () => {
  await Promise.all([books.fetchStats(), reload()]);
});

watch([keyword, category, status], () => {
  page.value = 1;
  reload();
});

function openCreate() {
  formBook.value = null;
  formOpen.value = true;
}

function openEdit(book: Book) {
  formBook.value = book;
  formOpen.value = true;
}

async function onFormSubmit(payload: { title: string; author: string; category: string; summary: string | null }) {
  try {
    if (formBook.value) {
      await books.update(formBook.value.id, payload);
    } else {
      await books.create(payload);
    }
    formOpen.value = false;
  } catch (e) {
    throw e instanceof ApiError ? new Error(e.message) : e;
  }
}

function openBorrow(book: Book) {
  borrowBook.value = book;
  borrowOpen.value = true;
}

async function onBorrowSubmit(payload: { borrowerName: string; borrowerPhone: string; dueAt: string }) {
  if (!borrowBook.value) return;
  try {
    await books.borrow(borrowBook.value.id, payload);
    borrowOpen.value = false;
  } catch (e) {
    throw e instanceof ApiError ? new Error(e.message) : e;
  }
}

function askDelete(book: Book) {
  confirmState.value = {
    open: true,
    title: '删除图书',
    message: `确认删除《${book.title}》？此操作不可撤销。`,
    danger: true,
    onConfirm: async () => {
      try {
        await books.remove(book.id);
      } finally {
        confirmState.value.open = false;
      }
    },
  };
}

function askBatchDelete() {
  const ids = Array.from(selectedIds.value);
  if (ids.length === 0) return;
  confirmState.value = {
    open: true,
    title: '批量删除',
    message: `确认删除选中的 ${ids.length} 本书？此操作不可撤销。`,
    danger: true,
    onConfirm: async () => {
      try {
        await books.batchRemove(ids);
      } finally {
        confirmState.value.open = false;
      }
    },
  };
}

async function returnBook(book: Book) {
  try {
    await books.returnBook(book.id);
  } catch (e) {
    if (e instanceof ApiError) alert(e.message);
  }
}

function toggleSelect(id: number) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id);
  else selectedIds.value.add(id);
}

function toggleSelectAllOnPage() {
  const allSelected = books.items.every((b) => selectedIds.value.has(b.id));
  if (allSelected) {
    for (const b of books.items) selectedIds.value.delete(b.id);
  } else {
    for (const b of books.items) selectedIds.value.add(b.id);
  }
}

const allOnPageSelected = computed(() => {
  if (books.items.length === 0) return false;
  return books.items.every((b) => selectedIds.value.has(b.id));
});
const selectedCount = computed(() => selectedIds.value.size);

function goPage(p: number) {
  page.value = Math.min(Math.max(1, p), totalPages.value);
  reload();
}
</script>

<template>
  <div class="page">
    <AppHeader />
    <main class="container">
      <StatsPanel />

      <section class="toolbar">
        <div class="search">
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索 书名 / 作者 / 简介…"
            aria-label="搜索"
          />
          <select v-model="status" aria-label="状态">
            <option value="">全部状态</option>
            <option value="AVAILABLE">在馆</option>
            <option value="BORROWED">借出</option>
          </select>
          <select v-model="category" aria-label="分类">
            <option value="">全部分类</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="toolbar-right">
          <button
            v-if="selectedCount > 0"
            class="btn btn--danger"
            @click="askBatchDelete"
          >
            批量删除（{{ selectedCount }}）
          </button>
          <button class="btn btn--primary" @click="openCreate">＋ 新增图书</button>
        </div>
      </section>

      <section v-if="books.items.length > 0" class="select-row">
        <label class="checkbox-all">
          <input type="checkbox" :checked="allOnPageSelected" @change="toggleSelectAllOnPage" />
          <span>本页全选</span>
        </label>
        <span class="result-count">共 {{ books.total }} 本 · 第 {{ page }} / {{ totalPages }} 页</span>
      </section>

      <section v-if="books.loading" class="empty">加载中…</section>
      <section v-else-if="books.items.length === 0" class="empty">
        <p>暂无图书</p>
        <button class="btn btn--primary" @click="openCreate">＋ 新增第一本</button>
      </section>

      <section v-else class="grid">
        <BookCard
          v-for="book in books.items"
          :key="book.id"
          :book="book"
          :selected="selectedIds.has(book.id)"
          @toggle-select="toggleSelect"
          @edit="openEdit"
          @borrow="openBorrow"
          @return="returnBook"
          @delete="askDelete"
        />
      </section>

      <nav v-if="totalPages > 1" class="pagination" aria-label="分页">
        <button class="btn" :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
        <span class="page-info">{{ page }} / {{ totalPages }}</span>
        <button class="btn" :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
      </nav>
    </main>

    <BookFormDialog
      :open="formOpen"
      :book="formBook"
      @close="formOpen = false"
      @submit="onFormSubmit"
    />
    <BorrowDialog
      :open="borrowOpen"
      :book="borrowBook"
      @close="borrowOpen = false"
      @submit="onBorrowSubmit"
    />
    <ConfirmDialog
      :open="confirmState.open"
      :title="confirmState.title"
      :message="confirmState.message"
      :danger="confirmState.danger"
      confirm-text="确认删除"
      @close="confirmState.open = false"
      @confirm="confirmState.onConfirm"
    />
  </div>
</template>

<style scoped>
.page { min-height: 100vh; }
.container { max-width: 1200px; margin: 0 auto; padding: 1.25rem 1.25rem 3rem; }

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.search {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.search input {
  width: 280px;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.search select {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.toolbar-right { display: flex; gap: 0.5rem; }

.select-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--color-text-soft);
  margin-bottom: 0.5rem;
}
.checkbox-all { display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.9rem;
}
.empty {
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: 3rem 1rem;
  text-align: center;
  color: var(--color-text-soft);
}
.empty p { margin: 0 0 0.85rem; }

.pagination {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
}
.page-info {
  color: var(--color-text-soft);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 600px) {
  .search input { width: 100%; }
}
</style>

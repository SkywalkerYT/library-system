<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Book } from '@/types';
import { FALLBACK_COVER } from '@/utils/coverFallback';

const props = defineProps<{
  book: Book;
  selected: boolean;
  // ★ 新增：是否管理员视角
  //   - true  → 显示 borrowerPhone 明文
  //   - false → 显示 borrowerPhoneMasked（后端已 mask，前端兜底再 mask 一次）
  isAdmin: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-select', id: number): void;
  (e: 'edit', book: Book): void;
  (e: 'borrow', book: Book): void;
  (e: 'return', book: Book): void;
  (e: 'delete', book: Book): void;
}>();

const isBorrowed = computed(() => props.book.status === 'BORROWED');

// ★ 按角色选展示的手机号：admin 看明文，其他看 mask
//   服务端 DTO 同时给了 borrowerPhone + borrowerPhoneMasked；前端不再 mask 计算。
const displayPhone = computed(() =>
  props.isAdmin
    ? (props.book.borrowerPhone ?? '—')
    : (props.book.borrowerPhoneMasked ?? props.book.borrowerPhone ?? '—')
);

// ★ 封面 src：coverUrl 优先，失败回退到内联 SVG
//   - coverBroken 标记：<img onerror> 触发后切到占位
//   - 即使 coverUrl 为 null，第一次渲染直接用占位（不会触发 onerror）
const coverBroken = ref(false);
const coverSrc = computed(() => {
  if (props.book.coverUrl && !coverBroken.value) return props.book.coverUrl;
  return FALLBACK_COVER(props.book.title);
});
function onCoverError() {
  if (!coverBroken.value) coverBroken.value = true;
}

function fmt(s: string | null | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
</script>

<template>
  <article class="book-card" :class="{ 'book-card--selected': selected, 'book-card--borrowed': isBorrowed }">
    <header class="book-card__head">
      <label class="checkbox">
        <input type="checkbox" :checked="selected" @change="emit('toggle-select', book.id)" />
      </label>
      <span class="tag" :class="isBorrowed ? 'tag--borrowed' : 'tag--available'">
        {{ isBorrowed ? '借出' : '在馆' }}
      </span>
      <span class="category">{{ book.category || '未分类' }}</span>
    </header>
    <!-- ★ 封面：object-fit cover 保证比例 + 加载慢也不影响首屏（loading=lazy） -->
    <div class="book-card__cover-wrap">
      <img
        class="book-card__cover"
        :src="coverSrc"
        :alt="book.title"
        loading="lazy"
        @error="onCoverError"
      />
    </div>
    <h3 class="title" :title="book.title">{{ book.title }}</h3>
    <p class="author">{{ book.author }}</p>
    <p v-if="book.summary" class="summary">{{ book.summary }}</p>
    <div v-if="isBorrowed" class="borrower">
      <div><strong>{{ book.borrowerName }}</strong> · {{ displayPhone }}</div>
      <div class="borrower-dates">
        借出 {{ fmt(book.borrowedAt) }} · 应还 {{ fmt(book.dueAt) }}
      </div>
    </div>
    <footer class="actions">
      <button class="btn btn--ghost" @click="emit('edit', book)">编辑</button>
      <button v-if="!isBorrowed" class="btn" @click="emit('borrow', book)">借出</button>
      <button v-else class="btn btn--primary" @click="emit('return', book)">归还</button>
      <button class="btn btn--ghost danger" @click="emit('delete', book)">删除</button>
    </footer>
  </article>
</template>

<style scoped>
.book-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.book-card:hover { box-shadow: var(--shadow-md); }
.book-card--borrowed { border-left: 3px solid var(--color-warning); }
.book-card--selected { border-color: var(--color-primary); box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2); }

.book-card__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.checkbox { display: flex; }
.category {
  margin-left: auto;
  font-size: 0.78rem;
  color: var(--color-text-soft);
}

/* ★ 封面：固定比例容器 + img object-fit cover —— 不会因图大小不同把卡片撑变形 */
.book-card__cover-wrap {
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--color-surface-2, #f3f4f6);
}
.book-card__cover {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
}

.title {
  margin: 0.25rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.author {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-soft);
}
.summary {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: var(--color-text-soft);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.borrower {
  margin-top: 0.5rem;
  padding: 0.5rem 0.65rem;
  background: #fff7ed;
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  color: #7c2d12;
}
.borrower-dates { font-size: 0.78rem; margin-top: 0.2rem; opacity: 0.85; }
.actions {
  display: flex;
  gap: 0.4rem;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--color-border);
}
.actions .btn { padding: 0.35rem 0.6rem; font-size: 0.82rem; }
.actions .btn.danger { color: var(--color-danger); }
.actions .btn.danger:hover:not(:disabled) { background: #fef2f2; border-color: #fecaca; }
</style>

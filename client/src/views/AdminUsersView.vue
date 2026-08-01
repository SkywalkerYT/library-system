<script setup lang="ts">
/**
 * 管理员用户列表页
 * ★ 仅展示 + 搜索 + 筛选 + 分页，不含升降权 / 删除（plan 范围控制）
 *   路由 beforeEach 已拦截非 admin；后端模块级 requireAuth + requireAdmin 双重守卫兜底。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import { adminApi } from '@/api/admin';
import type { AdminUserListItem } from '@/types';

const items = ref<AdminUserListItem[]>([]);
const total = ref(0);
const loading = ref(false);

const keyword = ref('');
const isAdminFilter = ref<'all' | 'admin' | 'user'>('all');
const page = ref(1);
const pageSize = 20;

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

async function reload() {
  loading.value = true;
  try {
    const data = await adminApi.listUsers({
      page: page.value,
      pageSize,
      keyword: keyword.value.trim() || undefined,
      isAdmin: isAdminFilter.value === 'all' ? undefined : isAdminFilter.value === 'admin',
    });
    items.value = data.items;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

onMounted(reload);

// 筛选变化 → 回到第一页
watch([isAdminFilter], () => {
  page.value = 1;
  reload();
});

// 关键词防抖 300ms（沿用 BookListView 模式：ref 持有 id + onUnmounted 清理）
const keywordTimer = ref<number | null>(null);
watch(keyword, () => {
  if (keywordTimer.value !== null) window.clearTimeout(keywordTimer.value);
  keywordTimer.value = window.setTimeout(() => {
    keywordTimer.value = null;
    page.value = 1;
    reload();
  }, 300);
});
onUnmounted(() => {
  if (keywordTimer.value !== null) window.clearTimeout(keywordTimer.value);
});

function goPage(p: number) {
  page.value = Math.min(Math.max(1, p), totalPages.value);
  reload();
}

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
</script>

<template>
  <div class="page">
    <AppHeader />
    <main class="container">
      <header class="page-head">
        <h1>用户管理</h1>
        <p class="hint">共 {{ total }} 位用户 · 第 {{ page }} / {{ totalPages }} 页</p>
      </header>

      <section class="toolbar">
        <div class="search">
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索 邮箱 / 昵称…"
            aria-label="搜索用户"
          />
          <select v-model="isAdminFilter" aria-label="角色筛选">
            <option value="all">全部角色</option>
            <option value="admin">仅管理员</option>
            <option value="user">仅普通用户</option>
          </select>
        </div>
      </section>

      <!-- 桌面端表格 -->
      <section v-if="loading" class="empty">加载中…</section>
      <section v-else-if="items.length === 0" class="empty">暂无用户</section>
      <section v-else class="table-wrap">
        <table class="user-table">
          <thead>
            <tr>
              <th>#</th>
              <th>邮箱</th>
              <th>昵称</th>
              <th>角色</th>
              <th class="num">借阅中</th>
              <th>注册时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in items" :key="u.id">
              <td class="num">#{{ u.id }}</td>
              <td class="email" :title="u.email">{{ u.email }}</td>
              <td>{{ u.displayName }}</td>
              <td>
                <span class="role-tag" :class="u.isAdmin ? 'role-tag--admin' : 'role-tag--user'">
                  {{ u.isAdmin ? '管理员' : '用户' }}
                </span>
              </td>
              <td class="num">{{ u.borrowedCount }}</td>
              <td>{{ fmt(u.createdAt) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- 移动端卡片视图（同数据，宽屏隐藏） -->
        <ul class="card-list">
          <li v-for="u in items" :key="u.id" class="user-card">
            <div class="user-card__head">
              <span class="user-card__name">{{ u.displayName }}</span>
              <span class="role-tag" :class="u.isAdmin ? 'role-tag--admin' : 'role-tag--user'">
                {{ u.isAdmin ? '管理员' : '用户' }}
              </span>
            </div>
            <div class="user-card__email">{{ u.email }}</div>
            <div class="user-card__meta">
              <span>#{{ u.id }}</span>
              <span>借阅中 {{ u.borrowedCount }}</span>
              <span>{{ fmt(u.createdAt) }}</span>
            </div>
          </li>
        </ul>
      </section>

      <nav v-if="totalPages > 1" class="pagination" aria-label="分页">
        <button class="btn" :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
        <span class="page-info">{{ page }} / {{ totalPages }}</span>
        <button class="btn" :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
      </nav>
    </main>
  </div>
</template>

<style scoped>
.page { min-height: 100vh; }
.container { max-width: 1100px; margin: 0 auto; padding: 1.25rem 1.25rem 3rem; }

.page-head { margin-bottom: 1rem; }
.page-head h1 { margin: 0 0 0.2rem; font-size: 1.4rem; }
.hint { margin: 0; color: var(--color-text-soft); font-size: 0.85rem; }

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.search { display: flex; gap: 0.5rem; flex-wrap: wrap; }
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

.table-wrap {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.user-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.user-table th,
.user-table td {
  padding: 0.7rem 0.85rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}
.user-table th {
  background: var(--color-bg, #fafafa);
  font-weight: 600;
  color: var(--color-text-soft);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.user-table tr:last-child td { border-bottom: 0; }
.user-table .num { font-variant-numeric: tabular-nums; }
.user-table .email {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-tag {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}
.role-tag--admin {
  background: rgba(124, 58, 237, 0.12);
  color: var(--color-primary);
}
.role-tag--user {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-soft);
}

.empty {
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: 3rem 1rem;
  text-align: center;
  color: var(--color-text-soft);
}

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

.btn {
  appearance: none;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 0.45rem 0.9rem;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn:not(:disabled):hover { border-color: var(--color-primary); color: var(--color-primary); }

/* 移动端卡片（< 600px 显示） */
.card-list {
  display: none;
  list-style: none;
  padding: 0;
  margin: 0;
}
.user-card {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-border);
}
.user-card:last-child { border-bottom: 0; }
.user-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.3rem;
}
.user-card__name { font-weight: 600; }
.user-card__email {
  color: var(--color-text-soft);
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-card__meta {
  display: flex;
  gap: 0.85rem;
  margin-top: 0.5rem;
  font-size: 0.82rem;
  color: var(--color-text-soft);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 600px) {
  .user-table { display: none; }
  .card-list { display: block; }
  .search input { width: 100%; }
}
</style>
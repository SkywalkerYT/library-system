<script setup lang="ts">
import { computed } from 'vue';
import { useBooksStore } from '@/stores/books';

const books = useBooksStore();

const borrowedRate = computed(() => {
  const total = books.stats.total;
  if (total <= 0) return 0;
  return Math.round((books.stats.borrowed / total) * 100);
});
</script>

<template>
  <section class="stats-panel" aria-label="馆藏实时数据">
    <div class="stats-grid">
      <div class="stat-tile">
        <span class="stat-label">在馆</span>
        <span class="stat-value available">{{ books.stats.available }}</span>
      </div>
      <div class="stat-tile">
        <span class="stat-label">借出</span>
        <span class="stat-value borrowed">{{ books.stats.borrowed }}</span>
      </div>
      <div class="stat-tile">
        <span class="stat-label">总数</span>
        <span class="stat-value total">{{ books.stats.total }}</span>
      </div>
    </div>
    <div class="stats-bar" aria-hidden="true">
      <div class="stats-bar__fill" :style="{ width: borrowedRate + '%' }"></div>
    </div>
    <p class="stats-foot">借出率 {{ borrowedRate }}%（基于全库总数，不受搜索 / 筛选影响）</p>
  </section>
</template>

<style scoped>
.stats-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}
.stats-grid {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.stat-tile {
  flex: 1 1 0;
  min-width: 0;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.stat-label {
  font-size: 0.82rem;
  color: var(--color-text-soft);
  letter-spacing: 0.04em;
}
.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.stat-value.available { color: var(--color-success); }
.stat-value.borrowed  { color: var(--color-warning); }
.stat-value.total     { color: var(--color-primary); }
.stats-bar {
  margin-top: 0.85rem;
  height: 4px;
  background: var(--color-bg);
  border-radius: 999px;
  overflow: hidden;
}
.stats-bar__fill {
  height: 100%;
  background: var(--color-warning);
  transition: width 0.3s ease;
}
.stats-foot {
  margin: 0.5rem 0 0;
  font-size: 0.78rem;
  color: var(--color-text-soft);
}
@media (max-width: 600px) {
  .stats-grid { flex-direction: column; }
}
</style>

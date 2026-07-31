<script setup lang="ts">
// AppHeader：左侧品牌 + 右侧账户菜单（点击头像展开账户信息/退出登录）
import { useAuthStore } from '@/stores/auth';
import AccountMenu from './AccountMenu.vue';

const auth = useAuthStore();
</script>

<template>
  <header class="app-header">
    <div class="brand">📚 我的小书库 · Online</div>
    <div class="meta" v-if="auth.user">
      <AccountMenu />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1.5rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.brand {
  font-weight: 700;
  color: var(--color-primary);
  font-size: 1.05rem;
}
.meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
</style>
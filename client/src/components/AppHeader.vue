<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

function logout() {
  auth.clear();
  router.replace('/login');
}
</script>

<template>
  <header class="app-header">
    <div class="brand">📚 我的小书库 · Online</div>
    <div class="meta" v-if="auth.user">
      <span class="display-name">{{ auth.user.displayName }}</span>
      <button class="btn btn--ghost" @click="logout">退出登录</button>
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
  font-size: 0.9rem;
  color: var(--color-text-soft);
}
.display-name { color: var(--color-text); font-weight: 500; }
</style>

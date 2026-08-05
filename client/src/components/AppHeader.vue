<script setup lang="ts">
// AppHeader：左侧品牌 + （admin 路由下的）返回首页按钮 + 右侧账户菜单
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AccountMenu from './AccountMenu.vue';

const auth = useAuthStore();
const route = useRoute();

// ★ admin 路由下显示「返回首页」按钮
//   - 单一来源：未来 /admin/* 任何子页自动受益
//   - 非 admin 用户即便 URL 强行进入也会被 router.beforeEach 拦在 /books
//   - 双保险：auth.user.isAdmin 二次校验（避免路由 meta 未来被改）
const showBackHome = computed(
  () => auth.user?.isAdmin === true && route.path.startsWith('/admin')
);
</script>

<template>
  <header class="app-header">
    <div class="left">
      <div class="brand">📚 我的小书库 · Online</div>
      <!--
        ★ admin 路由专属：router-link 自带键盘可达（Tab + Enter）
          - 不会出现于普通用户页面
          - 未来加 /admin/books 等子页零改动
      -->
      <router-link
        v-if="showBackHome"
        to="/books"
        class="back-home"
        aria-label="返回首页"
      >
        ← 返回首页
      </router-link>
    </div>
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
/* ★ 把 brand 和 back-home 合成一个 left group，与 right meta 形成 space-between */
.left {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
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

/* ★ 新增：「← 返回首页」按钮
     视觉上接近次级操作（淡紫边框、悬停高亮），不抢品牌风头 */
.back-home {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  text-decoration: none;
  font-size: 0.88rem;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
  white-space: nowrap;
}
.back-home:hover,
.back-home:focus-visible {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(124, 58, 237, 0.06);
  outline: none;
}
</style>
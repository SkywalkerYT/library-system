<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { avatarFor } from '@/utils/avatar';

const router = useRouter();
const auth = useAuthStore();

// ============================================
// 状态
// ============================================
const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

// ============================================
// 计算
// ============================================
const avatar = computed(() => avatarFor(auth.user));

// 把 ISO 时间格式化成 yyyy-MM-dd 显示；不传原始 ISO 串，避免时区歧义
const memberSince = computed(() => {
  const iso = auth.user?.createdAt;
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});

// ============================================
// 行为
// ============================================
function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function logout() {
  auth.clear();
  close();
  router.replace('/login');
}

// ★ 跳管理员页：先关浮层再 push，避免浮层 DOM 残留
function goAdmin() {
  close();
  router.push('/admin/users');
}

/**
 * 点击组件外部关闭浮层 —— 用 contains 判断
 * ★ 注意：trigger 上用 @click.stop 防自爆
 */
function onDocumentClick(e: MouseEvent) {
  if (!open.value) return;
  const root = rootRef.value;
  if (root && !root.contains(e.target as Node)) close();
}

/**
 * Esc 关闭 —— 浮层打开时按 Esc 等同于关闭
 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    close();
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div class="account-menu" ref="rootRef">
    <!-- ★ 触发按钮：圆形头像，点击切换浮层；@click.stop 防止冒泡到 document -->
    <button
      type="button"
      class="trigger"
      :aria-expanded="open"
      aria-haspopup="menu"
      aria-label="账户菜单"
      @click.stop="toggle"
    >
      <span class="avatar avatar--sm" :style="{ background: avatar.color }">{{ avatar.initials }}</span>
    </button>

    <!-- ★ 浮层：absolute 定位到触发器右下 -->
    <div v-if="open" class="popover" role="menu" aria-label="账户信息">
      <!-- 头部：大头像 + 昵称 + 邮箱 -->
      <div class="popover-head">
        <span class="avatar avatar--lg" :style="{ background: avatar.color }">{{ avatar.initials }}</span>
        <div class="who">
          <div class="name">{{ auth.user?.displayName }}</div>
          <div class="email" :title="auth.user?.email">{{ auth.user?.email }}</div>
        </div>
      </div>

      <!-- 中部：元信息 -->
      <div class="popover-body">
        <div class="row">
          <span class="row-label">注册时间</span>
          <span class="row-value">{{ memberSince || '—' }}</span>
        </div>
        <div class="row">
          <span class="row-label">用户 ID</span>
          <span class="row-value">#{{ auth.user?.id }}</span>
        </div>
      </div>

      <!-- 底部：操作 -->
      <div class="popover-foot">
        <!-- ★ admin 入口：路由层 beforeEach 已拦截非 admin（防御性 UX 隐藏） -->
        <button
          v-if="auth.user?.isAdmin"
          class="btn btn--ghost btn--block"
          type="button"
          @click="goAdmin"
        >
          管理员面板
        </button>
        <button class="btn btn--ghost btn--block" type="button" @click="logout">退出登录</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   容器与触发器
   ============================================ */
.account-menu { position: relative; }

.trigger {
  appearance: none;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 999px;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.trigger:hover { border-color: var(--color-border); }
.trigger:active { transform: scale(0.96); }
.trigger:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ============================================
   头像（两处复用：触发器 sm、浮头 lg）
   ============================================ */
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 600;
  user-select: none;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
.avatar--sm {
  width: 34px;
  height: 34px;
  font-size: 0.88rem;
}
.avatar--lg {
  width: 44px;
  height: 44px;
  font-size: 1.05rem;
  flex-shrink: 0;
}

/* ============================================
   浮层
   ============================================ */
.popover {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 260px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
  z-index: 20;
  overflow: hidden;
  animation: popover-in 0.12s ease-out;
}

@keyframes popover-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.popover-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 0.9rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.who { min-width: 0; flex: 1; }
.name {
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95rem;
}
.email {
  font-size: 0.78rem;
  color: var(--color-text-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.1rem;
}

.popover-body {
  padding: 0.6rem 0.9rem;
}
.row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  padding: 0.3rem 0;
}
.row-label { color: var(--color-text-soft); }
.row-value {
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.popover-foot {
  padding: 0.6rem 0.9rem 0.9rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg, transparent);
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
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.btn--ghost:hover {
  background: var(--color-bg, #f7f7fa);
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.btn--block { width: 100%; }
</style>
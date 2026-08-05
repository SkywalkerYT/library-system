<script setup lang="ts">
// ============================================
// 同步状态指示器(顶部右上角)
// ============================================
// 显示三态:
//   - 🟢 在线 + 队列空 → 隐藏
//   - 🟡 在线 + 队列有 → "X 条待同步"
//   - 🔴 离线 → "离线模式 · 改动将在联网后自动同步"
//   - ⚫ 队列死信 → "X 条同步失败,点击重试"
//
// 设计:不要太显眼,但关键时刻一定要看到

import { ref, onMounted, onUnmounted } from 'vue';

const status = ref<{
  online: boolean;
  pending: number;
  dead: number;
}>({ online: true, pending: 0, dead: 0 });

async function refresh() {
  // @ts-ignore
  status.value = await window.api.getSyncStatus();
}

let interval: number | null = null;

onMounted(() => {
  refresh();
  interval = window.setInterval(refresh, 5000);  // 每 5 秒刷新

  // @ts-ignore
  window.api.onNetworkChange((online: boolean) => {
    status.value.online = online;
    if (online) refresh();  // 联网后立即检查队列
  });

  // @ts-ignore
  window.api.onSyncComplete((info) => {
    if (info.total || info.count) refresh();
  });
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});

async function manualSync() {
  // @ts-ignore
  await window.api.triggerSync();
  await refresh();
}
</script>

<template>
  <div class="sync-status" v-if="!status.online || status.pending > 0 || status.dead > 0">
    <!-- 离线 -->
    <span v-if="!status.online" class="badge badge--offline">
      🔴 离线模式 · 改动将在联网后自动同步
    </span>

    <!-- 有待同步 -->
    <span v-else-if="status.pending > 0" class="badge badge--pending">
      🟡 {{ status.pending }} 条待同步
    </span>

    <!-- 死信 -->
    <span v-if="status.dead > 0" class="badge badge--dead" @click="manualSync">
      ⚫ {{ status.dead }} 条同步失败,点击重试
    </span>
  </div>
</template>

<style scoped>
.sync-status {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  cursor: default;
}
.badge--offline { background: #fee; color: #c00; }
.badge--pending { background: #ffd; color: #a80; }
.badge--dead { background: #ddd; color: #333; cursor: pointer; }
</style>
<script setup lang="ts">
/**
 * 管理员批量上传图书封面
 *  ★ 文件名约定：cover-{4位ID}.{jpg|png|webp}
 *    → 拖入整个「my covers」文件夹即可，服务端按 originalname 解析 bookId
 *  ★ 单次 ≤20 张、单张 ≤5MB（服务端 multer 限制）
 *  ★ 路由 beforeEach + 后端模块级 requireAdmin 双重守卫
 */
import { computed, ref } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import { adminApi } from '@/api/admin';
import type { CoverBatchResult } from '@/types';

// ============================================
// 状态
// ============================================
const files = ref<File[]>([]);
const replace = ref(false);
const uploading = ref(false);
const result = ref<CoverBatchResult | null>(null);
const errMsg = ref('');

const dragOver = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);
const inputDirEl = ref<HTMLInputElement | null>(null);

// 本地预览缩略图（URL.createObjectURL）—— 上传成功后用 result.items[].coverUrl
const previews = computed(() =>
  files.value.map((f) => ({
    name: f.name,
    size: f.size,
    url: URL.createObjectURL(f),
  }))
);

// ★ 防内存泄漏：URL.createObjectURL 创建的 blob URL 在组件卸载时要 revoke
import { onBeforeUnmount } from 'vue';
onBeforeUnmount(() => {
  previews.value.forEach((p) => URL.revokeObjectURL(p.url));
});

// ============================================
// 文件筛选 / 解析
// ============================================
// 服务端的解析规则前端预演一次：cover-XXXX.{jpg|jpeg|png|webp}
//   - 容错：全角单引号 U+2019、空格、下划线、大小写都接受
//   - 不通过的文件会进 result.errors[].reason = FILENAME_PARSE_FAILED
function parseBookIdFromFilename(filename: string): number | null {
  const cleaned = filename
    .normalize('NFKC')
    .replace(/[\s_'’‘""]/g, '')
    .toLowerCase();
  const m = cleaned.match(/^cover-?(\d+)\.(jpg|jpeg|png|webp)$/);
  if (!m) return null;
  const id = parseInt(m[1] ?? '0', 10);
  return id > 0 ? id : null;
}

const validCount = computed(() => files.value.filter((f) => parseBookIdFromFilename(f.name) !== null).length);
const invalidCount = computed(() => files.value.length - validCount.value);

const totalSizeMB = computed(() => {
  const total = files.value.reduce((sum, f) => sum + f.size, 0);
  return (total / 1024 / 1024).toFixed(1);
});

// ============================================
// 拖拽 / 选择
// ============================================
function preventDefaults(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function onDragEnter(e: DragEvent) {
  preventDefaults(e);
  dragOver.value = true;
}
function onDragOver(e: DragEvent) {
  preventDefaults(e);
  dragOver.value = true;
}
function onDragLeave(e: DragEvent) {
  preventDefaults(e);
  dragOver.value = false;
}

/**
 * 拖拽释放：递归取所有 file
 *   - drop file：直接拿
 *   - drop directory（webkitGetAsEntry）：递归读 directory
 */
async function onDrop(e: DragEvent) {
  preventDefaults(e);
  dragOver.value = false;
  const dt = e.dataTransfer;
  if (!dt) return;

  const collected: File[] = [];
  const items = dt.items;
  const first = items[0];
  if (items && items.length && first && 'webkitGetAsEntry' in first) {
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it) continue;
      const entry = it.webkitGetAsEntry();
      if (entry) entries.push(entry);
    }
    await Promise.all(entries.map((entry) => walkEntry(entry, collected)));
  } else {
    for (let i = 0; i < dt.files.length; i++) {
      const f = dt.files[i];
      if (f) collected.push(f);
    }
  }
  mergeFiles(collected);
}

/**
 * 递归走 FileSystemEntry
 *   - file → 收集 leaf file
 *   - directory → 递归 reader.readEntries
 */
async function walkEntry(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (entry.isFile) {
    const file: File = await new Promise((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject)
    );
    out.push(file);
    return;
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // ★ readEntries 必须循环调用：浏览器一次最多返回 100 条
    const all: FileSystemEntry[] = [];
    while (true) {
      const batch: FileSystemEntry[] = await new Promise((resolve, reject) =>
        reader.readEntries(resolve, reject)
      );
      if (batch.length === 0) break;
      all.push(...batch);
    }
    await Promise.all(all.map((child) => walkEntry(child, out)));
  }
}

function onPickFiles(e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.files) return;
  mergeFiles(Array.from(target.files));
  // ★ 清空 value，允许再次选同一批文件
  target.value = '';
}

function mergeFiles(incoming: File[]) {
  // ★ 过滤掉目录伪项 + 重复名
  const imageOnly = incoming.filter((f) => f.type.startsWith('image/'));
  const seen = new Set(files.value.map((f) => f.name));
  const fresh = imageOnly.filter((f) => !seen.has(f.name));
  files.value = [...files.value, ...fresh];
  result.value = null;
  errMsg.value = '';
}

function clearAll() {
  files.value = [];
  result.value = null;
  errMsg.value = '';
}

function removeOne(name: string) {
  files.value = files.value.filter((f) => f.name !== name);
  if (files.value.length === 0) result.value = null;
}

// ============================================
// 上传
// ============================================
async function upload() {
  if (files.value.length === 0) return;
  uploading.value = true;
  errMsg.value = '';
  result.value = null;
  try {
    // ★ 一次最多 20 张（后端 multer.array('files', 20) 限制），
    //   超了就分批顺序上传
    const BATCH = 20;
    const chunks: File[][] = [];
    for (let i = 0; i < files.value.length; i += BATCH) {
      chunks.push(files.value.slice(i, i + BATCH));
    }

    const merged: CoverBatchResult = {
      total: 0,
      success: 0,
      failed: 0,
      items: [],
      errors: [],
    };
    for (const chunk of chunks) {
      const r = await adminApi.batchUploadCovers(chunk, replace.value);
      merged.total += r.total;
      merged.success += r.success;
      merged.failed += r.failed;
      merged.items.push(...r.items);
      merged.errors.push(...r.errors);
    }
    result.value = merged;
  } catch (e) {
    const err = e as { message?: string };
    errMsg.value = err.message ?? '上传失败';
  } finally {
    uploading.value = false;
  }
}

// 失败原因 → 中文标签
function reasonLabel(reason: string): string {
  switch (reason) {
    case 'FILENAME_PARSE_FAILED': return '文件名无法解析';
    case 'BOOK_NOT_FOUND': return '图书不存在';
    case 'ALREADY_HAS_COVER': return '已有封面';
    case 'UNSUPPORTED_MEDIA_TYPE': return '格式不支持';
    case 'NO_FILE': return '未收到文件';
    case 'BAD_ID': return 'ID 非法';
    case 'FORBIDDEN': return '无权限';
    default: return reason;
  }
}
</script>

<template>
  <div class="page">
    <AppHeader />
    <main class="container">
      <header class="page-head">
        <h1>批量上传图书封面</h1>
        <p class="hint">
          命名约定：<code>cover-XXXX.jpg</code>（如 <code>cover-0042.jpg</code>）。
          拖入整个「my covers」文件夹或点下方按钮选择文件。
        </p>
      </header>

      <!-- 拖拽区 -->
      <div
        class="dropzone"
        :class="{ 'dropzone--over': dragOver }"
        role="button"
        tabindex="0"
        @dragenter="onDragEnter"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @click="inputEl?.click()"
        @keydown.enter="inputEl?.click()"
        @keydown.space.prevent="inputEl?.click()"
      >
        <div class="dropzone-icon">📁</div>
        <div class="dropzone-text">
          <strong>拖入文件夹 / 图片</strong>
          <span>或点击此处选择文件（可多选）</span>
        </div>
        <div class="dropzone-actions">
          <button type="button" class="btn btn--primary" @click.stop="inputEl?.click()">
            选择文件
          </button>
          <button type="button" class="btn" @click.stop="inputDirEl?.click()">
            选择整个文件夹
          </button>
        </div>
        <input
          ref="inputEl"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          class="visually-hidden"
          @change="onPickFiles"
        />
        <input
          ref="inputDirEl"
          type="file"
          multiple
          webkitdirectory
          directory
          class="visually-hidden"
          @change="onPickFiles"
        />
      </div>

      <!-- 工具栏：选项 + 统计 + 操作 -->
      <section v-if="files.length > 0 || result" class="toolbar">
        <label class="opt">
          <input v-model="replace" type="checkbox" />
          覆盖已有封面（默认跳过）
        </label>
        <div class="stats">
          已选 <strong>{{ files.length }}</strong> 张
          <span v-if="invalidCount > 0" class="stat-warn">
            · 命名不符 <strong>{{ invalidCount }}</strong> 张
          </span>
          · 总 <strong>{{ totalSizeMB }} MB</strong>
        </div>
        <div class="actions">
          <button
            type="button"
            class="btn btn--primary"
            :disabled="uploading || files.length === 0"
            @click="upload"
          >
            {{ uploading ? '上传中…' : '开始上传' }}
          </button>
          <button type="button" class="btn" :disabled="uploading" @click="clearAll">
            清空
          </button>
        </div>
      </section>

      <!-- 错误提示 -->
      <p v-if="errMsg" class="alert alert--err" role="alert">{{ errMsg }}</p>

      <!-- 预览列表 -->
      <section v-if="files.length > 0" class="preview">
        <h2 class="section-title">待上传（{{ files.length }}）</h2>
        <ul class="thumb-grid">
          <li v-for="p in previews" :key="p.name" class="thumb">
            <img :src="p.url" :alt="p.name" loading="lazy" />
            <div class="thumb-meta">
              <span class="thumb-name" :title="p.name">{{ p.name }}</span>
              <button type="button" class="thumb-remove" aria-label="移除" @click="removeOne(p.name)">×</button>
            </div>
            <span
              v-if="parseBookIdFromFilename(p.name) === null"
              class="thumb-warn"
              title="文件名无法解析为 cover-{id}.{ext}"
            >
              ⚠ 命名不符
            </span>
          </li>
        </ul>
      </section>

      <!-- 结果面板 -->
      <section v-if="result" class="result">
        <h2 class="section-title">上传结果</h2>
        <div class="result-summary">
          <span class="badge badge--ok">✓ 成功 {{ result.success }}</span>
          <span v-if="result.failed > 0" class="badge badge--err">✗ 失败 {{ result.failed }}</span>
          <span class="badge badge--mute">共 {{ result.total }}</span>
        </div>

        <!-- 成功列表 -->
        <details v-if="result.items.length > 0" open class="result-block">
          <summary>成功 {{ result.items.length }} 张</summary>
          <ul class="result-list">
            <li v-for="item in result.items" :key="item.id" class="result-row">
              <img :src="item.coverUrl" :alt="`cover-${item.id}`" class="result-thumb" />
              <span class="result-id">#{{ String(item.id).padStart(4, '0') }}</span>
              <span class="result-url" :title="item.coverUrl">{{ item.coverUrl }}</span>
              <span v-if="item.replaced" class="tag tag--replaced">已覆盖</span>
            </li>
          </ul>
        </details>

        <!-- 失败列表 -->
        <details v-if="result.errors.length > 0" class="result-block">
          <summary>失败 {{ result.errors.length }} 张</summary>
          <ul class="result-list">
            <li v-for="(err, i) in result.errors" :key="i" class="result-row result-row--err">
              <span class="result-thumb result-thumb--empty">✗</span>
              <span class="result-id" v-if="err.bookId">#{{ String(err.bookId).padStart(4, '0') }}</span>
              <span class="result-id" v-else>—</span>
              <span class="result-url">{{ err.filename }}</span>
              <span class="tag tag--err">{{ reasonLabel(err.reason) }}</span>
              <span class="err-msg" :title="err.message">{{ err.message }}</span>
            </li>
          </ul>
        </details>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page { min-height: 100vh; }
.container { max-width: 1100px; margin: 0 auto; padding: 1.25rem 1.25rem 3rem; }

.page-head { margin-bottom: 1rem; }
.page-head h1 { margin: 0 0 0.3rem; font-size: 1.4rem; }
.hint { margin: 0; color: var(--color-text-soft); font-size: 0.88rem; }
.hint code {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  font-size: 0.85em;
}

.visually-hidden {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}

.dropzone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  padding: 2.5rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.dropzone:hover, .dropzone:focus-visible {
  border-color: var(--color-primary);
  outline: none;
}
.dropzone--over {
  border-color: var(--color-primary);
  background: rgba(124, 58, 237, 0.06);
  border-style: solid;
}
.dropzone-icon { font-size: 2.4rem; }
.dropzone-text { display: flex; flex-direction: column; gap: 0.2rem; }
.dropzone-text strong { font-size: 1.05rem; }
.dropzone-text span { color: var(--color-text-soft); font-size: 0.85rem; }
.dropzone-actions { display: flex; gap: 0.6rem; margin-top: 0.5rem; }

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  margin: 1rem 0;
  padding: 0.85rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.opt { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; }
.stats { color: var(--color-text-soft); font-size: 0.9rem; flex: 1; }
.stats strong { color: var(--color-text); }
.stat-warn { color: #b45309; }
.actions { display: flex; gap: 0.5rem; }

.btn {
  appearance: none;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.btn:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.btn--primary:hover:not(:disabled) { opacity: 0.9; color: #fff; }

.alert {
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  margin: 0.5rem 0;
}
.alert--err {
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.25);
  color: #b91c1c;
}

.section-title { margin: 1.5rem 0 0.6rem; font-size: 1rem; color: var(--color-text-soft); font-weight: 600; }

.preview {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}
.thumb-grid {
  list-style: none;
  padding: 0; margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.7rem;
}
.thumb {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}
.thumb img {
  width: 100%;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  background: #f0f0f3;
}
.thumb-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0.5rem;
  font-size: 0.72rem;
}
.thumb-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.thumb-remove {
  appearance: none;
  background: transparent;
  border: 0;
  color: var(--color-text-soft);
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  padding: 0 0.2rem;
}
.thumb-remove:hover { color: #b91c1c; }
.thumb-warn {
  position: absolute;
  top: 0.3rem; left: 0.3rem;
  background: rgba(180, 83, 9, 0.92);
  color: #fff;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.68rem;
}

.result {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem 1.2rem;
}
.result-summary { display: flex; gap: 0.5rem; margin-bottom: 0.8rem; }
.badge {
  display: inline-block;
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
}
.badge--ok { background: rgba(22, 163, 74, 0.12); color: #15803d; }
.badge--err { background: rgba(220, 38, 38, 0.12); color: #b91c1c; }
.badge--mute { background: rgba(0, 0, 0, 0.06); color: var(--color-text-soft); }

.result-block { margin-top: 0.5rem; }
.result-block summary {
  cursor: pointer;
  font-weight: 500;
  padding: 0.4rem 0;
}
.result-list {
  list-style: none;
  padding: 0; margin: 0.4rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.result-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.5rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
}
.result-row--err { background: rgba(220, 38, 38, 0.05); }
.result-thumb {
  width: 36px; height: 54px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}
.result-thumb--empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
  font-weight: 600;
}
.result-id {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  min-width: 50px;
}
.result-url {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-soft);
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.8rem;
}
.tag {
  font-size: 0.72rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  flex-shrink: 0;
}
.tag--replaced { background: rgba(124, 58, 237, 0.12); color: var(--color-primary); }
.tag--err { background: rgba(220, 38, 38, 0.12); color: #b91c1c; }
.err-msg {
  color: var(--color-text-soft);
  font-size: 0.78rem;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

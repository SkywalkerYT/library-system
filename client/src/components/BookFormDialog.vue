<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Book } from '@/types';
import { booksApi } from '@/api/books';
import { FALLBACK_COVER } from '@/utils/coverFallback';

const props = defineProps<{
  open: boolean;
  book: Book | null; // null = 创建模式
}>();

// ============================================
// 提交 payload
//   - coverUrl:        最终封面 URL（已上传 / 已输入 / null = 清除 / 不变）
//   - coverChanged:    true = 让父组件把 coverUrl 写进 PATCH/POST payload
//                     false = 用户没动封面，让父组件保持服务端原值
// ============================================
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: {
    title: string;
    author: string;
    category: string;
    summary: string | null;
    coverUrl: string | null;
    coverChanged: boolean;
  }): void;
}>();

const title = ref('');
const author = ref('');
const category = ref('');
const summary = ref('');
const error = ref('');
const submitting = ref(false);

// ★ 封面状态机：4 态互斥
//   - 'none'      完全没封面（新建 / 清空目标）
//   - 'existing'  编辑模式继承旧封面（用户没动）
//   - 'upload'    用户挑了文件，等 submit 时上传
//   - 'url'       用户手填 /api/covers/... 路径
const coverMode = ref<'none' | 'existing' | 'upload' | 'url'>('none');
const coverFile = ref<File | null>(null);
const coverFilePreview = ref<string | null>(null); // URL.createObjectURL
const coverUrlInput = ref('');
const coverError = ref('');

// ★ 与服务端 books.schema.ts 同步：只允许 /api/covers/<uuid>.<ext>
const COVER_PATH_RE = /^\/api\/covers\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i;

watch(
  () => [props.open, props.book] as const,
  ([open, book]) => {
    if (!open) return;
    title.value = book?.title ?? '';
    author.value = book?.author ?? '';
    category.value = book?.category ?? '';
    summary.value = book?.summary ?? '';
    error.value = '';
    coverError.value = '';
    revokePreview();
    coverFile.value = null;
    coverFilePreview.value = null;
    coverUrlInput.value = '';
    if (book?.coverUrl) {
      coverMode.value = 'existing';
    } else {
      coverMode.value = 'none';
    }
  },
  { immediate: true }
);

// ★ 预览对象：3 种来源，1 个出口
const coverPreviewSrc = computed<string | null>(() => {
  if (coverMode.value === 'upload' && coverFilePreview.value) return coverFilePreview.value;
  if (coverMode.value === 'url' && coverUrlInput.value) return coverUrlInput.value;
  if (coverMode.value === 'existing' && props.book?.coverUrl) return props.book.coverUrl;
  return null;
});

const isValid = computed(
  () => title.value.trim().length > 0 && author.value.trim().length > 0 && category.value.trim().length > 0
);

// ★ 模式切换：互斥清理，避免状态残留
function onPickFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (!f) return;
  revokePreview();
  coverFile.value = f;
  coverFilePreview.value = URL.createObjectURL(f);
  coverUrlInput.value = '';
  coverError.value = '';
  coverMode.value = 'upload';
}

function onUrlInput(e: Event) {
  const v = (e.target as HTMLInputElement).value.trim();
  coverUrlInput.value = v;
  if (v && !COVER_PATH_RE.test(v)) {
    coverError.value = '路径需为 /api/covers/<uuid>.{jpg|jpeg|png|webp}';
  } else {
    coverError.value = '';
  }
  if (v && COVER_PATH_RE.test(v)) {
    revokePreview();
    coverFile.value = null;
    coverMode.value = 'url';
  }
}

function clearCover() {
  revokePreview();
  coverFile.value = null;
  coverFilePreview.value = null;
  coverUrlInput.value = '';
  coverError.value = '';
  coverMode.value = 'none';
}

function keepExisting() {
  // 编辑模式：从 upload/url 退回 existing
  revokePreview();
  coverFile.value = null;
  coverFilePreview.value = null;
  coverUrlInput.value = '';
  coverError.value = '';
  coverMode.value = 'existing';
}

function revokePreview() {
  if (coverFilePreview.value) {
    URL.revokeObjectURL(coverFilePreview.value);
  }
}

async function submit() {
  if (!isValid.value || submitting.value) return;
  submitting.value = true;
  error.value = '';
  coverError.value = '';
  try {
    let coverUrl: string | null = null;
    let coverChanged = false;

    if (coverMode.value === 'upload') {
      if (!coverFile.value) {
        coverError.value = '请选择封面文件';
        submitting.value = false;
        return;
      }
      // ★ 上传文件 → 拿到 /api/covers/<uuid>.<ext> 路径，再随 payload 写进 DB
      const r = await booksApi.uploadCover(coverFile.value);
      coverUrl = r.coverUrl;
      coverChanged = true;
    } else if (coverMode.value === 'url') {
      if (!COVER_PATH_RE.test(coverUrlInput.value)) {
        coverError.value = '路径格式不合法';
        submitting.value = false;
        return;
      }
      coverUrl = coverUrlInput.value;
      coverChanged = true;
    } else if (coverMode.value === 'none') {
      // 用户点了"清除"，且原本没有封面（none）→ 无需改
      // 用户点了"清除"，原本有封面（existing → none）→ 改为 null
      if (props.book?.coverUrl) {
        coverUrl = null;
        coverChanged = true;
      }
    } else {
      // existing：用户没动，沿用服务端原值
      coverUrl = props.book?.coverUrl ?? null;
      coverChanged = false;
    }

    emit('submit', {
      title: title.value.trim(),
      author: author.value.trim(),
      category: category.value.trim(),
      summary: summary.value.trim() || null,
      coverUrl,
      coverChanged,
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : '提交失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-mask" @click.self="emit('close')">
      <div class="modal-card" role="dialog">
        <header class="modal-card__header">
          <span>{{ book ? '编辑图书' : '新增图书' }}</span>
          <button class="btn btn--ghost" @click="emit('close')">✕</button>
        </header>
        <div class="modal-card__body">
          <div class="field">
            <label>书名 *</label>
            <input v-model="title" maxlength="120" placeholder="如：深入理解计算机系统" />
          </div>
          <div class="field">
            <label>作者 *</label>
            <input v-model="author" maxlength="80" placeholder="如：Randal E. Bryant" />
          </div>
          <div class="field">
            <label>分类 *</label>
            <input v-model="category" maxlength="40" placeholder="如：计算机 / 文学 / 历史" />
          </div>
          <div class="field">
            <label>简介（可选）</label>
            <textarea v-model="summary" rows="3" maxlength="500" placeholder="一句话说明这本书讲什么"></textarea>
          </div>

          <!-- ★ 封面：模式切换 + 预览 + 操作按钮 -->
          <div class="field">
            <label>封面（可选）</label>
            <div class="cover-row">
              <div class="cover-preview">
                <img
                  v-if="coverPreviewSrc"
                  :src="coverPreviewSrc"
                  :alt="title || '封面预览'"
                  @error="coverError = '封面加载失败，请检查路径或换一张'"
                />
                <div v-else class="cover-placeholder">
                  <span>暂无封面</span>
                </div>
              </div>
              <div class="cover-controls">
                <!-- 编辑模式且有旧封面 → 提供"保留"按钮，让用户明确表态 -->
                <button
                  v-if="book?.coverUrl && coverMode !== 'existing'"
                  type="button"
                  class="btn btn--ghost btn--small"
                  @click="keepExisting"
                >
                  ↩ 保留原封面
                </button>

                <label class="btn btn--ghost btn--small">
                  📁 选择图片…
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    @change="onPickFile"
                  />
                </label>

                <div class="cover-url-input">
                  <input
                    :value="coverUrlInput"
                    @input="onUrlInput"
                    placeholder="/api/covers/<uuid>.jpg"
                    spellcheck="false"
                  />
                </div>

                <button
                  v-if="coverMode !== 'none' || book?.coverUrl"
                  type="button"
                  class="btn btn--ghost btn--small danger"
                  @click="clearCover"
                >
                  🗑 清除封面
                </button>
              </div>
            </div>
            <p v-if="coverError" class="error error--inline">{{ coverError }}</p>
            <p class="hint">支持 jpg / png / webp，单张 ≤ 5MB；只能引用本站 /api/covers/ 路径</p>
          </div>

          <p v-if="error" class="error">{{ error }}</p>
        </div>
        <footer class="modal-card__footer">
          <button class="btn" @click="emit('close')">取消</button>
          <button class="btn btn--primary" @click="submit" :disabled="!isValid || submitting">
            {{ submitting ? '提交中…' : (book ? '保存' : '新增') }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cover-row {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
}
.cover-preview {
  width: 96px;
  height: 128px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface-2, #f3f4f6);
  border: 1px dashed var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cover-placeholder {
  font-size: 0.78rem;
  color: var(--color-text-soft);
  text-align: center;
  padding: 0 0.4rem;
}
.cover-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}
.btn--small {
  padding: 0.3rem 0.55rem;
  font-size: 0.8rem;
  align-self: flex-start;
}
/* ★ file input 藏在 label 里 */
.cover-controls label.btn {
  cursor: pointer;
}
.cover-controls input[type='file'] {
  display: none;
}
.cover-url-input input {
  width: 100%;
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.85rem;
}
.btn.danger { color: var(--color-danger); }
.error--inline {
  margin-top: 0.4rem;
  margin-bottom: 0;
}
.hint {
  margin: 0.4rem 0 0;
  font-size: 0.78rem;
  color: var(--color-text-soft);
}
</style>
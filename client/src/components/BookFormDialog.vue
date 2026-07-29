<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Book } from '@/types';

const props = defineProps<{
  open: boolean;
  book: Book | null; // null = 创建模式
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: { title: string; author: string; category: string; summary: string | null }): void;
}>();

const title = ref('');
const author = ref('');
const category = ref('');
const summary = ref('');
const error = ref('');
const submitting = ref(false);

watch(
  () => [props.open, props.book],
  () => {
    if (props.open) {
      title.value = props.book?.title ?? '';
      author.value = props.book?.author ?? '';
      category.value = props.book?.category ?? '';
      summary.value = props.book?.summary ?? '';
      error.value = '';
    }
  },
  { immediate: true }
);

const isValid = computed(
  () => title.value.trim().length > 0 && author.value.trim().length > 0 && category.value.trim().length > 0
);

async function submit() {
  if (!isValid.value || submitting.value) return;
  submitting.value = true;
  error.value = '';
  try {
    emit('submit', {
      title: title.value.trim(),
      author: author.value.trim(),
      category: category.value.trim(),
      summary: summary.value.trim() || null,
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
          <p v-if="error" class="error">{{ error }}</p>
        </div>
        <footer class="modal-card__footer">
          <button class="btn" @click="emit('close')">取消</button>
          <button class="btn btn--primary" @click="submit" :disabled="!isValid || submitting">
            {{ book ? '保存' : '新增' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

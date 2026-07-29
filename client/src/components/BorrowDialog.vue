<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Book } from '@/types';

const props = defineProps<{
  open: boolean;
  book: Book | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (
    e: 'submit',
    payload: { borrowerName: string; borrowerPhone: string; dueAt: string }
  ): void;
}>();

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

const borrowerName = ref('');
const borrowerPhone = ref('');
const dueAt = ref(defaultDueDate());
const error = ref('');

watch(
  () => [props.open, props.book],
  () => {
    if (props.open) {
      borrowerName.value = '';
      borrowerPhone.value = '';
      dueAt.value = defaultDueDate();
      error.value = '';
    }
  },
  { immediate: true }
);

const phoneValid = computed(() => /^[\d\s\-+()]{5,20}$/.test(borrowerPhone.value.trim()));
const nameValid = computed(() => borrowerName.value.trim().length > 0);
const dateValid = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueAt.value && new Date(dueAt.value) > today;
});

const isValid = computed(() => nameValid.value && phoneValid.value && dateValid.value);

async function submit() {
  if (!isValid.value) return;
  error.value = '';
  try {
    emit('submit', {
      borrowerName: borrowerName.value.trim(),
      borrowerPhone: borrowerPhone.value.trim(),
      dueAt: new Date(dueAt.value).toISOString(),
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : '提交失败';
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-mask" @click.self="emit('close')">
      <div class="modal-card" role="dialog">
        <header class="modal-card__header">
          <span>借出 · {{ book?.title }}</span>
          <button class="btn btn--ghost" @click="emit('close')">✕</button>
        </header>
        <div class="modal-card__body">
          <div class="field">
            <label>借阅人 *</label>
            <input v-model="borrowerName" maxlength="40" placeholder="姓名" />
          </div>
          <div class="field">
            <label>联系电话 *</label>
            <input v-model="borrowerPhone" maxlength="20" placeholder="手机或固话" />
          </div>
          <div class="field">
            <label>应还日期 *</label>
            <input type="date" v-model="dueAt" :min="new Date().toISOString().slice(0, 10)" />
          </div>
          <p v-if="!nameValid && borrowerName" class="error">请填写借阅人姓名</p>
          <p v-else-if="!phoneValid && borrowerPhone" class="error">电话格式不正确</p>
          <p v-else-if="!dateValid && dueAt" class="error">应还日期必须晚于今天</p>
          <p v-else-if="error" class="error">{{ error }}</p>
        </div>
        <footer class="modal-card__footer">
          <button class="btn" @click="emit('close')">取消</button>
          <button class="btn btn--primary" @click="submit" :disabled="!isValid">确认借出</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

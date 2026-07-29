<script setup lang="ts">
defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-mask" @click.self="emit('close')">
      <div class="modal-card" role="alertdialog">
        <header class="modal-card__header">
          <span>{{ title }}</span>
          <button class="btn btn--ghost" @click="emit('close')">✕</button>
        </header>
        <div class="modal-card__body">
          <p style="margin:0">{{ message }}</p>
        </div>
        <footer class="modal-card__footer">
          <button class="btn" @click="emit('close')">{{ cancelText ?? '取消' }}</button>
          <button
            class="btn"
            :class="danger ? 'btn--danger' : 'btn--primary'"
            @click="emit('confirm')"
          >
            {{ confirmText ?? '确定' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

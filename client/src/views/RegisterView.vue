<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@/api/client';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const displayName = ref('');
const errorMsg = ref('');
const submitting = ref(false);

const isValid = computed(
  () =>
    /\S+@\S+\.\S+/.test(email.value) &&
    password.value.length >= 8 &&
    displayName.value.trim().length >= 1
);

async function submit() {
  if (!isValid.value || submitting.value) return;
  submitting.value = true;
  errorMsg.value = '';
  try {
    await auth.register(email.value.trim(), password.value, displayName.value.trim());
    router.replace('/books');
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : '注册失败，请稍后再试';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1 class="auth-title">注册 · 我的小书库</h1>
      <p class="hint">注册即获 50 本示例书目，可立即体验</p>
      <form @submit.prevent="submit">
        <div class="field">
          <label for="displayName">昵称</label>
          <input id="displayName" v-model="displayName" placeholder="想怎么称呼你？" maxlength="40" required />
        </div>
        <div class="field">
          <label for="email">邮箱</label>
          <input id="email" type="email" v-model="email" placeholder="you@example.com" autocomplete="email" required />
        </div>
        <div class="field">
          <label for="password">密码</label>
          <input id="password" type="password" v-model="password" placeholder="至少 8 位" autocomplete="new-password" required />
        </div>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        <button class="btn btn--primary auth-submit" type="submit" :disabled="!isValid || submitting">
          {{ submitting ? '注册中…' : '注 册' }}
        </button>
      </form>
      <p class="auth-foot">
        已有账号？<router-link to="/login">直接登录</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: linear-gradient(135deg, #ede9fe 0%, #f4f4f7 60%);
}
.auth-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 2rem;
  width: 100%;
  max-width: 380px;
}
.auth-title {
  font-size: 1.25rem;
  margin: 0;
  text-align: center;
  color: var(--color-primary);
}
.hint {
  text-align: center;
  font-size: 0.82rem;
  color: var(--color-text-soft);
  margin: 0.4rem 0 1.25rem;
}
.auth-submit {
  width: 100%;
  justify-content: center;
  padding: 0.65rem;
  margin-top: 0.5rem;
}
.auth-foot {
  text-align: center;
  margin: 1rem 0 0;
  color: var(--color-text-soft);
  font-size: 0.85rem;
}
.error { color: var(--color-danger); font-size: 0.85rem; margin: 0 0 0.5rem; }
</style>

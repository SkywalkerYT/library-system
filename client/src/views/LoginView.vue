<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@/api/client';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const errorMsg = ref('');
const submitting = ref(false);

const isValid = computed(() => /\S+@\S+\.\S+/.test(email.value) && password.value.length >= 8);

async function submit() {
  if (!isValid.value || submitting.value) return;
  submitting.value = true;
  errorMsg.value = '';
  try {
    await auth.login(email.value.trim(), password.value);
    const redirect = (route.query.redirect as string) || '/books';
    router.replace(redirect);
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : '登录失败，请稍后再试';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1 class="auth-title">登录 · 我的小书库</h1>
      <form @submit.prevent="submit">
        <div class="field">
          <label for="email">邮箱</label>
          <input id="email" type="email" v-model="email" placeholder="you@example.com" autocomplete="email" required />
        </div>
        <div class="field">
          <label for="password">密码</label>
          <input id="password" type="password" v-model="password" placeholder="至少 8 位" autocomplete="current-password" required />
        </div>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        <button class="btn btn--primary auth-submit" type="submit" :disabled="!isValid || submitting">
          {{ submitting ? '登录中…' : '登 录' }}
        </button>
      </form>
      <p class="auth-foot">
        还没账号？<router-link to="/register">立即注册</router-link>
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
  margin: 0 0 1.25rem;
  text-align: center;
  color: var(--color-primary);
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

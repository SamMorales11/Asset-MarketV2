<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const form = reactive({
  email: '',
  password: '',
  rememberMe: false,
});

const showPassword = ref(false);
const errorMessage = ref<string | null>(null);

async function handleSubmit() {
  if (!form.email || !form.password) {
    errorMessage.value = 'Please provide both email and password.';
    return;
  }

  errorMessage.value = null;

  try {
    await authStore.login({
      email: form.email,
      password: form.password,
    });

    const redirectPath = (route.query.redirect as string) || '/';
    router.push(redirectPath);
  } catch (err: any) {
    errorMessage.value = err?.message || 'Login failed. Please check your credentials.';
  }
}

function fillDemo(email: string, password: string) {
  form.email = email;
  form.password = password;
}
</script>

<template>
  <div class="relative flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
    <!-- Ambient radial glow behind card -->
    <div class="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-primary/15 blur-3xl"></div>

    <div class="relative w-full max-w-md">
      <!-- Auth Card Container -->
      <div class="overflow-hidden rounded-3xl border border-border bg-elevated/90 p-8 shadow-2xl backdrop-blur-xl">
        <!-- Brand Header -->
        <div class="text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 mb-4">
            <Sparkles class="h-6 w-6" />
          </div>
          <h1 class="font-heading text-4xl font-bold tracking-tight text-text-primary">
            Welcome <span class="italic text-primary">Back</span>
          </h1>
          <p class="mt-2 text-xs text-text-secondary">
            Sign in to access your digital assets, downloads, and creator earnings.
          </p>
        </div>

        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="mt-6 flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary"
        >
          <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Login Form -->
        <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
          <!-- Email Input -->
          <div>
            <label for="email" class="block text-xs font-medium text-text-secondary mb-1.5">
              Email Address
            </label>
            <div class="relative">
              <input
                id="email"
                v-model="form.email"
                type="email"
                required
                autocomplete="email"
                placeholder="name@example.com"
                class="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
              />
              <Mail class="absolute left-3.5 top-3 h-4 w-4 text-text-secondary" />
            </div>
          </div>

          <!-- Password Input -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="password" class="block text-xs font-medium text-text-secondary">
                Password
              </label>
              <a href="#" class="text-[11px] font-medium text-secondary hover:underline">
                Forgot password?
              </a>
            </div>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-10 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
              />
              <Lock class="absolute left-3.5 top-3 h-4 w-4 text-text-secondary" />
              <button
                type="button"
                class="absolute right-3 top-2.5 text-text-secondary hover:text-text-primary"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Remember Me Checkbox -->
          <div class="flex items-center justify-between pt-1">
            <label class="flex items-center gap-2 cursor-pointer text-xs text-text-secondary">
              <input
                v-model="form.rememberMe"
                type="checkbox"
                class="h-3.5 w-3.5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span>Remember this device</span>
            </label>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="authStore.isLoading"
            class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover disabled:opacity-50 transition transform active:scale-[0.99]"
          >
            <Loader2 v-if="authStore.isLoading" class="h-4 w-4 animate-spin" />
            <span v-else>Sign In</span>
            <ArrowRight v-if="!authStore.isLoading" class="h-3.5 w-3.5" />
          </button>
        </form>

        <!-- Demo Accounts Quick Fill -->
        <div class="mt-6 border-t border-border pt-4">
          <div class="text-[10px] font-semibold uppercase tracking-wider text-text-secondary text-center mb-2">
            Quick Fill Demo Accounts
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="rounded-lg border border-border bg-background py-1.5 text-[11px] text-text-secondary hover:text-text-primary hover:border-border-hover transition"
              @click="fillDemo('seller@assetmarket.com', 'Seller123!')"
            >
              Creator / Seller
            </button>
            <button
              type="button"
              class="rounded-lg border border-border bg-background py-1.5 text-[11px] text-text-secondary hover:text-text-primary hover:border-border-hover transition"
              @click="fillDemo('admin@assetmarket.com', 'Admin123!')"
            >
              Admin Staff
            </button>
          </div>
        </div>

        <!-- Footer Link -->
        <div class="mt-6 text-center text-xs text-text-secondary">
          Don't have an account yet?
          <router-link to="/register" class="font-semibold text-primary hover:underline ml-1">
            Create an account
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

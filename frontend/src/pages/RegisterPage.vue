<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false,
});

const showPassword = ref(false);
const errorMessage = ref<string | null>(null);

// Password strength calculation
const passwordStrength = computed(() => {
  const p = form.password;
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score += 25;
  if (/[A-Z]/.test(p)) score += 25;
  if (/[0-9]/.test(p)) score += 25;
  if (/[^A-Za-z0-9]/.test(p)) score += 25;
  return score;
});

const passwordStrengthColor = computed(() => {
  if (passwordStrength.value < 50) return 'bg-primary';
  if (passwordStrength.value < 100) return 'bg-amber-400';
  return 'bg-success';
});

async function handleSubmit() {
  if (!form.name || !form.email || !form.password) {
    errorMessage.value = 'Please complete all required fields.';
    return;
  }

  if (form.password.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters.';
    return;
  }

  if (form.password !== form.confirmPassword) {
    errorMessage.value = 'Passwords do not match.';
    return;
  }

  if (!form.agreeTerms) {
    errorMessage.value = 'Please accept the Terms of Service to continue.';
    return;
  }

  errorMessage.value = null;

  try {
    await authStore.register({
      name: form.name,
      email: form.email,
      password: form.password,
    });

    router.push('/');
  } catch (err: any) {
    errorMessage.value = err?.message || 'Registration failed. Please try again.';
  }
}
</script>

<template>
  <div class="relative flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
    <!-- Ambient radial glow behind card -->
    <div class="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-secondary/15 blur-3xl"></div>

    <div class="relative w-full max-w-md">
      <!-- Auth Card Container -->
      <div class="overflow-hidden rounded-3xl border border-border bg-elevated/90 p-8 shadow-2xl backdrop-blur-xl">
        <!-- Brand Header -->
        <div class="text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/20 text-secondary border border-secondary/30 mb-4">
            <Sparkles class="h-6 w-6" />
          </div>
          <h1 class="font-heading text-4xl font-bold tracking-tight text-text-primary">
            Join the <span class="italic text-primary">Marketplace</span>
          </h1>
          <p class="mt-2 text-xs text-text-secondary">
            Create an account to purchase assets or start earning 60% creator revenue.
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

        <!-- Register Form -->
        <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
          <!-- Full Name -->
          <div>
            <label for="name" class="block text-xs font-medium text-text-secondary mb-1.5">
              Full Name
            </label>
            <div class="relative">
              <input
                id="name"
                v-model="form.name"
                type="text"
                required
                autocomplete="name"
                placeholder="Alex Morgan"
                class="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
              />
              <User class="absolute left-3.5 top-3 h-4 w-4 text-text-secondary" />
            </div>
          </div>

          <!-- Email Input -->
          <div>
            <label for="reg-email" class="block text-xs font-medium text-text-secondary mb-1.5">
              Email Address
            </label>
            <div class="relative">
              <input
                id="reg-email"
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
            <label for="reg-password" class="block text-xs font-medium text-text-secondary mb-1.5">
              Password (Min. 8 characters)
            </label>
            <div class="relative">
              <input
                id="reg-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
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

            <!-- Password Strength Bar -->
            <div v-if="form.password" class="mt-2 space-y-1">
              <div class="h-1 w-full bg-border rounded-full overflow-hidden">
                <div
                  class="h-full transition-all duration-300"
                  :class="passwordStrengthColor"
                  :style="{ width: `${passwordStrength}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Confirm Password -->
          <div>
            <label for="confirm-password" class="block text-xs font-medium text-text-secondary mb-1.5">
              Confirm Password
            </label>
            <div class="relative">
              <input
                id="confirm-password"
                v-model="form.confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                placeholder="••••••••"
                class="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
              />
              <Lock class="absolute left-3.5 top-3 h-4 w-4 text-text-secondary" />
            </div>
          </div>

          <!-- Terms Checkbox -->
          <div class="pt-1">
            <label class="flex items-start gap-2.5 cursor-pointer text-xs text-text-secondary">
              <input
                v-model="form.agreeTerms"
                type="checkbox"
                required
                class="h-3.5 w-3.5 mt-0.5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span>
                I agree to the <a href="#" class="text-secondary hover:underline">Terms of Service</a>, <a href="#" class="text-secondary hover:underline">Privacy Policy</a>, and standard licensing agreements.
              </span>
            </label>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="authStore.isLoading"
            class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover disabled:opacity-50 transition transform active:scale-[0.99]"
          >
            <Loader2 v-if="authStore.isLoading" class="h-4 w-4 animate-spin" />
            <span v-else>Create Account</span>
            <ArrowRight v-if="!authStore.isLoading" class="h-3.5 w-3.5" />
          </button>
        </form>

        <!-- Perks List -->
        <div class="mt-6 border-t border-border pt-4 space-y-1.5 text-[11px] text-text-secondary">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="h-3.5 w-3.5 text-success shrink-0" />
            <span>Instant access to purchased assets & lifetime updates</span>
          </div>
          <div class="flex items-center gap-2">
            <CheckCircle2 class="h-3.5 w-3.5 text-secondary shrink-0" />
            <span>60% earnings for verified creators with automated ledger</span>
          </div>
        </div>

        <!-- Footer Link -->
        <div class="mt-6 text-center text-xs text-text-secondary">
          Already have an account?
          <router-link to="/login" class="font-semibold text-primary hover:underline ml-1">
            Sign in
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

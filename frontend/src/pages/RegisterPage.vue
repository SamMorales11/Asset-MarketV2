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

const fieldErrors = reactive<Record<string, string>>({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeTerms: '',
});

const showPassword = ref(false);
const errorMessage = ref<string | null>(null);

function validateName() {
  if (!form.name.trim()) {
    fieldErrors.name = 'Full name is required.';
  } else if (form.name.trim().length < 2) {
    fieldErrors.name = 'Name must be at least 2 characters.';
  } else {
    fieldErrors.name = '';
  }
}

function validateEmail() {
  if (!form.email.trim()) {
    fieldErrors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    fieldErrors.email = 'Please enter a valid email address.';
  } else {
    fieldErrors.email = '';
  }
}

function validatePassword() {
  if (!form.password) {
    fieldErrors.password = 'Password is required.';
  } else if (form.password.length < 8) {
    fieldErrors.password = 'Password must be at least 8 characters.';
  } else {
    fieldErrors.password = '';
  }
  if (form.confirmPassword) {
    validateConfirmPassword();
  }
}

function validateConfirmPassword() {
  if (!form.confirmPassword) {
    fieldErrors.confirmPassword = 'Confirmation password is required.';
  } else if (form.confirmPassword !== form.password) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  } else {
    fieldErrors.confirmPassword = '';
  }
}

function validateTerms() {
  if (!form.agreeTerms) {
    fieldErrors.agreeTerms = 'You must agree to the Terms of Service to continue.';
  } else {
    fieldErrors.agreeTerms = '';
  }
}

const isFormValid = computed(() => {
  return (
    form.name.trim().length >= 2 &&
    form.email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
    form.password.length >= 8 &&
    form.confirmPassword === form.password &&
    form.agreeTerms &&
    !fieldErrors.name &&
    !fieldErrors.email &&
    !fieldErrors.password &&
    !fieldErrors.confirmPassword &&
    !fieldErrors.agreeTerms
  );
});

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
  validateName();
  validateEmail();
  validatePassword();
  validateConfirmPassword();
  validateTerms();

  if (
    fieldErrors.name ||
    fieldErrors.email ||
    fieldErrors.password ||
    fieldErrors.confirmPassword ||
    fieldErrors.agreeTerms
  ) {
    return;
  }

  errorMessage.value = null;

  try {
    await authStore.register({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    });

    router.push('/');
  } catch (err: any) {
    if (err?.fieldErrors) {
      if (err.fieldErrors.name) fieldErrors.name = err.fieldErrors.name[0];
      if (err.fieldErrors.email) fieldErrors.email = err.fieldErrors.email[0];
      if (err.fieldErrors.password) fieldErrors.password = err.fieldErrors.password[0];
    }
    if (err?.message?.toLowerCase().includes('already registered')) {
      fieldErrors.email = 'This email is already registered. Please sign in instead.';
    }
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
                @input="validateName"
                @blur="validateName"
                type="text"
                required
                autocomplete="name"
                placeholder="Alex Morgan"
                class="w-full rounded-xl border bg-background py-2.5 pl-10 pr-4 text-xs text-text-primary placeholder-text-secondary focus:outline-none transition"
                :class="fieldErrors.name ? 'border-primary ring-1 ring-primary' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary'"
              />
              <User class="absolute left-3.5 top-3 h-4 w-4 text-text-secondary" />
            </div>
            <p v-if="fieldErrors.name" class="mt-1 text-[11px] text-primary flex items-center gap-1">
              <span>{{ fieldErrors.name }}</span>
            </p>
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
                @input="validateEmail"
                @blur="validateEmail"
                type="email"
                required
                autocomplete="email"
                placeholder="name@example.com"
                class="w-full rounded-xl border bg-background py-2.5 pl-10 pr-4 text-xs text-text-primary placeholder-text-secondary focus:outline-none transition"
                :class="fieldErrors.email ? 'border-primary ring-1 ring-primary' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary'"
              />
              <Mail class="absolute left-3.5 top-3 h-4 w-4 text-text-secondary" />
            </div>
            <p v-if="fieldErrors.email" class="mt-1 text-[11px] text-primary flex items-center gap-1">
              <span>{{ fieldErrors.email }}</span>
            </p>
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
                @input="validatePassword"
                @blur="validatePassword"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                placeholder="••••••••"
                class="w-full rounded-xl border bg-background py-2.5 pl-10 pr-10 text-xs text-text-primary placeholder-text-secondary focus:outline-none transition"
                :class="fieldErrors.password ? 'border-primary ring-1 ring-primary' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary'"
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
            <p v-if="fieldErrors.password" class="mt-1 text-[11px] text-primary flex items-center gap-1">
              <span>{{ fieldErrors.password }}</span>
            </p>

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
                @input="validateConfirmPassword"
                @blur="validateConfirmPassword"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                placeholder="••••••••"
                class="w-full rounded-xl border bg-background py-2.5 pl-10 pr-4 text-xs text-text-primary placeholder-text-secondary focus:outline-none transition"
                :class="fieldErrors.confirmPassword ? 'border-primary ring-1 ring-primary' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary'"
              />
              <Lock class="absolute left-3.5 top-3 h-4 w-4 text-text-secondary" />
            </div>
            <p v-if="fieldErrors.confirmPassword" class="mt-1 text-[11px] text-primary flex items-center gap-1">
              <span>{{ fieldErrors.confirmPassword }}</span>
            </p>
          </div>

          <!-- Terms Checkbox -->
          <div class="pt-1">
            <label class="flex items-start gap-2.5 cursor-pointer text-xs text-text-secondary">
              <input
                v-model="form.agreeTerms"
                @change="validateTerms"
                type="checkbox"
                required
                class="h-3.5 w-3.5 mt-0.5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span>
                I agree to the <a href="#" class="text-secondary hover:underline">Terms of Service</a>, <a href="#" class="text-secondary hover:underline">Privacy Policy</a>, and standard licensing agreements.
              </span>
            </label>
            <p v-if="fieldErrors.agreeTerms" class="mt-1 text-[11px] text-primary flex items-center gap-1">
              <span>{{ fieldErrors.agreeTerms }}</span>
            </p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="!isFormValid || authStore.isLoading"
            class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-[0.99]"
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

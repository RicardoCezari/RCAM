<template>
  <div class="min-h-screen bg-[#f5f5f7] text-slate-900">
    <!-- background decor -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div class="absolute left-0 top-0 h-72 w-72 rounded-full bg-black/[0.04] blur-3xl"></div>
      <div class="absolute right-0 top-0 h-80 w-80 rounded-full bg-black/[0.06] blur-3xl"></div>
      <div class="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-black/[0.04] blur-3xl"></div>
    </div>

    <!-- overlay mobile -->
    <transition name="fade">
      <div
        v-if="isMobileMenuOpen"
        class="fixed inset-0 z-30 bg-black/20 md:hidden"
        @click="isMobileMenuOpen = false"
      ></div>
    </transition>

    <!-- overlay user menu -->
    <div
      v-if="isUserMenuOpen"
      class="fixed inset-0 z-30 hidden md:block"
      @click="isUserMenuOpen = false"
    ></div>

    <!-- header -->
    <header
      ref="headerRef"
      class="sticky top-0 z-40 border-b border-black/10 bg-black/95 text-white backdrop-blur"
    >
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <!-- brand -->
        <RouterLink to="/" class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
            <span class="text-sm font-semibold tracking-wide text-white">Az</span>
          </div>
        </RouterLink>

        <!-- desktop nav -->
        <nav class="hidden items-center gap-1 md:flex">
          <RouterLink
            to="/nova-os"
            class="rounded-xl px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            active-class="bg-white/10 !text-white"
          >
            Nova O.S.
          </RouterLink>
          <RouterLink
            to="/listar-clientes"
            class="rounded-xl px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            active-class="bg-white/10 !text-white"
          >
            Listar clientes
          </RouterLink>
          <RouterLink
            to="/listar-os"
            class="rounded-xl px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            active-class="bg-white/10 !text-white"
          >
            Listar O.S.
          </RouterLink>
        </nav>

        <!-- right actions -->
        <div class="flex items-center gap-2">
          <!-- desktop user menu -->
          <div class="relative hidden md:block">
            <button
              type="button"
              class="group flex items-center gap-3 rounded-2xl px-3 py-2"
              @click="toggleUserMenu"
            >
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-semibold text-black shadow-[0_0_14px_rgba(255,255,255,0.35)] ring-1 ring-white/70 transition duration-200 group-hover:-translate-y-[1px] group-hover:scale-[1.03] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                {{ iniciais }}
              </div>
              <div class="hidden lg:block">
                <p class="text-sm font-medium leading-none">{{ nomeUsuario }}</p>
                <p class="mt-1 text-xs text-white/55">Minha conta</p>
              </div>
            </button>

            <transition name="user-menu">
              <div
                v-if="isUserMenuOpen"
                class="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
              >
                <div class="border-b border-white/10 px-4 py-4">
                  <p class="text-sm font-semibold text-white">{{ nomeUsuario }}</p>
                  <p class="mt-1 text-xs text-white/50">{{ authStore.usuario?.login }}</p>
                </div>
                <div class="p-2">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-[#ffb4b4] transition hover:bg-white/10 hover:text-white"
                    @click="handleLogout"
                  >
                    <span>Sair</span>
                    <span class="mdi mdi-logout text-[18px] text-[#ffb4b4]/80"></span>
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <!-- mobile button -->
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10 transition hover:bg-white/15 md:hidden"
            @click="toggleMobileMenu"
          >
            <span
              :class="[
                'mdi text-[22px] transition-all duration-300',
                isMobileMenuOpen ? 'mdi-close rotate-90' : 'mdi-menu',
              ]"
            ></span>
          </button>
        </div>
      </div>

      <!-- mobile dropdown -->
      <transition name="mobile-menu">
        <div
          v-if="isMobileMenuOpen"
          class="absolute left-0 top-full z-40 w-full border-t border-white/10 bg-black/95 md:hidden"
        >
          <div class="px-4 py-3">
            <nav class="flex flex-col">
              <RouterLink
                to="/nova-os"
                class="flex items-center justify-between border-b border-white/10 py-4 text-[15px] font-medium text-white/85 transition hover:text-white"
                @click="isMobileMenuOpen = false"
              >
                <span>Nova O.S.</span>
                <span class="mdi mdi-chevron-right text-[18px] text-white/45"></span>
              </RouterLink>
              <RouterLink
                to="/listar-clientes"
                class="flex items-center justify-between border-b border-white/10 py-4 text-[15px] font-medium text-white/85 transition hover:text-white"
                @click="isMobileMenuOpen = false"
              >
                <span>Listar clientes</span>
                <span class="mdi mdi-chevron-right text-[18px] text-white/45"></span>
              </RouterLink>
              <RouterLink
                to="/listar-os"
                class="flex items-center justify-between border-b border-white/10 py-4 text-[15px] font-medium text-white/85 transition hover:text-white"
                @click="isMobileMenuOpen = false"
              >
                <span>Listar O.S.</span>
                <span class="mdi mdi-chevron-right text-[18px] text-white/45"></span>
              </RouterLink>

              <div class="mt-4 border-t border-white/25 pt-4">
                <button
                  type="button"
                  class="flex w-full items-center justify-between py-4 text-left text-[15px] font-medium text-[#ffb4b4] transition hover:text-white"
                  @click="handleLogout"
                >
                  <span>Sair</span>
                  <span class="mdi mdi-logout text-[18px] text-[#ffb4b4]/80"></span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      </transition>
    </header>

    <!-- page content -->
    <main
      :class="[
        'relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
        fullHeight
          ? 'flex flex-col pb-4'
          : 'py-6 sm:py-8 lg:py-10',
      ]"
      :style="fullHeight ? { height: 'calc(100dvh - ' + headerHeight + 'px)' } : {}"
    >
      <slot />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

defineProps({
  fullHeight: { type: Boolean, default: false },
})

const router = useRouter()
const authStore = useAuthStore()

const headerRef    = ref(null)
const headerHeight = ref(76)

function updateHeaderHeight() {
  if (headerRef.value) headerHeight.value = headerRef.value.offsetHeight
}

onMounted(() => {
  updateHeaderHeight()
  window.addEventListener('resize', updateHeaderHeight)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateHeaderHeight)
})

const isMobileMenuOpen = ref(false)
const isUserMenuOpen   = ref(false)

function toggleMobileMenu() { isMobileMenuOpen.value = !isMobileMenuOpen.value }
function toggleUserMenu()   { isUserMenuOpen.value   = !isUserMenuOpen.value   }

function handleLogout() {
  isUserMenuOpen.value = false
  isMobileMenuOpen.value = false
  authStore.logout()
  router.push({ name: 'login' })
}

const iniciais   = computed(() => (authStore.usuario?.nome || '').slice(0, 2).toUpperCase() || '?')
const nomeUsuario = computed(() => authStore.usuario?.nome || '')
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

.mobile-menu-enter-active,
.mobile-menu-leave-active,
.user-menu-enter-active,
.user-menu-leave-active { transition: all 0.24s ease; }

.mobile-menu-enter-from,
.mobile-menu-leave-to,
.user-menu-enter-from,
.user-menu-leave-to { opacity: 0; transform: translateY(-8px); }
</style>

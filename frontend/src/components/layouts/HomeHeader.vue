<template>
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
    class="sticky top-0 z-40 border-b border-black/10 bg-black/95 text-white backdrop-blur"
  >
    <div
      class="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:gap-6 lg:px-8 xl:px-10 2xl:px-12"
    >
      <!-- brand -->
      <div class="flex min-w-0 items-center gap-3 lg:flex-[0_0_auto]">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10"
        >
          <span class="text-sm font-semibold tracking-wide text-white"></span>
        </div>
      </div>

      <!-- desktop nav -->
      <nav
        class="hidden flex-1 items-center justify-center gap-1 lg:flex xl:gap-2 2xl:gap-3"
      >
        <RouterLink
          to="/nova-os"
          class="rounded-xl px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white xl:px-5 2xl:px-6"
        >
          Nova O.S.
        </RouterLink>

        <RouterLink
          to="/listar-clientes"
          class="rounded-xl px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white xl:px-5 2xl:px-6"
        >
          Listar clientes
        </RouterLink>

        <RouterLink
          to="/listar-os"
          class="rounded-xl px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white xl:px-5 2xl:px-6"
        >
          Listar O.S.
        </RouterLink>
      </nav>

      <!-- right actions -->
      <div
        class="flex items-center justify-end gap-2 lg:min-w-[72px] xl:min-w-[88px]"
      >
        <!-- desktop user menu -->
        <div class="relative hidden md:block">
          <button
            type="button"
            class="group flex items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-white/5"
            @click="toggleUserMenu"
          >
            <div
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-semibold text-black shadow-[0_0_14px_rgba(255,255,255,0.35)] ring-1 ring-white/70 transition duration-200 group-hover:-translate-y-[1px] group-hover:scale-[1.03] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.5)]"
            >
              GA
            </div>
          </button>

          <transition name="user-menu">
            <div
              v-if="isUserMenuOpen"
              class="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
            >
              <div class="border-b border-white/10 px-4 py-4">
                <p class="text-sm font-semibold text-white">
                  Gabriel Albuquerque Silva
                </p>
                <p class="mt-1 text-xs text-white/50">ADMIN</p>
              </div>

              <div class="p-2">
                <RouterLink
                  to="/administracao"
                  class="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                  @click="isUserMenuOpen = false"
                >
                  <span>Administracao</span>
                  <span
                    class="mdi mdi-cog-outline text-[18px] text-white/45"
                  ></span>
                </RouterLink>

                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-[#ffb4b4] transition hover:bg-white/10 hover:text-white"
                  @click="isUserMenuOpen = false"
                >
                  <span>Sair</span>
                  <span
                    class="mdi mdi-logout text-[18px] text-[#ffb4b4]/80"
                  ></span>
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
              <span
                class="mdi mdi-chevron-right text-[18px] text-white/45"
              ></span>
            </RouterLink>

            <RouterLink
              to="/listar-clientes"
              class="flex items-center justify-between border-b border-white/10 py-4 text-[15px] font-medium text-white/85 transition hover:text-white"
              @click="isMobileMenuOpen = false"
            >
              <span>Listar clientes</span>
              <span
                class="mdi mdi-chevron-right text-[18px] text-white/45"
              ></span>
            </RouterLink>

            <RouterLink
              to="/listar-os"
              class="flex items-center justify-between border-b border-white/10 py-4 text-[15px] font-medium text-white/85 transition hover:text-white"
              @click="isMobileMenuOpen = false"
            >
              <span>Listar O.S.</span>
              <span
                class="mdi mdi-chevron-right text-[18px] text-white/45"
              ></span>
            </RouterLink>

            <div class="mt-4 border-t border-white/25 pt-4">
              <RouterLink
                to="/administração"
                class="flex items-center justify-between py-4 text-[15px] font-medium text-white/75 transition hover:text-white"
                @click="isMobileMenuOpen = false"
              >
                <span>Administração</span>
                <span
                  class="mdi mdi-cog-outline text-[18px] text-white/45"
                ></span>
              </RouterLink>

              <button
                type="button"
                class="flex w-full items-center justify-between py-4 text-left text-[15px] font-medium text-[#ffb4b4] transition hover:text-white"
                @click="isMobileMenuOpen = false"
              >
                <span>Sair</span>
                <span
                  class="mdi mdi-logout text-[18px] text-[#ffb4b4]/80"
                ></span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </transition>
  </header>
</template>

<script setup>
import { ref } from "vue";

const isMobileMenuOpen = ref(false);
const isUserMenuOpen = ref(false);

function toggleMobileMenu() {
  isUserMenuOpen.value = false;
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
}

function toggleUserMenu() {
  isMobileMenuOpen.value = false;
  isUserMenuOpen.value = !isUserMenuOpen.value;
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.mobile-menu-enter-active,
.mobile-menu-leave-active,
.user-menu-enter-active,
.user-menu-leave-active {
  transition: all 0.24s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to,
.user-menu-enter-from,
.user-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

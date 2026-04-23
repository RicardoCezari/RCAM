<template>
  <section
    class="overflow-hidden rounded-[32px] border border-black/10 bg-gradient-to-br from-black via-[#111111] to-[#1a1a1a] text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
  >
    <div class="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
      <div class="relative px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div
          class="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/5 blur-3xl"
        ></div>

        <div class="relative">
          <p
            v-if="eyebrow"
            class="text-sm font-medium uppercase tracking-[0.18em] text-white/50"
          >
            {{ eyebrow }}
          </p>

          <h2
            class="mt-4 max-w-2xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl xl:text-[42px]"
          >
            {{ title }}
          </h2>

          <p
            v-if="description"
            class="mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base"
          >
            {{ description }}
          </p>

          <div
            v-if="$slots.actions"
            class="mt-6 flex flex-wrap items-center gap-3"
          >
            <slot name="actions" />
          </div>
        </div>
      </div>

      <div v-if="$slots.aside" class="relative hidden lg:block">
        <slot name="aside" />
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  eyebrow: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
});
</script>

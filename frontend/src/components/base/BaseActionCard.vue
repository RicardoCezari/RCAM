<template>
  <RouterLink
    :to="to"
    class="group block h-full overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
  >
    <div
      :class="[
        'flex h-full flex-col border-b border-black/5 px-4 py-4 text-white sm:px-6 sm:py-5',
        contentClass,
      ]"
    >
      <div class="flex items-center justify-between gap-4">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 sm:h-14 sm:w-14"
        >
          <span :class="['mdi text-[24px] sm:text-[28px]', icon]"></span>
        </div>

        <span
          class="mdi mdi-arrow-top-right text-[20px] text-white/50 sm:text-[22px]"
        ></span>
      </div>

      <h4 class="mt-4 text-base font-semibold sm:mt-5 sm:text-xl">
        {{ title }}
      </h4>

      <p
        v-if="description"
        class="mt-2 text-xs leading-5 text-white/65 sm:text-sm sm:leading-6"
      >
        {{ description }}
      </p>
    </div>
  </RouterLink>
</template>

<script setup>
defineProps({
  to: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  contentClass: {
    type: String,
    default: "bg-black",
  },
});
</script>
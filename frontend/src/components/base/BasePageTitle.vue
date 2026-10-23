<template>
  <div :class="wrapperClass">
    <h1
      :class="[
        'mt-1 text-2xl font-semibold tracking-tight text-black sm:mt-4 sm:text-4xl',
        titleClass,
      ]"
    >
      {{ title }}
    </h1>

    <p
      v-if="description"
      :class="[
        'mt-1 max-w-2xl text-xs leading-5 text-black/55 sm:mt-2 sm:text-base sm:leading-6',
        descriptionClass,
      ]"
    >
      {{ description }}
    </p>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  class: {
    type: String,
    default: "",
  },
  titleClass: {
    type: String,
    default: "",
  },
  descriptionClass: {
    type: String,
    default: "",
  },
});

const wrapperClass = computed(() => props.class);
</script>
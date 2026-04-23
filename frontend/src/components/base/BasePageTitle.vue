<template>
  <div :class="wrapperClass">
    <h1
      :class="[
        'mt-4 text-3xl font-semibold tracking-tight text-black sm:text-4xl',
        titleClass,
      ]"
    >
      {{ title }}
    </h1>

    <p
      v-if="description"
      :class="[
        'mt-2 max-w-2xl text-sm leading-6 text-black/55 sm:text-base',
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
<template>
  <div class="flex h-14 overflow-hidden rounded-2xl border border-black/10 bg-[#fafafa] shadow-[0_4px_14px_rgba(0,0,0,0.04)] transition duration-200 focus-within:border-black focus-within:bg-white focus-within:ring-4 focus-within:ring-black/5">
    <input
      :id="id"
      :value="modelValue"
      type="number"
      :min="min"
      :max="max"
      class="w-full bg-transparent px-4 text-sm text-black outline-none [appearance:textfield]"
      @change="$emit('update:modelValue', Number($event.target.value))"
    />

    <div class="flex w-14 flex-col border-l border-black/10">
      <button
        type="button"
        class="flex flex-1 items-center justify-center text-black/60 transition hover:bg-black/5 hover:text-black"
        @click="increase"
      >
        <i class="mdi mdi-chevron-up text-lg"></i>
      </button>

      <button
        type="button"
        class="flex flex-1 items-center justify-center border-t border-black/10 text-black/60 transition hover:bg-black/5 hover:text-black"
        @click="decrease"
      >
        <i class="mdi mdi-chevron-down text-lg"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  id: { type: String, default: '' },
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
})

const emit = defineEmits(['update:modelValue'])

function increase() {
  if (props.modelValue < props.max) emit('update:modelValue', props.modelValue + 1)
}

function decrease() {
  if (props.modelValue > props.min) emit('update:modelValue', props.modelValue - 1)
}
</script>

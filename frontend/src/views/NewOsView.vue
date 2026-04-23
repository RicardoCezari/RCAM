<template>
  <section class="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
    <div class="mx-auto w-full max-w-[1680px]">
      <BasePageTitle
        class="mb-8"
        title="Nova O.S."
        description="Preencha os dados da ordem de serviço com atenção."
      />

      <div class="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
        <form class="p-6 sm:p-8">
          <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
            <BaseFormField id="cliente" label="Cliente" :label-class="labelClass">
              <BaseSelect
                id="cliente"
                v-model="form.cliente"
                :options="clienteOptions"
                placeholder="Selecione um cliente"
              />
            </BaseFormField>

            <BaseFormField id="telefone" label="Telefone do cliente" :label-class="labelClass">
              <input
                id="telefone"
                v-model="form.telefone"
                type="text"
                inputmode="numeric"
                maxlength="15"
                placeholder="(11) 00000-0000"
                class="h-14 w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-sm text-black placeholder:text-black/35 shadow-[0_4px_14px_rgba(0,0,0,0.04)] outline-none transition duration-200 focus:border-black focus:bg-white focus:ring-4 focus:ring-black/5"
                @input="onPhoneInput"
              />
            </BaseFormField>

            <BaseFormField id="objeto" label="Objeto" :label-class="labelClass">
              <input
                id="objeto"
                v-model="form.objeto"
                type="text"
                placeholder="Digite o objeto"
                class="h-14 w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-sm text-black placeholder:text-black/35 shadow-[0_4px_14px_rgba(0,0,0,0.04)] outline-none transition duration-200 focus:border-black focus:bg-white focus:ring-4 focus:ring-black/5"
              />
            </BaseFormField>

            <BaseFormField id="quantidade" label="Quantidade" :label-class="labelClass">
              <BaseQuantityStepper
                id="quantidade"
                v-model="form.quantidade"
                :min="0"
                :max="100"
              />
            </BaseFormField>

            <BaseFormField id="servico" label="Serviço" :label-class="labelClass">
              <BaseSelect
                id="servico"
                v-model="form.servico"
                :options="servicoOptions"
                placeholder="Selecione um serviço"
              />
            </BaseFormField>

            <BaseFormField id="dataEntrega" label="Data de entrega" :label-class="labelClass">
              <input
                id="dataEntrega"
                ref="dateInputRef"
                v-model="form.dataEntrega"
                type="date"
                class="h-14 w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 pr-12 text-sm text-black shadow-[0_4px_14px_rgba(0,0,0,0.04)] outline-none transition duration-200 focus:border-black focus:bg-white focus:ring-4 focus:ring-black/5"
                @click="openDatePicker"
              />
            </BaseFormField>

            <BaseFormField id="valor" label="Valor" :label-class="labelClass">
              <input
                id="valor"
                v-model="form.valor"
                type="text"
                inputmode="numeric"
                placeholder="R$ 0,00"
                class="h-14 w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-sm text-black placeholder:text-black/35 shadow-[0_4px_14px_rgba(0,0,0,0.04)] outline-none transition duration-200 focus:border-black focus:bg-white focus:ring-4 focus:ring-black/5"
                @input="onCurrencyInput"
              />
            </BaseFormField>

            <BaseFormField id="imagem" label="Adicionar imagens" :label-class="labelClass">
              <div class="flex min-h-14 items-center rounded-2xl border border-black/10 bg-[#fafafa] px-3 py-3 shadow-[0_4px_14px_rgba(0,0,0,0.04)] transition duration-200 focus-within:border-black focus-within:bg-white focus-within:ring-4 focus-within:ring-black/5">
                <input
                  id="imagem"
                  type="file"
                  accept="image/*"
                  multiple
                  class="block w-full text-sm text-black file:mr-3 file:rounded-xl file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#1a1a1a]"
                  @change="handleImageChange"
                />
              </div>
            </BaseFormField>
          </div>

          <BaseFormField id="informacaoAdicional" label="Informação adicional" :label-class="labelClass" class="mt-5">
            <textarea
              id="informacaoAdicional"
              v-model="form.informacaoAdicional"
              rows="6"
              placeholder="Digite informações adicionais"
              class="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-4 text-sm text-black placeholder:text-black/35 shadow-[0_4px_14px_rgba(0,0,0,0.04)] outline-none transition duration-200 focus:border-black focus:bg-white focus:ring-4 focus:ring-black/5"
            ></textarea>
          </BaseFormField>

          <div
            v-if="imagePreview.length"
            class="mt-6 overflow-hidden rounded-[24px] border border-black/10 bg-[#fafafa]"
          >
            <div class="border-b border-black/10 px-5 py-4">
              <p class="text-sm font-semibold text-black">Pré-visualização</p>
              <p class="mt-1 text-xs text-black/50">
                {{ imagePreview.length }}
                {{ imagePreview.length === 1 ? 'imagem adicionada' : 'imagens adicionadas' }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              <div
                v-for="(image, index) in imagePreview"
                :key="`${image.name}-${index}`"
                class="overflow-hidden rounded-2xl border border-black/10 bg-white"
              >
                <img :src="image.url" :alt="image.name" class="h-28 w-full object-cover" />
                <div class="px-3 py-2">
                  <p class="truncate text-xs font-medium text-black/70">{{ image.name }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-8 flex flex-col-reverse gap-3 border-t border-black/10 pt-6 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="submit"
              class="inline-flex h-12 items-center justify-center rounded-2xl bg-black px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition hover:-translate-y-[1px] hover:bg-[#111111]"
            >
              Salvar O.S.
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import BasePageTitle from '@/components/base/BasePageTitle.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseQuantityStepper from '@/components/base/BaseQuantityStepper.vue'

const labelClass = 'text-sm font-semibold tracking-wide text-black/80'
const dateInputRef = ref(null)

const clientes = ref([
  { id: 1, nome: 'Gabriel Albuquerque' },
  { id: 2, nome: 'Maria Oliveira' },
  { id: 3, nome: 'João Silva' },
])

const servicos = ref([
  { id: 1, nome: 'Manutenção' },
  { id: 2, nome: 'Instalação' },
  { id: 3, nome: 'Reparo' },
])

const clienteOptions = computed(() => clientes.value.map((c) => ({ value: c.nome, label: c.nome })))
const servicoOptions = computed(() => servicos.value.map((s) => ({ value: s.nome, label: s.nome })))

const form = ref({
  cliente: '',
  telefone: '',
  objeto: '',
  quantidade: 0,
  servico: '',
  dataEntrega: '',
  valor: '',
  informacaoAdicional: '',
  imagem: [],
})

const imagePreview = ref([])

function onPhoneInput(event) {
  let value = event.target.value.replace(/\D/g, '').slice(0, 11)
  if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3')
  else if (value.length > 6) value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3')
  else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2')
  else if (value.length > 0) value = value.replace(/^(\d{0,2})/, '($1')
  form.value.telefone = value
}

function onCurrencyInput(event) {
  const numericValue = event.target.value.replace(/\D/g, '')
  if (!numericValue) { form.value.valor = ''; return }
  form.value.valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(numericValue) / 100
  )
}

function openDatePicker() {
  const input = dateInputRef.value
  if (!input) return
  input.focus()
  if (typeof input.showPicker === 'function') input.showPicker()
}

function handleImageChange(event) {
  const files = Array.from(event.target.files || [])
  form.value.imagem = files
  imagePreview.value.forEach((image) => URL.revokeObjectURL(image.url))
  imagePreview.value = files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }))
}
</script>


      <div
        class="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
      >
        <form class="p-6 sm:p-8">
          <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div class="space-y-2">
              <label
                for="cliente"
                class="block text-sm font-semibold tracking-wide text-black/80"
              >
                Cliente
              </label>

              <div
                class="relative rounded-2xl border border-black/10 bg-[#fafafa] shadow-[0_4px_14px_rgba(0,0,0,0.04)] transition duration-200 focus-within:border-black focus-within:bg-white focus-within:ring-4 focus-within:ring-black/5"
              >
                <select
                  id="cliente"
                  v-model="form.cliente"
                  class="h-14 w-full appearance-none rounded-2xl bg-transparent px-4 pr-10 text-sm text-black outline-none"
                >
                  <option value="">Selecione um cliente</option>
                  <option
                    v-for="cliente in clientes"
                    :key="cliente.id"
                    :value="cliente.nome"
                  >
                    {{ cliente.nome }}
                  </option>
                </select>

                <span
                  class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/45"
                >
                  <i class="mdi mdi-chevron-down text-lg"></i>
                </span>
              </div>
            </div>

            <div class="space-y-2">
              <label
                for="telefone"
                class="block text-sm font-semibold tracking-wide text-black/80"
              >
                Telefone do cliente
              </label>
              <input
                id="telefone"
                v-model="form.telefone"
                type="text"
                inputmode="numeric"
                maxlength="15"
                placeholder="(11) 00000-0000"
                @input="onPhoneInput"
                class="h-14 w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-sm text-black placeholder:text-black/35 shadow-[0_4px_14px_rgba(0,0,0,0.04)] outline-none transition duration-200 focus:border-black focus:bg-white focus:ring-4 focus:ring-black/5"
              />
            </div>

            <div class="space-y-2">
              <label
                for="objeto"
                class="block text-sm font-semibold tracking-wide text-black/80"
              >
                Objeto
              </label>
              <input
                id="objeto"
                v-model="form.objeto"
                type="text"
                placeholder="Digite o objeto"
                class="h-14 w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-sm text-black placeholder:text-black/35 shadow-[0_4px_14px_rgba(0,0,0,0.04)] outline-none transition duration-200 focus:border-black focus:bg-white focus:ring-4 focus:ring-black/5"
              />
            </div>

            <div class="space-y-2">
              <label
                for="quantidade"
                class="block text-sm font-semibold tracking-wide text-black/80"
              >
                Quantidade
              </label>

              <div
                class="flex h-14 overflow-hidden rounded-2xl border border-black/10 bg-[#fafafa] shadow-[0_4px_14px_rgba(0,0,0,0.04)] transition duration-200 focus-within:border-black focus-within:bg-white focus-within:ring-4 focus-within:ring-black/5"
              >
                <input
                  id="quantidade"
                  v-model.number="form.quantidade"
                  type="number"
                  min="0"
                  max="100"
                  class="w-full bg-transparent px-4 text-sm text-black outline-none [appearance:textfield]"
                />

                <div class="flex w-14 flex-col border-l border-black/10">
                  <button
                    type="button"
                    class="flex flex-1 items-center justify-center text-black/60 transition hover:bg-black/5 hover:text-black"
                    @click="increaseQuantidade"
                  >
                    <i class="mdi mdi-chevron-up text-lg"></i>
                  </button>

                  <button
                    type="button"
                    class="flex flex-1 items-center justify-center border-t border-black/10 text-black/60 transition hover:bg-black/5 hover:text-black"
                    @click="decreaseQuantidade"
                  >
                    <i class="mdi mdi-chevron-down text-lg"></i>
                  </button>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <label
                for="servico"
                class="block text-sm font-semibold tracking-wide text-black/80"
              >
                Serviço
              </label>

              <div
                class="relative rounded-2xl border border-black/10 bg-[#fafafa] shadow-[0_4px_14px_rgba(0,0,0,0.04)] transition duration-200 focus-within:border-black focus-within:bg-white focus-within:ring-4 focus-within:ring-black/5"
              >
                <select
                  id="servico"
                  v-model="form.servico"
                  class="h-14 w-full appearance-none rounded-2xl bg-transparent px-4 pr-10 text-sm text-black outline-none"
                >
                  <option value="">Selecione um serviço</option>
                  <option
                    v-for="servico in servicos"
                    :key="servico.id"
                    :value="servico.nome"
                  >
                    {{ servico.nome }}
                  </option>
                </select>

                <span
                  class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/45"
                >
                  <i class="mdi mdi-chevron-down text-lg"></i>
                </span>
              </div>
            </div>

            <div class="space-y-2">
              <label
                for="dataEntrega"
                class="block text-sm font-semibold tracking-wide text-black/80"
              >
                Data de entrega
              </label>

              <div class="relative">
                <input
                  id="dataEntrega"
                  ref="dateInputRef"
                  v-model="form.dataEntrega"
                  type="date"
                  class="h-14 w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 pr-12 text-sm text-black shadow-[0_4px_14px_rgba(0,0,0,0.04)] outline-none transition duration-200 focus:border-black focus:bg-white focus:ring-4 focus:ring-black/5"
                  @click="openDatePicker"
                />
              </div>
            </div>

            <div class="space-y-2">
              <label
                for="valor"
                class="block text-sm font-semibold tracking-wide text-black/80"
              >
                Valor
              </label>
              <input
                id="valor"
                v-model="form.valor"
                type="text"
                inputmode="numeric"
                placeholder="R$ 0,00"
                @input="onCurrencyInput"
                class="h-14 w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 text-sm text-black placeholder:text-black/35 shadow-[0_4px_14px_rgba(0,0,0,0.04)] outline-none transition duration-200 focus:border-black focus:bg-white focus:ring-4 focus:ring-black/5"
              />
            </div>

            <div class="space-y-2">
              <label
                for="imagem"
                class="block text-sm font-semibold tracking-wide text-black/80"
              >
                Adicionar imagens
              </label>

              <div
                class="flex min-h-14 items-center rounded-2xl border border-black/10 bg-[#fafafa] px-3 py-3 shadow-[0_4px_14px_rgba(0,0,0,0.04)] transition duration-200 focus-within:border-black focus-within:bg-white focus-within:ring-4 focus-within:ring-black/5"
              >
                <input
                  id="imagem"
                  type="file"
                  accept="image/*"
                  multiple
                  @change="handleImageChange"
                  class="block w-full text-sm text-black file:mr-3 file:rounded-xl file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#1a1a1a]"
                />
              </div>
            </div>
          </div>

          <div class="mt-5 space-y-2">
            <label
              for="informacaoAdicional"
              class="block text-sm font-semibold tracking-wide text-black/80"
            >
              Informação adicional
            </label>
            <textarea
              id="informacaoAdicional"
              v-model="form.informacaoAdicional"
              rows="6"
              placeholder="Digite informações adicionais"
              class="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-4 text-sm text-black placeholder:text-black/35 shadow-[0_4px_14px_rgba(0,0,0,0.04)] outline-none transition duration-200 focus:border-black focus:bg-white focus:ring-4 focus:ring-black/5"
            ></textarea>
          </div>

          <div
            v-if="imagePreview.length"
            class="mt-6 overflow-hidden rounded-[24px] border border-black/10 bg-[#fafafa]"
          >
            <div class="border-b border-black/10 px-5 py-4">
              <p class="text-sm font-semibold text-black">Pré-visualização</p>
              <p class="mt-1 text-xs text-black/50">
                {{ imagePreview.length }}
                {{
                  imagePreview.length === 1
                    ? "imagem adicionada"
                    : "imagens adicionadas"
                }}
              </p>
            </div>

            <div
              class="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            >
              <div
                v-for="(image, index) in imagePreview"
                :key="`${image.name}-${index}`"
                class="overflow-hidden rounded-2xl border border-black/10 bg-white"
              >
                <img
                  :src="image.url"
                  :alt="image.name"
                  class="h-28 w-full object-cover"
                />

                <div class="px-3 py-2">
                  <p class="truncate text-xs font-medium text-black/70">
                    {{ image.name }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            class="mt-8 flex flex-col-reverse gap-3 border-t border-black/10 pt-6 sm:flex-row sm:items-center sm:justify-end"
          >
            <button
              type="submit"
              class="inline-flex h-12 items-center justify-center rounded-2xl bg-black px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition hover:-translate-y-[1px] hover:bg-[#111111]"
            >
              Salvar O.S.
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";
import BasePageTitle from "@/components/base/BasePageTitle.vue";

const dateInputRef = ref(null);

const clientes = ref([
  { id: 1, nome: "Gabriel Albuquerque" },
  { id: 2, nome: "Maria Oliveira" },
  { id: 3, nome: "João Silva" },
]);

const servicos = ref([
  { id: 1, nome: "Manutenção" },
  { id: 2, nome: "Instalação" },
  { id: 3, nome: "Reparo" },
]);

const form = ref({
  cliente: "",
  telefone: "",
  objeto: "",
  quantidade: 0,
  servico: "",
  dataEntrega: "",
  valor: "",
  informacaoAdicional: "",
  imagem: [],
});

const imagePreview = ref([]);

function onPhoneInput(event) {
  let value = event.target.value.replace(/\D/g, "").slice(0, 11);

  if (value.length > 10) {
    value = value.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
  } else if (value.length > 6) {
    value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  } else if (value.length > 2) {
    value = value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  } else if (value.length > 0) {
    value = value.replace(/^(\d{0,2})/, "($1");
  }

  form.value.telefone = value;
}

function onCurrencyInput(event) {
  const numericValue = event.target.value.replace(/\D/g, "");

  if (!numericValue) {
    form.value.valor = "";
    return;
  }

  const value = Number(numericValue) / 100;

  form.value.valor = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function increaseQuantidade() {
  if (form.value.quantidade < 100) {
    form.value.quantidade += 1;
  }
}

function decreaseQuantidade() {
  if (form.value.quantidade > 0) {
    form.value.quantidade -= 1;
  }
}

function openDatePicker() {
  const input = dateInputRef.value;

  if (!input) return;

  input.focus();

  if (typeof input.showPicker === "function") {
    input.showPicker();
  }
}

function handleImageChange(event) {
  const files = Array.from(event.target.files || []);

  form.value.imagem = files;

  imagePreview.value.forEach((image) => URL.revokeObjectURL(image.url));

  imagePreview.value = files.map((file) => ({
    name: file.name,
    url: URL.createObjectURL(file),
  }));
}
</script>

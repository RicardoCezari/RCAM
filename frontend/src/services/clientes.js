import api from './api'

export async function buscarClientePorTelefone(telefone) {
  const { data } = await api.get(`/clientes/telefone/${telefone}`)
  return data
}

export async function buscarClientePorCpf(cpf) {
  const { data } = await api.get(`/clientes/cpf/${cpf}`)
  return data
}

export async function criarCliente(payload) {
  const { data } = await api.post('/clientes', payload)
  return data
}

export async function listarClientes(params = {}) {
  const { data } = await api.get('/clientes', { params })
  return data
}

export async function buscarCliente(id) {
  const { data } = await api.get(`/clientes/${id}`)
  return data
}

export async function atualizarCliente(id, payload) {
  const { data } = await api.put(`/clientes/${id}`, payload)
  return data
}

export async function deletarCliente(id) {
  await api.delete(`/clientes/${id}`)
}


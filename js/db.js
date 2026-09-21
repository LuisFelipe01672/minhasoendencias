// Camada de dados — IndexedDB puro (sem lib externa, ver README "Por que
// sem framework/build"). Duas object stores, uma pra cada entidade, cada
// uma com `id` autoincrement (equivalente às duas tabelas SQLite da
// versão anterior deste app).
const NOME_BANCO = "minhas-pendencias";
const VERSAO_BANCO = 1;
export const STORE_PENDENCIAS = "pendencias";
export const STORE_NOTAS = "notas";

let promessaBanco = null;

function abrirBanco() {
  if (promessaBanco) return promessaBanco;
  promessaBanco = new Promise((resolve, reject) => {
    const pedido = indexedDB.open(NOME_BANCO, VERSAO_BANCO);
    pedido.onupgradeneeded = (evento) => {
      const db = evento.target.result;
      if (!db.objectStoreNames.contains(STORE_PENDENCIAS)) {
        db.createObjectStore(STORE_PENDENCIAS, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_NOTAS)) {
        db.createObjectStore(STORE_NOTAS, { keyPath: "id", autoIncrement: true });
      }
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
  return promessaBanco;
}

function comStore(nomeStore, modo) {
  return abrirBanco().then((db) => db.transaction(nomeStore, modo).objectStore(nomeStore));
}

function comoPromise(pedidoIdb) {
  return new Promise((resolve, reject) => {
    pedidoIdb.onsuccess = () => resolve(pedidoIdb.result);
    pedidoIdb.onerror = () => reject(pedidoIdb.error);
  });
}

async function listarTudo(nomeStore) {
  const store = await comStore(nomeStore, "readonly");
  return comoPromise(store.getAll());
}

async function criar(nomeStore, dados) {
  const store = await comStore(nomeStore, "readwrite");
  const id = await comoPromise(store.add(dados));
  return { ...dados, id };
}

async function atualizar(nomeStore, id, dados) {
  const store = await comStore(nomeStore, "readwrite");
  await comoPromise(store.put({ ...dados, id }));
}

async function excluir(nomeStore, id) {
  const store = await comStore(nomeStore, "readwrite");
  await comoPromise(store.delete(id));
}

async function limparERepopular(nomeStore, itens) {
  const store = await comStore(nomeStore, "readwrite");
  await comoPromise(store.clear());
  for (const item of itens) {
    await comoPromise(store.add(item));
  }
}

export const listarPendencias = () => listarTudo(STORE_PENDENCIAS);
export const criarPendencia = (dados) => criar(STORE_PENDENCIAS, dados);
export const atualizarPendencia = (id, dados) => atualizar(STORE_PENDENCIAS, id, dados);
export const excluirPendencia = (id) => excluir(STORE_PENDENCIAS, id);

export const listarNotas = () => listarTudo(STORE_NOTAS);
export const criarNota = (dados) => criar(STORE_NOTAS, dados);
export const atualizarNota = (id, dados) => atualizar(STORE_NOTAS, id, dados);
export const excluirNota = (id) => excluir(STORE_NOTAS, id);

export async function exportarTudo() {
  const [pendencias, notas] = await Promise.all([listarPendencias(), listarNotas()]);
  return { versao: VERSAO_BANCO, exportadoEm: new Date().toISOString(), pendencias, notas };
}

export async function importarTudo({ pendencias, notas }) {
  // Mantém os `id` originais do backup (não usa `criar`, que geraria ids
  // novos) — assim referências antigas continuam batendo, e reimportar o
  // mesmo backup duas vezes não duplica nada.
  await limparERepopular(STORE_PENDENCIAS, pendencias || []);
  await limparERepopular(STORE_NOTAS, notas || []);
}

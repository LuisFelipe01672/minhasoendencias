// Router bem simples por hash (#calendario, #pendencias?atrasadas=1,
// #notas?nota=5, #backup) — sem framework, cada rota é só uma função que
// recebe o container e os query params e desenha o conteúdo nele.
import { renderCalendario } from "./calendario.js";
import { renderPendencias } from "./tela-pendencias.js";
import { renderNotas } from "./tela-notas.js";
import { renderBackup } from "./backup.js";
import { bloquear, montarTelaSenha } from "./auth.js";

const ROTAS = {
  calendario: renderCalendario,
  pendencias: renderPendencias,
  notas: renderNotas,
  backup: renderBackup,
};

function rotaEParams() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [caminho, query] = hash.split("?");
  return [caminho || "calendario", new URLSearchParams(query || "")];
}

function marcarAbaAtiva(nomeRota) {
  document.querySelectorAll(".topo-nav a[data-rota]").forEach((link) => {
    link.classList.toggle("ativa", link.dataset.rota === nomeRota);
  });
}

async function renderizar() {
  const [caminho, params] = rotaEParams();
  const view = ROTAS[caminho] || renderCalendario;
  marcarAbaAtiva(caminho in ROTAS ? caminho : "calendario");
  await view(document.getElementById("conteudo"), params);
}

window.addEventListener("hashchange", renderizar);

document.getElementById("botao-sair").addEventListener("click", () => {
  if (confirm("Bloquear o app? Vai pedir a senha de novo pra abrir.")) bloquear();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}

montarTelaSenha(renderizar);

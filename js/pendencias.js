// Regras de urgência/atraso (portadas 1:1 da versão em Python) + os dois
// blocos de UI reaproveitados tanto pela aba Calendário quanto pela aba
// Pendências: a linha de uma pendência (checkbox + editar + excluir) e o
// formulário de criar uma nova.
import { atualizarPendencia, criarPendencia, excluirPendencia } from "./db.js";

const RANK_URGENCIA = { urgente: 3, media: 2, baixa: 1 };
export const URGENCIAS_VALIDAS = Object.keys(RANK_URGENCIA);

export function urgenciaValida(valor) {
  return URGENCIAS_VALIDAS.includes(valor) ? valor : "media";
}

export function hojeISO() {
  const agora = new Date();
  const semFuso = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return semFuso.toISOString().slice(0, 10);
}

function paraDataUTC(iso) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

export function estaAtrasada(pendencia) {
  return Boolean(pendencia.data) && !pendencia.concluida && pendencia.data < hojeISO();
}

export function diasAtraso(pendencia) {
  return Math.round((paraDataUTC(hojeISO()) - paraDataUTC(pendencia.data)) / 86400000);
}

export function urgenciaMaisAlta(pendencias) {
  if (!pendencias.length) return null;
  return pendencias.reduce((max, p) => (RANK_URGENCIA[p.urgencia] > RANK_URGENCIA[max.urgencia] ? p : max)).urgencia;
}

function el(tag, props = {}, filhos = []) {
  const elemento = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (chave === "class") elemento.className = valor;
    else if (chave.startsWith("on")) elemento.addEventListener(chave.slice(2), valor);
    else if (valor !== undefined && valor !== null) elemento.setAttribute(chave, valor);
  }
  for (const filho of filhos) {
    elemento.append(filho instanceof Node ? filho : document.createTextNode(filho));
  }
  return elemento;
}

function opcoesUrgencia(nomeGrupo, valorAtual) {
  const opcoes = [
    ["urgente", "Urgente"], ["media", "Média"], ["baixa", "Baixa"],
  ];
  return el("div", { class: "urgencia-opcoes" }, opcoes.map(([valor, rotulo]) => {
    const input = el("input", { type: "radio", name: nomeGrupo, value: valor });
    if (valor === valorAtual) input.checked = true;
    return el("label", { class: `urgencia-opcao urgencia-${valor}` }, [input, rotulo]);
  }));
}

/** Uma linha de pendência (checkbox de concluir, título, editar, excluir).
 * `aoMudar` é chamado depois de qualquer ação que altere o dado, pra quem
 * está exibindo a lista poder re-renderizar. */
export function linhaPendencia(pendencia, aoMudar) {
  const atrasada = estaAtrasada(pendencia);
  const linha = el("div", {
    class: `pendencia-linha urgencia-${pendencia.urgencia}${pendencia.concluida ? " concluida" : ""}`,
  });

  const checkbox = el("input", {
    type: "checkbox",
    title: "Marcar como concluída",
    onchange: async () => {
      await atualizarPendencia(pendencia.id, {
        ...pendencia,
        concluida: checkbox.checked,
        concluidaEm: checkbox.checked ? new Date().toISOString() : null,
      });
      aoMudar();
    },
  });
  checkbox.checked = pendencia.concluida;
  linha.append(checkbox);

  if (pendencia.hora) linha.append(el("span", { class: "pendencia-hora" }, [pendencia.hora]));
  linha.append(el("span", { class: "pendencia-titulo" }, [pendencia.titulo]));
  if (atrasada) {
    const dias = diasAtraso(pendencia);
    linha.append(el("span", { class: "pendencia-atraso" }, [`atrasada há ${dias} dia${dias !== 1 ? "s" : ""}`]));
  }

  const detalhes = el("details", { class: "pendencia-editar" });
  detalhes.append(el("summary", { title: "Editar" }, ["✏️"]));
  const tituloEdit = el("input", { type: "text", required: "", maxlength: "200", value: pendencia.titulo });
  const dataEdit = el("input", { type: "date", value: pendencia.data || "" });
  const horaEdit = el("input", { type: "time", value: pendencia.hora || "" });
  const formEdit = el("form", {
    class: "form-editar-pendencia",
    onsubmit: async (evento) => {
      evento.preventDefault();
      const tituloLimpo = tituloEdit.value.trim();
      if (!tituloLimpo) return;
      const dataV = dataEdit.value || null;
      await atualizarPendencia(pendencia.id, {
        ...pendencia,
        titulo: tituloLimpo,
        data: dataV,
        hora: dataV && horaEdit.value ? horaEdit.value : null,
        urgencia: urgenciaValida(new FormData(formEdit).get("urgencia")),
      });
      aoMudar();
    },
  }, [
    el("label", {}, ["Título", tituloEdit]),
    el("label", {}, ["Data", dataEdit]),
    el("label", {}, ["Horário", horaEdit]),
    el("div", { class: "campo-grupo" }, [
      el("span", { class: "campo-rotulo" }, ["Urgência"]),
      opcoesUrgencia("urgencia", pendencia.urgencia),
    ]),
    el("button", { type: "submit", class: "botao" }, ["Salvar"]),
  ]);
  detalhes.append(formEdit);
  linha.append(detalhes);

  linha.append(el("button", {
    type: "button", class: "lixeira", title: "Excluir",
    onclick: async () => {
      if (!confirm("Excluir esta pendência?")) return;
      await excluirPendencia(pendencia.id);
      aoMudar();
    },
  }, ["🗑"]));

  return linha;
}

/** Formulário "nova pendência". `data` (ISO ou null) fixa o dia quando
 * chamado a partir do painel do calendário; null quando é a lista "sem
 * data". `aoCriar` é chamado depois de salvar, pra recarregar a view. */
export function formNovaPendencia(data, aoCriar) {
  const titulo = el("input", { type: "text", name: "titulo", placeholder: "Nova pendência...", required: "", maxlength: "200" });
  const hora = data ? el("input", { type: "time", class: "campo-hora", title: "Horário (opcional)" }) : null;

  const form = el("form", {
    class: "form-nova-pendencia",
    onsubmit: async (evento) => {
      evento.preventDefault();
      const tituloLimpo = titulo.value.trim();
      if (!tituloLimpo) return;
      await criarPendencia({
        titulo: tituloLimpo,
        data: data || null,
        hora: data && hora.value ? hora.value : null,
        urgencia: urgenciaValida(new FormData(form).get("urgencia")),
        concluida: false,
        concluidaEm: null,
        criadoEm: new Date().toISOString(),
      });
      aoCriar();
    },
  }, [titulo]);
  if (hora) form.append(hora);
  form.append(el("div", { class: "campo-grupo" }, [
    el("span", { class: "campo-rotulo" }, ["Urgência"]),
    opcoesUrgencia("urgencia", "media"),
  ]));
  form.append(el("button", { type: "submit", class: "botao" }, ["Salvar"]));
  return form;
}

export { el };

// View da aba Pendências: lista sem data (+ criar nova) ou, com
// `?atrasadas=1`, a lista consolidada de atrasadas agrupada por dia.
import { listarPendencias } from "./db.js";
import { el, estaAtrasada, formNovaPendencia, linhaPendencia } from "./pendencias.js";

function dataBR(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export async function renderPendencias(container, params) {
  const modoAtrasadas = params.get("atrasadas") === "1";
  const todas = await listarPendencias();
  const recarregar = () => renderPendencias(container, params);

  container.replaceChildren();

  if (modoAtrasadas) {
    container.append(el("h1", {}, ["Pendências atrasadas"]));
    const atrasadas = todas
      .filter(estaAtrasada)
      .sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")));

    if (!atrasadas.length) {
      container.append(el("p", { class: "muted" }, ["Nenhuma pendência atrasada. 🎉"]));
      return;
    }

    const porDia = new Map();
    for (const p of atrasadas) {
      if (!porDia.has(p.data)) porDia.set(p.data, []);
      porDia.get(p.data).push(p);
    }
    for (const [dataIso, itens] of porDia) {
      const card = el("div", { class: "card" }, [el("h2", { style: "margin-top:0" }, [dataBR(dataIso)])]);
      for (const p of itens) card.append(linhaPendencia(p, recarregar));
      container.append(card);
    }
    return;
  }

  container.append(el("h1", {}, ["Pendências sem data"]));
  const semData = todas
    .filter((p) => !p.data)
    .sort((a, b) => Number(a.concluida) - Number(b.concluida) || b.criadoEm.localeCompare(a.criadoEm));

  const card = el("div", { class: "card" });
  if (!semData.length) {
    card.append(el("p", { class: "muted" }, ["Nenhuma pendência sem data."]));
  } else {
    for (const p of semData) card.append(linhaPendencia(p, recarregar));
  }
  container.append(card);
  container.append(el("h2", {}, ["Nova pendência"]));
  container.append(el("div", { class: "card" }, [formNovaPendencia(null, recarregar)]));
}

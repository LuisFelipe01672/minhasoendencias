// View da aba Notas: lista lateral + editor com autosave (debounce
// ~1.5s), mesmo comportamento da versão anterior, agora salvando no
// IndexedDB em vez de fazer PUT pro servidor.
import { atualizarNota, criarNota, excluirNota, listarNotas } from "./db.js";
import { el } from "./pendencias.js";

let timerAutosave = null;

export async function renderNotas(container, params) {
  const notas = (await listarNotas()).sort((a, b) => {
    if (a.fixada !== b.fixada) return a.fixada ? -1 : 1;
    return b.atualizadoEm.localeCompare(a.atualizadoEm);
  });

  const idParam = params.get("nota");
  let selecionada = idParam ? notas.find((n) => String(n.id) === idParam) : null;
  if (!selecionada && notas.length) selecionada = notas[0];

  const recarregar = () => renderNotas(container, params);

  container.replaceChildren();
  container.append(el("h1", {}, ["Notas"]));

  const layout = el("div", { class: "notas-layout" });
  const lista = el("aside", { class: "notas-lista" });
  lista.append(el("button", {
    type: "button", class: "botao", style: "width:100%",
    onclick: async () => {
      const nova = await criarNota({
        titulo: "Nova nota", corpo: "", fixada: false,
        criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(),
      });
      location.hash = `#notas?nota=${nova.id}`;
    },
  }, ["+ Nova nota"]));

  const ul = el("ul");
  if (!notas.length) {
    ul.append(el("li", { class: "muted", style: "padding:8px 4px" }, ["Nenhuma nota ainda."]));
  }
  for (const nota of notas) {
    const classes = [];
    if (selecionada && nota.id === selecionada.id) classes.push("ativa");
    if (nota.fixada) classes.push("fixada");
    const li = el("li", { class: classes.join(" ") });
    li.append(el("button", {
      type: "button", class: "estrela", title: nota.fixada ? "Remover destaque" : "Destacar",
      onclick: async () => { await atualizarNota(nota.id, { ...nota, fixada: !nota.fixada }); recarregar(); },
    }, [nota.fixada ? "⭐" : "☆"]));
    li.append(el("a", { href: `#notas?nota=${nota.id}` }, [nota.titulo || "Nova nota"]));
    li.append(el("button", {
      type: "button", class: "lixeira", title: "Excluir",
      onclick: async () => {
        if (!confirm("Excluir esta nota?")) return;
        await excluirNota(nota.id);
        recarregar();
      },
    }, ["🗑"]));
    ul.append(li);
  }
  lista.append(ul);
  layout.append(lista);

  const editor = el("section", { class: "notas-editor" });
  if (selecionada) {
    const campoTitulo = el("input", { type: "text", id: "nota-titulo", placeholder: "Título", value: selecionada.titulo });
    const campoCorpo = el("textarea", { id: "nota-corpo", placeholder: "Escreva aqui..." }, [selecionada.corpo]);
    const status = el("span", { id: "nota-status", class: "muted" });

    const salvar = async () => {
      status.textContent = "Salvando...";
      await atualizarNota(selecionada.id, {
        ...selecionada,
        titulo: campoTitulo.value.trim() || "Nova nota",
        corpo: campoCorpo.value,
        atualizadoEm: new Date().toISOString(),
      });
      status.textContent = "Salvo";
      const link = lista.querySelector(`a[href="#notas?nota=${selecionada.id}"]`);
      if (link) link.textContent = campoTitulo.value.trim() || "Nova nota";
      setTimeout(() => { if (status.textContent === "Salvo") status.textContent = ""; }, 3000);
    };
    const agendarSalvar = () => {
      status.textContent = "";
      clearTimeout(timerAutosave);
      timerAutosave = setTimeout(salvar, 1500);
    };
    campoTitulo.addEventListener("input", agendarSalvar);
    campoCorpo.addEventListener("input", agendarSalvar);

    editor.append(campoTitulo, campoCorpo, status);
  } else {
    editor.append(el("p", { class: "muted" }, ["Crie uma nota pra começar."]));
  }
  layout.append(editor);
  container.append(layout);
}

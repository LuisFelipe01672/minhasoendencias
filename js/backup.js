// Exportar/importar um backup manual em JSON — mitigação direta do
// trade-off aceito ao tirar o servidor: os dados só existem no IndexedDB
// deste navegador, sem isso não haveria nenhuma cópia em outro lugar.
import { exportarTudo, importarTudo } from "./db.js";
import { el } from "./pendencias.js";

export async function renderBackup(container) {
  container.replaceChildren();
  container.append(el("h1", {}, ["Backup"]));
  container.append(el("p", { class: "muted" }, [
    "Os dados deste app ficam só neste navegador/celular — sem isso, se limpar os dados do navegador ou trocar de aparelho, perde tudo. Exporte de vez em quando pra guardar uma cópia em outro lugar (e-mail pra você mesmo, Google Drive, etc.).",
  ]));

  const card = el("div", { class: "card backup-acoes" });

  const botaoExportar = el("button", { type: "button", class: "botao" }, ["⬇ Exportar backup"]);
  botaoExportar.addEventListener("click", async () => {
    const dados = await exportarTudo();
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `minhas-pendencias-backup-${dados.exportadoEm.slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  });

  const inputArquivo = el("input", { type: "file", accept: "application/json", style: "display:none" });
  const botaoImportar = el("button", { type: "button", class: "botao secundario" }, ["⬆ Importar backup"]);
  botaoImportar.addEventListener("click", () => inputArquivo.click());
  inputArquivo.addEventListener("change", async () => {
    const arquivo = inputArquivo.files[0];
    if (!arquivo) return;
    if (!confirm("Importar vai SUBSTITUIR todas as pendências e notas atuais pelas do arquivo. Continuar?")) {
      inputArquivo.value = "";
      return;
    }
    try {
      const dados = JSON.parse(await arquivo.text());
      await importarTudo(dados);
      alert("Backup importado com sucesso.");
      location.hash = "#calendario";
    } catch {
      alert("Não consegui ler esse arquivo como backup válido.");
    } finally {
      inputArquivo.value = "";
    }
  });

  card.append(botaoExportar, botaoImportar, inputArquivo);
  container.append(card);
}

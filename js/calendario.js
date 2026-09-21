// View da aba Calendário: grade do mês + painel do dia selecionado.
import { listarPendencias } from "./db.js";
import { diasAtraso, el, estaAtrasada, formNovaPendencia, hojeISO, linhaPendencia, urgenciaMaisAlta } from "./pendencias.js";

const NOMES_MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_SEMANA_EXT = [
  "domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado",
];

function paraISO(data) {
  return data.toISOString().slice(0, 10);
}

/** Semanas completas (domingo a sábado) cobrindo o mês inteiro — mesmo
 * comportamento de `calendar.Calendar(firstweekday=6).monthdatescalendar()`
 * da versão Python original. Datas construídas em UTC de propósito, pra
 * comparação por string ISO nunca sofrer de fuso horário. */
function gerarSemanasDoMes(ano, mesIndex) {
  const primeiroDoMes = new Date(Date.UTC(ano, mesIndex, 1));
  const ultimoDoMes = new Date(Date.UTC(ano, mesIndex + 1, 0));
  const inicio = new Date(primeiroDoMes);
  inicio.setUTCDate(inicio.getUTCDate() - inicio.getUTCDay());
  const fim = new Date(ultimoDoMes);
  fim.setUTCDate(fim.getUTCDate() + (6 - fim.getUTCDay()));

  const semanas = [];
  const cursor = new Date(inicio);
  while (cursor <= fim) {
    const semana = [];
    for (let i = 0; i < 7; i++) {
      semana.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    semanas.push(semana);
  }
  return semanas;
}

function deslocarMes(ano, mesIndex, deslocamento) {
  const total = mesIndex + deslocamento;
  return [ano + Math.floor(total / 12), ((total % 12) + 12) % 12];
}

function dataExtenso(iso) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const diaSemana = DIAS_SEMANA_EXT[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
  const rotulo = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
  return `${rotulo}, ${dia} de ${NOMES_MESES[mes - 1]} de ${ano}`;
}

export async function renderCalendario(container, params) {
  const hoje = hojeISO();
  const mesParam = params.get("mes");
  let ano, mesIndex;
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    const [anoStr, mesStr] = mesParam.split("-");
    ano = Number(anoStr);
    mesIndex = Number(mesStr) - 1;
  } else {
    ano = Number(hoje.slice(0, 4));
    mesIndex = Number(hoje.slice(5, 7)) - 1;
  }
  const mesAtualISO = `${ano}-${String(mesIndex + 1).padStart(2, "0")}`;
  const diaSelecionado = params.get("dia") || "";

  const todasPendencias = await listarPendencias();
  const totalAtrasadas = todasPendencias.filter(estaAtrasada).length;

  const semanas = gerarSemanasDoMes(ano, mesIndex);
  const inicioISO = paraISO(semanas[0][0]);
  const fimISO = paraISO(semanas[semanas.length - 1][6]);
  const porDia = new Map();
  for (const p of todasPendencias) {
    if (p.data && p.data >= inicioISO && p.data <= fimISO) {
      if (!porDia.has(p.data)) porDia.set(p.data, []);
      porDia.get(p.data).push(p);
    }
  }

  container.replaceChildren();

  if (totalAtrasadas > 0) {
    const plural = totalAtrasadas !== 1 ? "s" : "";
    container.append(el("a", { href: "#pendencias?atrasadas=1", class: "alerta-atraso" }, [
      `⚠ ${totalAtrasadas} pendência${plural} atrasada${plural}`,
    ]));
  }

  const [anoAnt, mesAnt] = deslocarMes(ano, mesIndex, -1);
  const [anoProx, mesProx] = deslocarMes(ano, mesIndex, 1);
  const nomeMes = NOMES_MESES[mesIndex];
  container.append(el("div", { class: "calendario-nav" }, [
    el("a", { href: `#calendario?mes=${anoAnt}-${String(mesAnt + 1).padStart(2, "0")}`, class: "botao secundario" }, ["‹"]),
    el("h1", {}, [`${nomeMes.charAt(0).toUpperCase()}${nomeMes.slice(1)} de ${ano}`]),
    el("a", { href: `#calendario?mes=${anoProx}-${String(mesProx + 1).padStart(2, "0")}`, class: "botao secundario" }, ["›"]),
  ]));

  const thead = el("thead", {}, [el("tr", {}, DIAS_SEMANA.map((d) => el("th", {}, [d])))]);
  const tbody = el("tbody");
  for (const semana of semanas) {
    const tr = el("tr");
    for (const diaData of semana) {
      const iso = paraISO(diaData);
      const pendenciasDia = porDia.get(iso) || [];
      const noMes = diaData.getUTCMonth() === mesIndex;
      const ehHoje = iso === hoje;
      const cor = urgenciaMaisAlta(pendenciasDia);
      const atraso = pendenciasDia.some(estaAtrasada);

      const classes = ["dia-cel"];
      if (!noMes) classes.push("fora-do-mes");
      if (ehHoje) classes.push("hoje");
      if (iso === diaSelecionado) classes.push("selecionado");

      const celula = el("td", {
        class: classes.join(" "),
        onclick: () => { location.hash = `#calendario?mes=${mesAtualISO}&dia=${iso}`; },
      }, [
        el("div", { class: `dia-numero${atraso ? " contorno-atraso" : ""}` }, [String(diaData.getUTCDate())]),
      ]);
      if (cor) {
        const indicadores = el("div", { class: "dia-indicadores" }, [el("span", { class: `bolinha bolinha-${cor}` })]);
        if (pendenciasDia.length > 1) indicadores.append(el("span", { class: "dia-contagem" }, [String(pendenciasDia.length)]));
        celula.append(indicadores);
      }
      tr.append(celula);
    }
    tbody.append(tr);
  }
  container.append(el("table", { class: "grade-calendario" }, [thead, tbody]));

  if (diaSelecionado) {
    const pendenciasDoDia = (porDia.get(diaSelecionado) || []).slice().sort((a, b) => {
      if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
      const horaA = a.hora || "99:99";
      const horaB = b.hora || "99:99";
      if (horaA !== horaB) return horaA < horaB ? -1 : 1;
      return a.id - b.id;
    });
    const recarregar = () => renderCalendario(container, params);
    const painel = el("div", { class: "painel-dia" }, [el("h2", {}, [dataExtenso(diaSelecionado)])]);
    if (pendenciasDoDia.length === 0) {
      painel.append(el("p", { class: "muted" }, ["Nenhuma pendência neste dia."]));
    } else {
      for (const p of pendenciasDoDia) painel.append(linhaPendencia(p, recarregar));
    }
    painel.append(formNovaPendencia(diaSelecionado, recarregar));
    container.append(painel);
  }
}

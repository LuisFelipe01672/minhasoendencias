// Tela de senha client-side. IMPORTANTE: isto NÃO é segurança de verdade
// — o app inteiro roda no navegador da pessoa, então qualquer um com
// acesso ao DevTools contorna isso facilmente. É só um freio contra abrir
// o app sem querer, ver aviso na própria tela (index.html) e no README.
const CHAVE_HASH = "mp_senha_hash";
const CHAVE_DESBLOQUEADO = "mp_desbloqueado"; // sessionStorage: pede senha de novo a cada nova sessão do navegador

async function sha256Hex(texto) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function estaDesbloqueado() {
  return sessionStorage.getItem(CHAVE_DESBLOQUEADO) === "1" && Boolean(localStorage.getItem(CHAVE_HASH));
}

export function bloquear() {
  sessionStorage.removeItem(CHAVE_DESBLOQUEADO);
  location.reload();
}

export function montarTelaSenha(aoDesbloquear) {
  const overlay = document.getElementById("tela-senha");

  if (estaDesbloqueado()) {
    overlay.hidden = true;
    aoDesbloquear();
    return;
  }

  const form = document.getElementById("form-senha");
  const campo = document.getElementById("campo-senha");
  const titulo = document.getElementById("titulo-tela-senha");
  const erro = document.getElementById("erro-senha");
  const hashSalvo = localStorage.getItem(CHAVE_HASH);
  const primeiraVez = !hashSalvo;

  titulo.textContent = primeiraVez ? "Criar uma senha" : "Senha";
  erro.textContent = "";
  overlay.hidden = false;
  campo.value = "";
  campo.focus();

  form.onsubmit = async (evento) => {
    evento.preventDefault();
    const valor = campo.value;

    if (primeiraVez) {
      if (valor.length < 4) {
        erro.textContent = "Use pelo menos 4 caracteres.";
        return;
      }
      localStorage.setItem(CHAVE_HASH, await sha256Hex(valor));
      sessionStorage.setItem(CHAVE_DESBLOQUEADO, "1");
      overlay.hidden = true;
      aoDesbloquear();
      return;
    }

    if ((await sha256Hex(valor)) !== hashSalvo) {
      erro.textContent = "Senha incorreta.";
      campo.value = "";
      campo.focus();
      return;
    }
    sessionStorage.setItem(CHAVE_DESBLOQUEADO, "1");
    overlay.hidden = true;
    aoDesbloquear();
  };
}

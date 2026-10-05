# SIGSIF Importador - Aves

Extensão para **Chrome** e **Edge** que automatiza o lançamento de diagnósticos de aves (condenação total e parcial) na tela **Alterar Mapa de Abate** do SIGSIF, a partir de texto colado.

Desenvolvida para eliminar uma tarefa repetitiva no trabalho de jovem aprendiz do SIF (MBRF).

## Características

- Roda **dentro do navegador** — não é programa .exe, não pede administrador, não abre porta de rede e não usa firewall.
- Painel flutuante aparece apenas na tela "Alterar Mapa de Abate".
- Lê texto no formato: Lote / Aves total / DIAGNÓSTICO / Condenação total / Condenação parcial.
- Modos: **Testar** (simulação), **Validar** (confere se os diagnósticos existem no lote) e **Executar**.
- Opção de confirmar o mapa automaticamente ao final.

## Instalação

1. Baixe ou clone este repositório em uma pasta que você **não vai apagar**.
2. No navegador:
   - **Edge**: `edge://extensions`
   - **Chrome**: `chrome://extensions`
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem pacote** / **Carregar sem compactação** e selecione a pasta do projeto (a que contém o `manifest.json`).

## Uso

1. Entre no SIGSIF, abra o lote e a tela **Alterar Mapa de Abate**.
2. No canto inferior direito aparece o botão azul **SIGSIF Importador**. Clique nele.
3. Cole o texto e clique em **Ler texto**.
4. Use **Testar** → **Validar** → **Executar**.
5. Confira na tela e confirme o mapa (ou marque a caixa para confirmar automaticamente).

## Avisos

- O navegador pode avisar sobre extensões no modo desenvolvedor — isso é esperado.
- Se o botão não aparecer, verifique se está na tela correta. Se o domínio do SIGSIF for diferente, edite o `manifest.json` e recarregue a extensão.
- Em computadores gerenciados por TI, a política pode bloquear extensões carregadas por pasta.

## Arquivos

- `manifest.json` — configuração da extensão (Manifest V3)
- `content.js` — lógica da extensão (parser + automação da página + painel)
- `INSTALAR.txt` — instruções detalhadas em português

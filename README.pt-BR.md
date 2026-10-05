# SIGSIF Importador — Aves

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Chrome / Edge](https://img.shields.io/badge/Browser-Chrome%20%7C%20Edge-informational)](https://www.microsoft.com/edge)

[English](README.md)

Extensão para **Chrome** e **Edge** que automatiza o lançamento de diagnósticos de aves (condenação total e parcial) na tela **Alterar Mapa de Abate** do [SIGSIF](https://www.gov.br/agricultura).

Desenvolvida para eliminar uma tarefa manual e repetitiva no fluxo de inspeção sanitária (SIF / MBRF).

---

## Problema

No dia a dia do SIF, o lançamento de condenações no mapa de abate exige:

1. Abrir o lote na tela *Alterar Mapa de Abate*
2. Localizar cada diagnóstico na tabela
3. Preencher quantidade de animais acometidos
4. Inserir parte afetada (carcaça / parcial)
5. Escolher destino (condenação total ou parcial)
6. Confirmar — e repetir para dezenas de linhas

Isso consome tempo, gera fadiga e aumenta o risco de erro de digitação ou de lançar na doença errada.

## Solução

A extensão injeta um painel flutuante **somente** nessa tela. O usuário cola o resumo do lote (texto livre no formato esperado), valida e executa. O script:

- Interpreta o texto (parser tolerante a variações de chave)
- Confere se todos os diagnósticos existem na tabela do lote
- Preenche campos e clica nos botões via DOM, respeitando o ciclo AJAX do **PrimeFaces**
- Evita lançar em diagnóstico errado (checagem explícita do campo Diagnóstico)
- Permite interromper no meio e mostra resumo do que já foi gravado

Nada de programa externo, porta de rede, permissões especiais ou elevação de privilégio: só JavaScript no contexto da página (`world: MAIN`).

---

## Funcionalidades

| Recurso | Descrição |
|--------|-----------|
| **Parser de texto** | Aceita `Lote`, `Aves total`, nome do diagnóstico, `Condenação total` / `parcial` |
| **Testar** | Simula o fluxo sem gravar nada no SIGSIF |
| **Validar** | Confere se cada diagnóstico do texto existe na tabela do lote |
| **Executar** | Lança acometidos + partes (total e parcial) com progresso e log |
| **Parar** | Interrompe após o passo atual e reporta o que já foi concluído |
| **Confirmar mapa** | Manual ou automático ao final da execução |
| **Shadow DOM** | UI isolada, sem conflito de CSS com o sistema |
| **Segurança de lançamento** | Aborta se o campo Diagnóstico não bater com o esperado |

### Diagnósticos reconhecidos

`AEROSSACULITE`, `ALTERAÇÕES MUSCULARES`, `ARTRITE/TENOSSINOVITE (1 ARTICULAÇÃO)`, `ARTRITE/TENOSSINOVITE (2 ARTICULAÇÕES)`, `ASPECTO REPUGNANTE`, `CANIBALISMO`, `CAQUEXIA`, `CELULITE`, `CONTAMINAÇÃO GASTROINTESTINAL E BILIAR`, `CONTAMINAÇÃO NÃO GASTROINTESTINAL`, `ESCALDADO VIVO`, `FALHAS TECNOLÓGICAS`, `LESÃO DE PELE`, `LESÃO INFLAMATÓRIA`, `LESÃO TRAUMÁTICA`, `MAGREZA`, `NEOPLASIA`, `SEPTICEMIA`, `SÍNDROME ASCÍTICA`

---

## Stack técnica

- **Manifest V3** (Chrome / Edge)
- **Content script** em `world: MAIN` (acesso ao `PrimeFaces` e ao DOM real da página)
- JavaScript vanilla (sem bundler, sem framework)
- **Shadow DOM** + `CSSStyleSheet` para o painel
- Aguardo explícito da fila AJAX do PrimeFaces (`PrimeFaces.ajax.Queue`)
- Normalização Unicode (NFD) para comparar diagnósticos com/sem acento

### Arquitetura (resumo)

```
content.js
├── Config (diagnósticos, seletores CSS, partes/destinos)
├── Parser de texto → lotes + itens (total / parcial / acometidos)
├── Automação da página
│   ├── setValor / escolherOpcao (disparo de eventos)
│   ├── aguardarAjax (PrimeFaces)
│   ├── validarNoSigsif / lancarItem / lancarParte
│   └── confirmarMapa
└── UI (painel flutuante em Shadow DOM)
    ├── Ler texto → resumo em tabela
    ├── Testar | Validar | Executar | Parar
    └── Log com timestamp + copiar log
```

---

## Instalação

1. Clone ou baixe este repositório em uma pasta permanente:

   ```bash
   git clone https://github.com/VictorHUBy/sigsif-importador-aves.git
   ```

2. Abra `chrome://extensions` (Chrome) ou `edge://extensions` (Edge)
3. Ative **Modo do desenvolvedor**
4. Clique em **Carregar sem compactação** / **Carregar sem pacote** e selecione a pasta do projeto (onde está o `manifest.json`)

> Aviso do navegador sobre “extensões no modo desenvolvedor” é esperado. Em máquinas gerenciadas por TI, a política pode bloquear extensões carregadas por pasta.

### Domínio diferente do SIGSIF?

Edite `manifest.json` → array `matches` e inclua o domínio, por exemplo:

```json
"https://*.seudominio.gov.br/*"
```

Salve e recarregue a extensão na página de extensões.

---

## Uso

1. Entre no SIGSIF → abra o lote → tela **Alterar Mapa de Abate**
2. No canto inferior direito, clique no botão azul **SIGSIF Importador**
3. Cole o texto no formato abaixo e clique em **Ler texto**
4. **Testar** → **Validar** → **Executar**
5. Confira na tela e confirme o mapa (ou marque “confirmar mapa ao final”)

### Exemplo de texto de entrada

```text
Lote: 5045
Aves total: 43535
AEROSSACULITE
Condenação total: 353
Condenação parcial: 3434
CELULITE
Condenação total: 12
Condenação parcial: 88
```

Regras do parser:

- `Acometidos = Condenação total + Condenação parcial`
- Linhas vazias são ignoradas
- Diagnóstico pode vir como chave sozinha ou como `DIAGNÓSTICO: nome`
- Números aceitam `.` e `,` como separadores

---

## Estrutura do repositório

```text
.
├── manifest.json      # Manifest V3 — matches, content_scripts
├── content.js         # Parser + automação + UI (tudo em um arquivo)
├── INSTALAR.txt       # Instruções rápidas em texto puro
├── LICENSE            # MIT
├── README.md          # Versão em inglês
└── README.pt-BR.md    # Este arquivo (português)
```

---

## Limitações e cuidados

- Só funciona na tela **Alterar Mapa de Abate** (detecção pelo seletor da tabela de doenças)
- Depende da estrutura atual do HTML/PrimeFaces do SIGSIF — mudanças no sistema podem exigir ajuste dos seletores em `SEL`
- Em caso de falha no meio da execução, o log mostra o que já foi lançado; **não execute de novo sem conferir**, para evitar duplicidade
- Uso interno / operacional: não substitui a responsabilidade técnica do inspetor sobre o que é lançado

---

## Licença

MIT © Victor Machado ([@VictorHUBy](https://github.com/VictorHUBy))

---

## Autor

**Victor Machado** — jovem aprendiz SIF / MBRF  
Projeto nascido de uma dor real do chão de fábrica: automatizar o repetitivo para sobrar tempo ao que importa.

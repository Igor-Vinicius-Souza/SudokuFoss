# SudokuFoss

SudokuFoss é um jogo de Sudoku implementado como uma aplicação web leve (HTML/CSS/JavaScript). O projeto foca em jogabilidade acessível, controles tanto por toque quanto por teclado, e pequenas mecânicas de progressão (moedas, loja de temas e dicas).

## Demo

- Versão publicada: https://igor-vinicius-souza.github.io/SudokuFoss/
- Arquivo local: [SudokuFoss.html](SudokuFoss.html)

## Principais funcionalidades

- Geração e resolução via algoritmo backtracking (garante tabuleiros válidos)
- Modo lápis (anotações) com restauração automática das anotações vizinhas
- Teclado numérico com suporte a long-press (toque prolongado força inserção definitiva)
- Sistema de pontuação, temporizador e cálculo de moedas por desempenho
- Loja de temas com preview, compra com moedas fictícias e persistência em `localStorage`
- Temas dinâmicos com efeitos visuais (chuva, nuvens, estilo 8-bit, etc.)
- Internacionalização com arquivos em `assets/lang` (pt/en)
- Persistência de preferências (tema, idioma, moedas e dicas) via `localStorage`

## Novidades do código

- `assets/script/main.js`: grande refatoração e novas features — long-press, restauração de lápis, sistema de loja, animações de temas, melhorias no render do tabuleiro
- Suporte melhorado para dispositivos móveis (eventos touch) e navegação por teclado (setas, Backspace/Delete)
- Arquitetura simples para traduções com `UI_STRINGS` carregadas de `assets/lang`

## Como executar localmente

1. Abra `SudokuFoss.html` diretamente em um navegador moderno (Chrome/Firefox/Edge). Para Recursos que usam `fetch`, recomenda-se servir por HTTP:

```bash
cd /caminho/para/SudokuFoss
python3 -m http.server 8000
# então abra http://localhost:8000/SudokuFoss.html
```

2. Modificações em arquivos estáticos são recarregadas ao atualizar a página.

## Controles e uso

- Selecionar célula: clique/tap na célula
- Inserir número: usar o numpad em tela ou teclado físico (1–9)
- Modo lápis: pressione `Espaço` ou botão lápis na UI
- Long press (toque longo) em numpad: insere imediatamente em modo normal
- Dica: abrevia para preencher a célula selecionada (consome dicas)
- Loja: comprar temas e dicas com moedas acumuladas

## Estrutura do projeto (arquivos principais)

- [SudokuFoss.html](SudokuFoss.html) — HTML principal da aplicação
- [assets/script/main.js](assets/script/main.js) — lógica do jogo (geração, render, UI, loja, persistência)
- [assets/css/styles.css](assets/css/styles.css) — estilos e temas
- [assets/lang/pt.json](assets/lang/pt.json) e [assets/lang/en.json](assets/lang/en.json) — traduções

## Desenvolvimento

- Para editar traduções, atualize os arquivos em `assets/lang/`.
- Para testar alterações de script, edite `assets/script/main.js` e recarregue a página.
- Recomenda-se usar um servidor local para evitar problemas com `fetch` e CORS (ver seção acima).

## Contribuição

- Bug reports e pull requests são bem-vindos.
- Antes de abrir PR, descreva claramente a mudança e execute testes manuais básicos (abrir a página, gerar um novo jogo, testar numpad e loja).

## Licença

Este repositório inclui um arquivo `LICENSE` no diretório raiz. Consulte-o para termos de uso.

## TODO

- [x] Separar o código HTML/CSS/JS em arquivos distintos (parcialmente feito)
- [ ] Melhorar a geração de Sudoku para garantir unicidade de solução
- [ ] Adicionar suporte offline como PWA
- [ ] Criar compilação para Android e desktops (Capacitor)
- [ ] Implementar mais animações e efeitos visuais

## Linguagens

- Português: 100%
- English: 99% (interface preparada para múltiplos idiomas via `assets/lang`)

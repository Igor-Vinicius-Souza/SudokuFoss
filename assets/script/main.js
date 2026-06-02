// Configurações Globais dos Temas da Loja
const THEMES_CONFIG = {
    default: { id: 'default', name: 'Padrão Moderno', price: 0, preview: 'bg-slate-50' },
    retro: { id: 'retro', name: 'Estilo 8-Bit', price: 50, preview: 'bg-black text-green-500' },
    clouds: { id: 'clouds', name: 'Nuvens de Algodão', price: 100, preview: 'bg-sky-200' },
    rain: { id: 'rain', name: 'Dia Chuvoso', price: 150, preview: 'bg-slate-700 text-cyan-300' },
    field: { id: 'field', name: 'Campo Verdejante', price: 150, preview: 'bg-emerald-100 text-emerald-800' }
};

// Estado do Jogo
let sudokuGrid = Array(81).fill(0);
let solutionGrid = Array(81).fill(0);
let initialGrid = Array(81).fill(false); // Mantém rastreamento de quais números vieram originalmente
let pencilMarks = Array.from({ length: 81 }, () => Array(10).fill(false)); // Índices de 1 a 9

let selectedIdx = null;
let isPencilActive = false;
let coins = parseInt(localStorage.getItem('sudoku_coins')) || 100;
let hintsLeft = parseInt(localStorage.getItem('sudoku_hints')) || 3;
let unlockedThemes = JSON.parse(localStorage.getItem('sudoku_unlocked_themes')) || ['default'];
let activeTheme = localStorage.getItem('sudoku_active_theme') || 'default';
let language = localStorage.getItem('sudoku_language') || 'pt';
let UI_STRINGS = {};

let score = 0;
let gameTime = 0;
let timerInterval = null;
let isGameFinished = false;

// Controle para o detector de toque prolongado (Long Press)
let numpadPressTimeout = null;
let numpadButtonActive = null;
let isLongPress = false;

// Algoritmo Real de Sudoku (Backtracking para Geração e Resolução válidas)
function generateSudoku(difficulty) {
    // Cria um tabuleiro resolvido vazio
    let baseBoard = Array(81).fill(0);
    solveSudokuHelper(baseBoard);
    solutionGrid = [...baseBoard];

    // Define quantidade de casas a remover baseado na dificuldade
    let emptyCells = 40; // easy
    if (difficulty === 'medium') emptyCells = 48;
    if (difficulty === 'hard') emptyCells = 54;

    let puzzleBoard = [...solutionGrid];
    let cellIndices = Array.from({length: 81}, (_, i) => i);
    // Embaralha índices para remoção aleatória
    cellIndices.sort(() => Math.random() - 0.5);

    for (let i = 0; i < emptyCells; i++) {
        puzzleBoard[cellIndices[i]] = 0;
    }

    sudokuGrid = [...puzzleBoard];
    initialGrid = sudokuGrid.map(val => val !== 0);
    
    // Limpa as marcas de lápis antigas
    pencilMarks = Array.from({ length: 81 }, () => Array(10).fill(false));
}

function solveSudokuHelper(board) {
    for (let i = 0; i < 81; i++) {
        if (board[i] === 0) {
            let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
            for (let num of nums) {
                if (isValidPlacement(board, i, num)) {
                    board[i] = num;
                    if (solveSudokuHelper(board)) return true;
                    board[i] = 0;
                }
            }
            return false;
        }
    }
    return true;
}

function isValidPlacement(board, index, val) {
    let row = Math.floor(index / 9);
    let col = index % 9;
    // Valida Linha
    for (let c = 0; c < 9; c++) {
        if (board[row * 9 + c] === val) return false;
    }
    // Valida Coluna
    for (let r = 0; r < 9; r++) {
        if (board[r * 9 + col] === val) return false;
    }
    // Valida Caixa 3x3
    let startRow = Math.floor(row / 3) * 3;
    let startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (board[(startRow + r) * 9 + (startCol + c)] === val) return false;
        }
    }
    return true;
}

// Carrega os arquivos de tradução desde a pasta assets/lang
async function loadLanguageFiles() {
    try {
        const ptResponse = await fetch('./assets/lang/pt.json');
        const enResponse = await fetch('./assets/lang/en.json');
        
        if (!ptResponse.ok || !enResponse.ok) {
            throw new Error('Erro ao carregar arquivos de tradução');
        }
        
        UI_STRINGS.pt = await ptResponse.json();
        UI_STRINGS.en = await enResponse.json();
    } catch (error) {
        console.warn('Não foi possível carregar arquivos de tradução:', error);
        // Usa tradução padrão embutida como fallback
        UI_STRINGS.pt = {};
        UI_STRINGS.en = {};
    }
}

// Inicialização do DOM e Jogabilidade
document.addEventListener('DOMContentLoaded', async () => {
    // Carrega os arquivos de tradução
    await loadLanguageFiles();

    setupThemeAnimations();
    applyTheme(activeTheme);
    updateUIStats();
    updateLanguageTexts();

    // Inicialização do menu principal
    document.getElementById('btn-start-game').onclick = startGame;
    document.getElementById('btn-show-instructions').onclick = openInstructions;
    document.getElementById('btn-open-settings').onclick = openSettings;
    document.getElementById('btn-close-instructions').onclick = closeInstructions;
    document.getElementById('btn-close-instructions-bottom').onclick = closeInstructions;
    document.getElementById('btn-close-settings').onclick = closeSettings;
    document.getElementById('btn-cancel-settings').onclick = closeSettings;
    document.getElementById('btn-apply-settings').onclick = applySettings;

    document.getElementById('menu-difficulty').onchange = (e) => {
        document.getElementById('select-difficulty').value = e.target.value;
    };
    document.getElementById('settings-language').value = language;
    document.getElementById('settings-color').value = activeTheme;

    // Renderiza Teclado Numérico Digital de 1 a 9
    const numpadContainer = document.querySelector('main > div:last-of-type');
    numpadContainer.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement('button');
        btn.className = "numpad-btn py-3 bg-indigo-50 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-slate-600 text-lg md:text-xl font-bold rounded-xl transition transform active:scale-90 text-indigo-700 dark:text-indigo-300";
        btn.textContent = i;
        
        // Eventos de Touch e Mouse para Long Press
        const startPress = (e) => {
            e.preventDefault();
            isLongPress = false;
            numpadButtonActive = i;
            numpadPressTimeout = setTimeout(() => {
                isLongPress = true;
                // Executa inserção em Modo Normal diretamente
                insertValue(i, true); 
            }, 300); // 300ms de segurar
        };

        const endPress = (e) => {
            e.preventDefault();
            clearTimeout(numpadPressTimeout);
            if (!isLongPress && numpadButtonActive === i) {
                // Clique curto normal (respeita o modo lápis atual)
                insertValue(i, false);
            }
            numpadButtonActive = null;
        };

        btn.addEventListener('mousedown', startPress);
        btn.addEventListener('mouseup', endPress);
        btn.addEventListener('mouseleave', () => clearTimeout(numpadPressTimeout));
        btn.addEventListener('touchstart', startPress);
        btn.addEventListener('touchend', endPress);

        numpadContainer.appendChild(btn);
    }

    // Seletores e Cliques Globais
    document.getElementById('btn-pencil').onclick = togglePencil;
    document.getElementById('btn-erase').onclick = eraseCurrentCell;
    document.getElementById('btn-hint').onclick = useHint;
    document.getElementById('btn-restart').onclick = () => initGame();
    document.getElementById('select-difficulty').onchange = () => initGame();
    
    // Controle da Loja
    document.getElementById('btn-shop').onclick = openShop;
    document.getElementById('btn-close-shop').onclick = closeShop;
    document.getElementById('buy-hint-btn').onclick = buyHint;

    // Tema Escuro Geral (Com persistência no LocalStorage)
    document.getElementById('btn-toggle-dark').onclick = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('sudoku_dark_mode', isDark ? 'enabled' : 'disabled');
    };

    // Teclado Físico
    let keyPressTimestamps = {};
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return; // Evita repetições nativas do SO disparando repetidamente
        
        if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            togglePencil();
            return;
        }

        if (e.key >= '1' && e.key <= '9') {
            const num = parseInt(e.key);
            keyPressTimestamps[num] = Date.now();
            
            // Inicia timeout para forçar inserção definitiva (Long Press físico)
            setTimeout(() => {
                if (keyPressTimestamps[num] && (Date.now() - keyPressTimestamps[num] >= 300)) {
                    // Se o botão ainda consta pressionado após 300ms
                    insertValue(num, true); // Força normal
                    keyPressTimestamps[num] = null; // Impede duplo acionamento no keyup
                }
            }, 300);
        }

        // Navegação com setas do teclado
        if (selectedIdx !== null) {
            let row = Math.floor(selectedIdx / 9);
            let col = selectedIdx % 9;
            if (e.key === 'ArrowUp') { e.preventDefault(); selectCell(Math.max(0, row - 1) * 9 + col); }
            if (e.key === 'ArrowDown') { e.preventDefault(); selectCell(Math.min(8, row + 1) * 9 + col); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); selectCell(row * 9 + Math.max(0, col - 1)); }
            if (e.key === 'ArrowRight') { e.preventDefault(); selectCell(row * 9 + Math.min(8, col + 1)); }
            if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); eraseCurrentCell(); }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key >= '1' && e.key <= '9') {
            const num = parseInt(e.key);
            if (keyPressTimestamps[num]) {
                // Se o keyup disparou antes do timeout de 300ms, é clique curto
                insertValue(num, false);
                keyPressTimestamps[num] = null;
            }
        }
    });
});

// Configuração dos Efeitos Climáticos / Visuais Especiais
function setupThemeAnimations() {
    // Cria gotas de chuva dinâmicas
    const rainLayer = document.getElementById('rain-layer');
    rainLayer.innerHTML = '';
    for (let i = 0; i < 40; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = `${Math.random() * 100}%`;
        drop.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
        drop.style.animationDelay = `${Math.random() * 2}s`;
        rainLayer.appendChild(drop);
    }

    // Cria nuvens flutuantes dinâmicas
    const cloudsLayer = document.getElementById('clouds-layer');
    cloudsLayer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        // Dimensões variadas para as nuvens
        const width = 80 + Math.random() * 80;
        cloud.style.width = `${width}px`;
        cloud.style.height = `${width * 0.4}px`;
        cloud.style.top = `${10 + Math.random() * 50}%`;
        cloud.style.animationDuration = `${15 + Math.random() * 25}s`;
        cloud.style.animationDelay = `-${Math.random() * 15}s`;
        
        // Sub-bolhas da nuvem
        const style = document.createElement('style');
        style.textContent = `
            .cloud { position: absolute; background: white; border-radius: 100px; }
            .cloud::before { width: ${width * 0.5}px; height: ${width * 0.5}px; top: -${width * 0.25}px; left: ${width * 0.15}px; }
            .cloud::after { width: ${width * 0.6}px; height: ${width * 0.6}px; top: -${width * 0.35}px; right: ${width * 0.15}px; }
        `;
        document.head.appendChild(style);

        cloudsLayer.appendChild(cloud);
    }
}

// Aplicação de Temas e Paletas
function applyTheme(themeId) {
    const body = document.getElementById('game-body');
    const rain = document.getElementById('rain-layer');
    const clouds = document.getElementById('clouds-layer');

    // Resetar classes antigas do corpo
    body.className = body.className.replace(/bg-\S+|text-\S+|theme-\S+/g, '').trim();
    body.classList.remove('theme-8bit-active');
    rain.style.display = 'none';
    clouds.style.display = 'none';

    activeTheme = themeId;
    localStorage.setItem('sudoku_active_theme', themeId);

    switch (themeId) {
        case 'retro':
            body.classList.add('theme-8bit-active', 'bg-black', 'text-green-400');
            break;
        case 'clouds':
            body.classList.add('bg-sky-200', 'text-slate-800');
            clouds.style.display = 'block';
            break;
        case 'rain':
            body.classList.add('bg-slate-800', 'text-slate-100');
            rain.style.display = 'block';
            break;
        case 'field':
            body.classList.add('bg-emerald-50', 'text-emerald-900');
            break;
        default: // Padrão
            body.classList.add('bg-slate-50', 'dark:bg-slate-900', 'text-slate-800', 'dark:text-slate-100');
            break;
    }
    renderBoard();
}

// Inicialização Completa da Partida
function initGame() {
    const diff = document.getElementById('select-difficulty').value;
    generateSudoku(diff);
    
    selectedIdx = null;
    score = 0;
    gameTime = 0;
    isGameFinished = false;

    document.getElementById('score').textContent = score;
    startTimer();
    renderBoard();
}

function startGame() {
    const menuDifficulty = document.getElementById('menu-difficulty').value;
    document.getElementById('select-difficulty').value = menuDifficulty;
    document.getElementById('main-menu').classList.add('hidden');
    initGame();
}

function openInstructions() {
    document.getElementById('modal-instructions').classList.remove('hidden');
}

function closeInstructions() {
    document.getElementById('modal-instructions').classList.add('hidden');
}

function populateColorOptions() {
    const colorSelect = document.getElementById('settings-color');
    colorSelect.innerHTML = ''; // Limpa opções existentes
    
    // Adiciona apenas temas desbloqueados
    unlockedThemes.forEach(themeId => {
        const theme = THEMES_CONFIG[themeId];
        if (theme) {
            const option = document.createElement('option');
            option.value = themeId;
            option.textContent = theme.name;
            colorSelect.appendChild(option);
        }
    });
    
    // Garante que o tema ativo está selecionado
    if (colorSelect.querySelector(`option[value="${activeTheme}"]`)) {
        colorSelect.value = activeTheme;
    } else if (unlockedThemes.length > 0) {
        colorSelect.value = unlockedThemes[0];
        activeTheme = unlockedThemes[0];
    }
}

function openSettings() {
    populateColorOptions();
    document.getElementById('settings-language').value = language;
    document.getElementById('modal-settings').classList.remove('hidden');
}

function closeSettings() {
    document.getElementById('modal-settings').classList.add('hidden');
}

function applySettings() {
    const newLang = document.getElementById('settings-language').value;
    const newTheme = document.getElementById('settings-color').value;

    language = newLang;
    localStorage.setItem('sudoku_language', language);
    activeTheme = newTheme;
    applyTheme(activeTheme);
    localStorage.setItem('sudoku_active_theme', activeTheme);
    updateLanguageTexts();
    populateColorOptions(); // Atualiza opções em caso de mudanças
    document.getElementById('modal-settings').classList.add('hidden');
}

function updateLanguageTexts() {
    const translations = UI_STRINGS[language] || UI_STRINGS.pt;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (translations[key]) el.textContent = translations[key];
    });

    document.getElementById('menu-difficulty').value = document.getElementById('select-difficulty').value;
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isGameFinished) {
            gameTime++;
            let mins = Math.floor(gameTime / 60).toString().padStart(2, '0');
            let secs = (gameTime % 60).toString().padStart(2, '0');
            document.getElementById('timer').textContent = `${mins}:${secs}`;
        }
    }, 1000);
}

// Renderização Visual Dinâmica do Tabuleiro
function renderBoard() {
    const gridEl = document.getElementById('sudoku-grid');
    gridEl.innerHTML = '';

    for (let i = 0; i < 81; i++) {
        const cell = document.createElement('div');
        let row = Math.floor(i / 9);
        let col = i % 9;

        // Estilização base de cada célula do Sudoku
        cell.className = "relative flex items-center justify-center aspect-square select-none cursor-pointer font-bold transition-all text-xl md:text-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition-theme";

        // Divisões grossas 3x3 do Tabuleiro Sudoku
        if ((col + 1) % 3 === 0 && col !== 8) {
            cell.classList.add('grid-thick-right');
        }
        if ((row + 1) % 3 === 0 && row !== 8) {
            cell.classList.add('grid-thick-bottom');
        }

        // Diferenciar células iniciais fixas
        if (initialGrid[i]) {
            cell.classList.add('bg-slate-100', 'dark:bg-slate-900/40', 'text-slate-500', 'dark:text-slate-400');
        } else {
            // Células editadas pelo usuário
            if (sudokuGrid[i] !== 0) {
                // Se estiver errado comparado à solução final
                if (sudokuGrid[i] !== solutionGrid[i]) {
                    cell.classList.add('text-red-600', 'dark:text-red-400');
                } else {
                    cell.classList.add('text-indigo-600', 'dark:text-indigo-400');
                }
            }
        }

        // Renderiza número principal ou anotações (modo lápis)
        if (sudokuGrid[i] !== 0) {
            cell.textContent = sudokuGrid[i];
        } else {
            // Renderiza as anotações feitas no lápis
            const activePencils = [];
            for (let n = 1; n <= 9; n++) {
                if (pencilMarks[i][n]) activePencils.push(n);
            }
            
            if (activePencils.length > 0) {
                const pGrid = document.createElement('div');
                pGrid.className = "pencil-grid text-slate-400 dark:text-slate-500";
                for (let n = 1; n <= 9; n++) {
                    const pItem = document.createElement('div');
                    pItem.className = "flex items-center justify-center";
                    pItem.textContent = pencilMarks[i][n] ? n : '';
                    pGrid.appendChild(pItem);
                }
                cell.appendChild(pGrid);
            }
        }

        // Destaques e Seleção
        if (selectedIdx !== null) {
            let selRow = Math.floor(selectedIdx / 9);
            let selCol = selectedIdx % 9;
            
            // Destaca a mesma linha, coluna ou bloco 3x3
            let isSameBox = Math.floor(row / 3) === Math.floor(selRow / 3) && Math.floor(col / 3) === Math.floor(selCol / 3);
            if (row === selRow || col === selCol || isSameBox) {
                cell.classList.add('bg-indigo-50/50', 'dark:bg-slate-700/40');
            }

            // Seleção Ativa
            if (i === selectedIdx) {
                cell.classList.replace('bg-white', 'bg-indigo-100');
                cell.classList.replace('dark:bg-slate-800', 'dark:bg-indigo-950');
                cell.classList.add('ring-2', 'ring-indigo-500', 'z-10');
            }

            // Sombra / Destaque em Números Semelhantes (Solicitação do Usuário)
            const selectedVal = sudokuGrid[selectedIdx];
            if (selectedVal !== 0 && sudokuGrid[i] === selectedVal) {
                cell.classList.add('same-number-shadow');
            }
        }

        // Evento de clique na Célula
        cell.onclick = () => selectCell(i);

        gridEl.appendChild(cell);
    }
}

function selectCell(index) {
    selectedIdx = index;
    renderBoard();
}

// Lógica de Modificação do Tabuleiro
function insertValue(num, forceNormal = false) {
    if (selectedIdx === null || initialGrid[selectedIdx] || isGameFinished) return;

    // Se for modo lápis e NÃO tiver segurado o botão
    if (isPencilActive && !forceNormal) {
        // Alterna o número na grade de anotações
        pencilMarks[selectedIdx][num] = !pencilMarks[selectedIdx][num];
        sudokuGrid[selectedIdx] = 0; // Se houver valor definitivo, limpa ele
    } else {
        // Modo Normal / Definitivo
        const isCorrect = solutionGrid[selectedIdx] === num;
        
        if (sudokuGrid[selectedIdx] !== num) {
            sudokuGrid[selectedIdx] = num;
            
            // Limpa todas as marcas de lápis da própria célula editada
            pencilMarks[selectedIdx].fill(false);

            // Remove o número inserido das marcas de lápis das outras células da mesma linha, coluna e bloco
            clearNeighborPencils(selectedIdx, num);

            // Atualiza pontuação
            if (isCorrect) {
                score += 10;
            } else {
                score = Math.max(0, score - 5);
            }
            document.getElementById('score').textContent = score;
        }
    }

    renderBoard();
    checkWinCondition();
}

// Remove marcações de rascunho de células impactadas (mesma linha, coluna ou bloco 3x3)
function clearNeighborPencils(index, value) {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const blockRowStart = Math.floor(row / 3) * 3;
    const blockColStart = Math.floor(col / 3) * 3;

    for (let i = 0; i < 81; i++) {
        // Não precisa limpar ela mesma (já foi feito)
        if (i === index) continue;

        const r = Math.floor(i / 9);
        const c = i % 9;

        const isSameRow = r === row;
        const isSameCol = c === col;
        const isSameBlock = Math.floor(r / 3) * 3 === blockRowStart && Math.floor(c / 3) * 3 === blockColStart;

        if (isSameRow || isSameCol || isSameBlock) {
            pencilMarks[i][value] = false;
        }
    }
}

function togglePencil() {
    isPencilActive = !isPencilActive;
    const badge = document.getElementById('pencil-badge');
    const btn = document.getElementById('btn-pencil');

    if (isPencilActive) {
        badge.classList.replace('bg-slate-400', 'bg-emerald-500');
        btn.classList.add('border-emerald-500', 'bg-emerald-50/10');
    } else {
        badge.classList.replace('bg-emerald-500', 'bg-slate-400');
        btn.classList.remove('border-emerald-500', 'bg-emerald-50/10');
    }
}

function eraseCurrentCell() {
    if (selectedIdx === null || initialGrid[selectedIdx] || isGameFinished) return;
    sudokuGrid[selectedIdx] = 0;
    pencilMarks[selectedIdx].fill(false);
    renderBoard();
}

// Sistema de Dicas
function useHint() {
    if (selectedIdx === null || isGameFinished) return;
    if (initialGrid[selectedIdx]) return; // Célula já original
    if (sudokuGrid[selectedIdx] === solutionGrid[selectedIdx]) return; // Já preenchido corretamente

    if (hintsLeft > 0) {
        hintsLeft--;
        localStorage.setItem('sudoku_hints', hintsLeft);
        updateUIStats();

        // Insere resposta correta
        const correctNum = solutionGrid[selectedIdx];
        sudokuGrid[selectedIdx] = correctNum;
        pencilMarks[selectedIdx].fill(false);

        // Limpa também as anotações dos vizinhos para o número revelado pela dica
        clearNeighborPencils(selectedIdx, correctNum);

        renderBoard();
        checkWinCondition();
    } else {
        // Notificação amigável in-app no próprio modal de loja
        openShop();
    }
}

// Validação de Vitória
function checkWinCondition() {
    // Verifica se o tabuleiro bate integralmente com a solução calculada no início
    for (let i = 0; i < 81; i++) {
        if (sudokuGrid[i] !== solutionGrid[i]) return;
    }

    // Vitória detectada
    isGameFinished = true;
    clearInterval(timerInterval);

    // Cálculo das Moedas Ganhas baseadas em Pontos e Dificuldade
    const diff = document.getElementById('select-difficulty').value;
    let multiplier = 1;
    if (diff === 'medium') multiplier = 1.5;
    if (diff === 'hard') multiplier = 2.5;

    // Bônus por rapidez (abaixo de 5 min ganha mais)
    const speedBonus = gameTime < 300 ? Math.floor((300 - gameTime) / 2) : 0;
    const coinsEarned = Math.floor((score + speedBonus) * multiplier / 10);

    coins += coinsEarned;
    localStorage.setItem('sudoku_coins', coins);
    updateUIStats();

    // Exibir dados no modal de vitória
    document.getElementById('final-time').textContent = document.getElementById('timer').textContent;
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-coins').textContent = `🪙 +${coinsEarned}`;
    
    document.getElementById('modal-victory').classList.remove('hidden');
    document.getElementById('btn-next-game').onclick = () => {
        document.getElementById('modal-victory').classList.add('hidden');
        initGame();
    };
}

// Economia, Loja e Compras
function updateUIStats() {
    document.getElementById('coin-counter').textContent = coins;
    document.getElementById('hint-qty').textContent = hintsLeft;
    
    // Verifica se o elemento existe antes de tentar atualizá-lo para evitar erros
    const hintBadge = document.getElementById('hint-badge');
    if (hintBadge) {
        hintBadge.textContent = hintsLeft;
    }
}

function openShop() {
    document.getElementById('modal-shop').classList.remove('hidden');
    renderShopThemes();
}

function closeShop() {
    document.getElementById('modal-shop').classList.add('hidden');
}

function buyHint() {
    if (coins >= 25) {
        coins -= 25;
        hintsLeft++;
        localStorage.setItem('sudoku_coins', coins);
        localStorage.setItem('sudoku_hints', hintsLeft);
        updateUIStats();
    } else {
        alert("Moedas insuficientes para comprar dica!");
    }
}

function renderShopThemes() {
    const list = document.getElementById('shop-themes-list');
    list.innerHTML = '';

    Object.keys(THEMES_CONFIG).forEach(key => {
        const theme = THEMES_CONFIG[key];
        const isUnlocked = unlockedThemes.includes(theme.id);
        const isActive = activeTheme === theme.id;

        const card = document.createElement('div');
        card.className = "flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50";
        
        // Elemento visual do Tema
        const meta = document.createElement('div');
        meta.className = "flex items-center gap-3";
        
        const previewDot = document.createElement('div');
        previewDot.className = `w-7 h-7 rounded-full border border-slate-300 ${theme.preview} flex items-center justify-center font-bold text-xs`;
        previewDot.textContent = "9";

        const info = document.createElement('div');
        info.className = "text-left";
        const name = document.createElement('h4');
        name.className = "font-bold text-sm dark:text-white";
        name.textContent = theme.name;
        
        const status = document.createElement('p');
        status.className = "text-xs text-slate-400";
        status.textContent = isActive ? 'Ativo Atualmente' : (isUnlocked ? 'Desbloqueado' : 'Bloqueado');
        
        info.appendChild(name);
        info.appendChild(status);
        meta.appendChild(previewDot);
        meta.appendChild(info);

        // Botão de Compra ou Aplicação
        const actionBtn = document.createElement('button');
        actionBtn.className = "px-3 py-1.5 text-xs font-bold rounded-lg transition transform active:scale-95";

        if (isActive) {
            actionBtn.className += " bg-slate-300 text-slate-600 dark:bg-slate-600 dark:text-slate-300 cursor-default";
            actionBtn.textContent = "Aplicado";
        } else if (isUnlocked) {
            actionBtn.className += " bg-indigo-600 hover:bg-indigo-700 text-white";
            actionBtn.textContent = "Usar";
            actionBtn.onclick = () => {
                applyTheme(theme.id);
                renderShopThemes();
            };
        } else {
            actionBtn.className += " bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-1";
            actionBtn.innerHTML = `🪙 ${theme.price}`;
            actionBtn.onclick = () => {
                if (coins >= theme.price) {
                    coins -= theme.price;
                    unlockedThemes.push(theme.id);
                    localStorage.setItem('sudoku_coins', coins);
                    localStorage.setItem('sudoku_unlocked_themes', JSON.stringify(unlockedThemes));
                    updateUIStats();
                    applyTheme(theme.id);
                    renderShopThemes();
                } else {
                    alert("Moedas insuficientes para este tema!");
                }
            };
        }

        card.appendChild(meta);
        card.appendChild(actionBtn);
        list.appendChild(card);
    });
}

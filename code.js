const WORDS_FILE = 'words.txt';
const WORDS_PER_ROUND = 6;
const ROUND_TIME = 30;
const POOL_INCREMENT = 500;
const MAX_POOL_SIZE = 10000;

let allWords = [];
let currentPoolSize = 500;

let totalScore = 0;
let roundMatches = 0;

let grid, scoreSpan, timerSpan, messageDiv;
let wordsSet = [];
let halves = [];
let selectedDiv = null;
let remainingTime = ROUND_TIME;
let timerId = null;

async function loadWordList() {
    if (allWords.length) return;
    try {
        const res = await fetch(WORDS_FILE);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const txt = await res.text();
        allWords = txt.split('\n');
        if (allWords[allWords.length - 1] === '') allWords.pop();
    } catch (err) {
        console.error('[WordGame] Failed to load word list:', err);
    }
}

function pickWordsForRound() {
    const pool = allWords.slice(0, Math.min(currentPoolSize, allWords.length));
    const copy = [...pool];
    const selected = [];
    while (selected.length < WORDS_PER_ROUND && copy.length) {
        const i = Math.floor(Math.random() * copy.length);
        selected.push(...copy.splice(i, 1));
    }
    return selected;
}

function splitHalves(words) {
    const parts = [];
    words.forEach(w => parts.push(w.slice(0, 4), w.slice(4)));
    return parts;
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function updateScore() {
    scoreSpan.textContent = totalScore;
}

function updateTimer() {
    timerSpan.textContent = remainingTime;
}

function stopTimer() {
    clearInterval(timerId);
    timerId = null;
}

function startTimer() {
    remainingTime = ROUND_TIME;
    updateTimer();
    stopTimer();
    timerId = setInterval(() => {
        remainingTime--;
        updateTimer();
        if (remainingTime <= 0) {
            stopTimer();
            endGame('Time’s up!');
        }
    }, 1000);
}

function clearGrid() {
    grid.innerHTML = '';
}

function resetSelections() {
    if (selectedDiv) selectedDiv.classList.remove('selected');
    selectedDiv = null;
}

function createGrid() {
    clearGrid();
    halves.forEach(h => {
        const div = document.createElement('div');
        div.className = 'tile';
        div.textContent = h;
        div.addEventListener('click', handleClick, { passive: true });
        grid.appendChild(div);
    });
}


function showMessage(html, stateClass) {
    document.querySelector('.game-area').classList.add(stateClass);
    messageDiv.innerHTML = html;
}

function clearMessage() {
    const area = document.querySelector('.game-area');
    area.classList.remove('starting', 'ended');
    messageDiv.innerHTML = '';
}

function increaseDifficulty() {
    if (currentPoolSize < MAX_POOL_SIZE) {
        currentPoolSize = Math.min(currentPoolSize + POOL_INCREMENT, MAX_POOL_SIZE);
    }
}

function nextRound() {
    roundMatches = 0;
    resetSelections();

    wordsSet = pickWordsForRound();
    halves = splitHalves(wordsSet);
    shuffle(halves);

    createGrid();
    startTimer();
}

function startNewGame() {
    currentPoolSize = 500;
    totalScore = 0;
    updateScore();
    clearMessage();
    nextRound();
}

function onGameOver(message) {
    stopTimer();
    resetSelections();
    clearGrid();

    showMessage(
        `<h2>${message}</h2>
     <p>You completed <strong>${totalScore}</strong> levels!</p>
     <button id="play-again">Play Again</button>`,
        'ended'
    );

    document.getElementById('play-again')
        .addEventListener('click', startNewGame, { once: true });
}

function endGame(msg) {
    onGameOver(msg === 'Incorrect match!' ? 'Incorrect match!' : 'Time’s up!');
}


function handleClick(e) {
    const div = e.currentTarget;
    if (div.classList.contains('matched')) return;

    if (!selectedDiv) {
        selectedDiv = div;
        div.classList.add('selected');
        return;
    }

    if (div === selectedDiv) {
        resetSelections();
        return;
    }

    const combined = selectedDiv.textContent + div.textContent;
    if (wordsSet.includes(combined)) {
        selectedDiv.classList.remove('selected');
        selectedDiv.classList.add('matched');
        div.classList.add('matched');

        roundMatches++;
        selectedDiv = null;

        if (roundMatches === WORDS_PER_ROUND) {
            stopTimer();
            totalScore++;
            updateScore();
            increaseDifficulty();
            setTimeout(nextRound, 500);
        }
    } else {
        endGame('Incorrect match!');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    grid = document.getElementById('grid');
    scoreSpan = document.getElementById('score');
    timerSpan = document.getElementById('timer');
    messageDiv = document.getElementById('message');

    updateScore();
    updateTimer();

    await loadWordList();

    showMessage(
        `<h2>Welcome to Word Fuse!</h2>
      <p>Each round you have ${ROUND_TIME} seconds to combine ${WORDS_PER_ROUND} words that have been halved.<br>
      After each successful round the words get harder.</p>
     <button id="start-btn">Start Game</button>`,
        'starting'
    );

    document.getElementById('start-btn')
        .addEventListener('click', () => {
            clearMessage();
            nextRound();
        }, { once: true });
});
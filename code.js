/* Word Split Game – scalable difficulty & 60‑second rounds
 * --------------------------------------------------------
 * Difficulty ramps up: pool starts at 500 common words, +500 each round until 10,000.
 */

const WORDS_FILE = 'words.txt';
const WORDS_PER_ROUND = 8;
const ROUND_TIME = 60;               // seconds per round
const POOL_INCREMENT = 500;          // enlarge pool by 500 each round
const MAX_POOL_SIZE = 10000;         // cap pool size

let allWords = [];                   // full list (loaded once)
let currentPoolSize = 500;           // starts easy

let totalScore = 0;
let roundMatches = 0;

let grid, scoreSpan, timerSpan;
let wordsSet = [];
let halves = [];
let selectedDiv = null;
let remainingTime = ROUND_TIME;
let timerId = null;

const log = (...args) => console.log('%c[WordGame]', 'color:#2196f3;font-weight:bold', ...args);

/* -------------------------------------------------- load words (once) */
async function loadWordList() {
    if (allWords.length) return;       // already loaded
    try {
        const res = await fetch(WORDS_FILE);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const txt = await res.text();
        allWords = txt.trim().split(/\r?\n/).filter(w => w.length === 8);
        log('Total 8‑letter words loaded:', allWords.length);
    } catch (err) {
        console.error('[WordGame] Failed to load word list:', err);
    }
}

/* -------------------------------------------------- word selection & shuffling */
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

/* -------------------------------------------------- UI helpers */
function updateScore() { scoreSpan.textContent = totalScore; }
function updateTimer() { timerSpan.textContent = remainingTime; }

function stopTimer() { clearInterval(timerId); timerId = null; }
function startTimer() {
    remainingTime = ROUND_TIME;
    updateTimer();
    stopTimer();
    timerId = setInterval(() => {
        remainingTime--;
        updateTimer();
        if (remainingTime <= 0) {
            stopTimer();
            endGame('Time is up!');
        }
    }, 1000);
}

function clearGrid() { grid.innerHTML = ''; }

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

/* -------------------------------------------------- game flow */
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

    log(`Pool size: ${currentPoolSize}. Words this round:`, wordsSet);
}

function endGame(message) {
    stopTimer();
    resetSelections();
    clearGrid();
    alert(`${message}\nFinal score: ${totalScore}`);
    // Reset everything
    currentPoolSize = 500;
    totalScore = 0;
    updateScore();
    setTimeout(nextRound, 300);
}

/* -------------------------------------------------- interactions */
function handleClick(e) {
    const div = e.currentTarget;
    if (div.classList.contains('matched')) return; // already matched

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

        totalScore++;
        roundMatches++;
        updateScore();
        selectedDiv = null;

        if (roundMatches === WORDS_PER_ROUND) {
            stopTimer();
            increaseDifficulty();
            setTimeout(nextRound, 500);
        }
    } else {
        endGame('Incorrect match!');
    }
}

/* -------------------------------------------------- bootstrap */
document.addEventListener('DOMContentLoaded', async () => {
    grid = document.getElementById('grid');
    scoreSpan = document.getElementById('score');
    timerSpan = document.getElementById('timer');

    updateScore();
    updateTimer();

    await loadWordList();
    nextRound();
});

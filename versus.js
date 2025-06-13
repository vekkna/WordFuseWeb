import { WordSplitGame } from './single.js';
await WordSplitGame.loadWordList();

const grid = document.getElementById('grid');
const timer = document.getElementById('timer');
const msg = document.getElementById('message');

const p1Btn = document.getElementById('p1Accept');
const p2Btn = document.getElementById('p2Accept');
const p1UI = document.getElementById('p1Score');
const p2UI = document.getElementById('p2Score');

const scores = [0, 0];      // [P1, P2]
let active = null;        // 0 or 1 once someone clicks
let turnTimerId = null;

const game = new WordSplitGame({
    gridEl: grid,
    scoreEl: { textContent: '' },   // not used in versus
    timerEl: timer,
    onRoundEnd: ({ won }) => {
        handleRoundEnd(won);
    }
});

startMatch();

/* ----------  Versus-mode flow  ---------- */

function startMatch() {
    scores[0] = scores[1] = 0;
    updateScoreUI();
    nextGrid();
}

function nextGrid() {
    active = null;
    timer.textContent = '—';
    msg.textContent = 'Click Accept when ready!';
    enableAcceptBtns(true);
    game.startNewRound(getCurrentDifficulty());
}

p1Btn.addEventListener('click', () => playerAccepts(0));
p2Btn.addEventListener('click', () => playerAccepts(1));

function playerAccepts(playerIdx) {
    if (active !== null) return;                    // somebody already accepted
    active = playerIdx;
    enableAcceptBtns(false);
    msg.textContent = `Player ${playerIdx + 1} is solving…`;
    startTurnTimer();
}

function startTurnTimer() {
    let t = 15;
    timer.textContent = t;
    clearInterval(turnTimerId);
    turnTimerId = setInterval(() => {
        timer.textContent = --t;
        if (t === 0) {
            clearInterval(turnTimerId);
            handleRoundEnd(false);                      // ran out of time
        }
    }, 1000);
}

function handleRoundEnd(activePlayerSolved) {
    clearInterval(turnTimerId);

    const winner = activePlayerSolved ? active : 1 - active;
    scores[winner]++;
    updateScoreUI();

    if (scores[winner] === 3) {
        msg.innerHTML = `<strong>Player ${winner + 1} wins the match!</strong>
                     <br><button id="newMatch">Play again</button>`;
        document.getElementById('newMatch')
            .addEventListener('click', startMatch, { once: true });
    } else {
        setTimeout(nextGrid, 1000);
    }
}

function enableAcceptBtns(enable) {
    [p1Btn, p2Btn].forEach(btn => btn.disabled = !enable);
}

function updateScoreUI() {
    p1UI.textContent = `Player 1: ${scores[0]}`;
    p2UI.textContent = `Player 2: ${scores[1]}`;
}

/* ----------  Difficulty helper  ---------- */

function getCurrentDifficulty() {
    // The _losing_ player’s score is min(scores), so difficulty is inversely
    // linked to it.  Example strategy: currentPoolSize = 500 + losing*500
    const losingScore = Math.min(...scores);
    return 500 + losingScore * 500;      // tweak however you like
}

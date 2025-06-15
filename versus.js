import { WordSplitGame } from './single.js';
await WordSplitGame.loadWordList();

const grid = document.getElementById('grid');
const timer = document.getElementById('timer2');
const msg = document.getElementById('message');

const p1Btn = document.getElementById('p1Accept');
const p2Btn = document.getElementById('p2Accept');
const p1UI = document.getElementById('p1Score');
const p2UI = document.getElementById('p2Score');

const scores = [0, 0];      // [P1, P2]
let active = null;        // 0 or 1 once someone clicks
let awaitingAccept = false;
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
    // reset turn state
    active = null;
    timer.textContent = '10';
    msg.textContent = 'Click Accept when ready!';
    enableAcceptBtns(true);

    // build the brand-new grid (engine renders, but doesn't start the timer)
    game.startNewRound(getCurrentDifficulty(), false);

    // ── LOCKING ──
    awaitingAccept = true;        // our local guard
    game.lockInteraction();       // engine-level lock: tiles won’t react
}

p1Btn.addEventListener('click', () => playerAccepts(0));
p2Btn.addEventListener('click', () => playerAccepts(1));

/**
 * Called when P1 or P2 clicks “Accept.”
 * Unlocks the grid so that only the chosen player can begin matching.
 */
function playerAccepts(playerIdx) {
    // ignore duplicate clicks
    if (awaitingAccept === false || active !== null) return;

    // mark who’s going first
    active = playerIdx;

    // ── UNLOCKING ──
    awaitingAccept = false;       // clear our local guard
    game.unlockInteraction();     // engine-level unlock: tiles become clickable

    enableAcceptBtns(false);
    msg.textContent = `Player ${playerIdx + 1} is solving…`;
    startTurnTimer();
}
function startTurnTimer() {
    let t = 10;
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
        msg.innerHTML = `<h2>Player ${winner + 1} wins the match!</h2>
                     <br><button id="newMatch">Back</button>`;
        document.getElementById('newMatch')
            .addEventListener('click', () => window.location.reload());
    } else {
        msg.innerHTML = `<h3>Player ${winner + 1} scores a point!</h3>
            <button id="nextRound">Next round</button>`;
        document.getElementById('nextRound')
            .addEventListener('click', () => {
                msg.textContent = '';
                nextGrid();
            }, { once: true });
    }
}

function enableAcceptBtns(enable) {
    [p1Btn, p2Btn].forEach(btn => btn.disabled = !enable);
}

function updateScoreUI() {
    p1UI.textContent = `${scores[0]}`;
    p2UI.textContent = `${scores[1]}`;
}

/* ----------  Difficulty helper  ---------- */

function getCurrentDifficulty() {
    // The _losing_ player’s score is min(scores), so difficulty is inversely
    // linked to it.  Example strategy: currentPoolSize = 500 + losing*500
    const losingScore = Math.min(...scores);
    return 1000 + losingScore * 1000;      // tweak however you like
}

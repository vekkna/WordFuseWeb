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
    timer.textContent = '15';
    msg.textContent = 'Click Accept when ready!';
    enableAcceptBtns(true);
    game.startNewRound(getCurrentDifficulty(), false);
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
    console.log("starting timer");
    let t = 15;
    timer.textContent = t;
    clearInterval(turnTimerId);
    turnTimerId = setInterval(() => {
        timer.textContent = --t;
        if (t === 0) {
            clearInterval(turnTimerId);
            game.abortRound('time');                    // let engine handle end
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
                     <br><button id="newMatch">Play again</button>`;
        document.getElementById('newMatch')
            .addEventListener('click', startMatch, { once: true });
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

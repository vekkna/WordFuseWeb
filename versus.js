import { WordSplitGame } from './single.js';
await WordSplitGame.loadWordList();

const grid = document.getElementById('grid');
const timer = document.getElementById('timer2');
const msg = document.getElementById('message');

const p1Btn = document.getElementById('p1Accept');
const p2Btn = document.getElementById('p2Accept');
const p1UI = document.getElementById('p1Score');
const p2UI = document.getElementById('p2Score');

const scores = [0, 0];
const time = 15;

let active = null;
let awaitingAccept = false;
let turnTimerId = null;

const game = new WordSplitGame({
    gridEl: grid,
    scoreEl: { textContent: '' },
    timerEl: timer,
    onRoundEnd: ({ won, reason, details }) => {
        handleRoundEnd(won, reason, details);
    }
});

startMatch();

function startMatch() {
    scores[0] = scores[1] = 0;
    updateScoreUI();
    nextGrid();
}

function nextGrid() {
    active = null;
    timer.textContent = time.toString();
    msg.textContent = 'Click Accept when ready!';
    enableAcceptBtns(true);

    game.startNewRound(getCurrentDifficulty(), false);

    awaitingAccept = true;
    game.lockInteraction();
}

p1Btn.addEventListener('click', () => playerAccepts(0));
p2Btn.addEventListener('click', () => playerAccepts(1));

function playerAccepts(playerIdx) {
    if (awaitingAccept === false || active !== null) return;

    active = playerIdx;

    awaitingAccept = false;
    game.unlockInteraction();

    enableAcceptBtns(false);
    msg.textContent = `Player ${playerIdx + 1} is solving…`;
    startTurnTimer();
}
function startTurnTimer() {
    let t = time;
    timer.textContent = t;
    clearInterval(turnTimerId);
    turnTimerId = setInterval(() => {
        timer.textContent = --t;
        if (t === 0) {
            clearInterval(turnTimerId);
            handleRoundEnd(false, 'time');
        }
    }, 1000);
}

function handleRoundEnd(activePlayerSolved, reason, details) {
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
        let subMsg = '';
        if (!activePlayerSolved && reason === 'wrong' && details) {
            subMsg = `
                <div class="feedback">
                    <p class="wrong-guess">${details.entered} <span>&#10006;</span></p>
                </div>`;
        }

        msg.innerHTML = `<h3>Player ${winner + 1} scores a point!</h3>
            ${subMsg}
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

function getCurrentDifficulty() {
    const losingScore = Math.min(...scores);
    return 1000 + losingScore * 1000;
}
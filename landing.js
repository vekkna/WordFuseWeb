const landing = document.getElementById('landing');
const gameRoot = document.getElementById('gameRoot');
const singleBtn = document.getElementById('singleBtn');
const twoBtn = document.getElementById('twoBtn');

function startSingle() {
    landing.classList.add('hidden');
    gameRoot.classList.add('single');
}

function startTwo() {
    landing.classList.add('hidden');
    gameRoot.classList.add('two');
}

/* ─── Single Player ─── */
singleBtn.addEventListener('click', async () => {
    startSingle();
    const { WordSplitGame } = await import('./single.js');
    // ensure the word list is loaded
    await WordSplitGame.loadWordList();

    const grid = document.getElementById('grid');
    const score = document.getElementById('score');
    const timer = document.querySelector('#singleHeader #timer');
    const message = document.getElementById('message');

    const game = new WordSplitGame({
        gridEl: grid,
        scoreEl: score,
        timerEl: timer,
        messageEl: message,
        onRoundEnd({ won, reason }) {
            if (!won) {
                message.innerHTML = `
  <p>${reason === 'time' ? 'Time’s up!' : 'Incorrect match!'}</p>
  <button id="playAgain">Play again</button>`;
                document.getElementById('playAgain')
                    .addEventListener('click', () => {
                        message.innerHTML = '';
                        game.startNewRound();
                    }, { once: true });
            } else {
                setTimeout(() => game.startNewRound(), 800);
            }
        }
    });

    // show the intro + Start button
    message.innerHTML = `
<p>Match ${WordSplitGame.WORDS_PER_ROUND} words in ${WordSplitGame.ROUND_TIME}s.</p>
<button id="beginGame">Start Game</button>`;
    document.getElementById('beginGame')
        .addEventListener('click', () => {
            message.innerHTML = '';
            game.startNewRound();
        }, { once: true });
});

/* ─── Two-Player ─── */
twoBtn.addEventListener('click', async () => {
    startTwo();
    const { WordSplitGame } = await import('./single.js');
    await WordSplitGame.loadWordList();

    // now load versus logic which picks up the DOM you already have
    await import('./versus.js');
});
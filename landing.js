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
    // 1️⃣ Hide landing & show the single‐player layout
    landing.classList.add('hidden');
    gameRoot.classList.add('single');

    // 2️⃣ Load the core engine
    const { WordSplitGame } = await import('./single.js');
    await WordSplitGame.loadWordList();

    // 3️⃣ Grab your DOM refs
    const grid = document.getElementById('grid');
    const score = document.getElementById('score');
    const timer = document.querySelector('#singleHeader #timer1');
    const message = document.getElementById('message');

    // 4️⃣ Instantiate the game (same callback you already have)
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

    // 5️⃣ Right here—kick off the very first round immediately
    message.innerHTML = '';           // clear any intro text
    game.startNewRound();
});

/* ─── Two-Player ─── */
twoBtn.addEventListener('click', async () => {
    startTwo();
    const { WordSplitGame } = await import('./single.js');
    await WordSplitGame.loadWordList();

    // now load versus logic which picks up the DOM you already have
    await import('./versus.js');
});
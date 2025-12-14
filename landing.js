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

singleBtn.addEventListener('click', async () => {
    landing.classList.add('hidden');
    gameRoot.classList.add('single');

    const { WordSplitGame } = await import('./single.js');
    await WordSplitGame.loadWordList();

    const grid = document.getElementById('grid');
    const score = document.getElementById('score');
    const timer = document.querySelector('#singleHeader #timer1');
    const message = document.getElementById('message');

    const game = new WordSplitGame({
        gridEl: grid,
        scoreEl: score,
        timerEl: timer,
        messageEl: message,
        onRoundEnd({ won, reason, details }) {
            if (!won) {
                let html = `<h3>${reason === 'time' ? 'Time’s up!' : 'Incorrect match!'}</h3>`;

                if (reason === 'wrong' && details) {
                    html += `
                    <div class="feedback">
                        <p class="wrong-guess">${details.entered} <span>&#10006;</span></p>
                    </div>`;
                }

                html += `<button id="playAgain">Back</button>`;
                message.innerHTML = html;
                document.getElementById('playAgain')
                    .addEventListener('click', () => {
                        window.location.reload();
                    }, { once: true });
            } else {
                setTimeout(() => game.startNewRound(), 800);
            }
        }

    });

    message.innerHTML = '';
    game.startNewRound();
});


twoBtn.addEventListener('click', async () => {
    startTwo();
    const { WordSplitGame } = await import('./single.js');
    await WordSplitGame.loadWordList();

    await import('./versus.js');
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js")
            .then(reg => console.log("SW registered:", reg.scope))
            .catch(err => console.error("SW registration failed:", err));
    });
}
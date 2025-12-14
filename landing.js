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
        continuousTimer: true,
        scoringType: 'words',
        onRoundEnd({ won, reason, details }) {
            if (reason === 'time') {
                message.innerHTML = `
            <h3>Time’s up!</h3>
            <div class="result-score">Final Score: ${score.textContent}</div>
            <button id="playAgain">Play Again</button>`;
                document.getElementById('playAgain')
                    .addEventListener('click', () => {
                        window.location.reload();
                    }, { once: true });
            } else if (reason === 'wrong' && details) {
                const feedbackHtml = `
                    <div class="feedback-toast">
                        <span class="wrong-guess">${details.entered} <span>&#10006;</span></span>
                    </div>`;
                message.innerHTML = feedbackHtml;

                // Skip round after delay
                setTimeout(() => {
                    message.innerHTML = '';
                    game.skipRound();
                }, 1500);
            } else {
                // Won (cleared grid) or Skipped
                game.startNewRound(undefined, false); // Don't reset timer
            }
        }

    });

    message.innerHTML = '';
    // Start with 60s
    game.startNewRound(undefined, false);
    game.startTimer(60);
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
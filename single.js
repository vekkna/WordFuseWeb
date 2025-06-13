/* single.js ─ Core engine for the Word-Split game
 *
 *  ▸  Can run stand-alone in “classic” single-player mode
 *  ▸  Or be imported by another script (e.g. versus.js) that
 *     controls flow, scoring, timers, difficulty, etc.
 *
 *  Public surface:
 *    ─ class WordSplitGame
 *        constructor({
 *          gridEl,          // <div id="grid">        ─ required
 *          scoreEl,         // <span id="score">      ─ optional
 *          timerEl,         // <span id="timer">      ─ optional
 *          messageEl,       // <div id="message">     ─ optional
 *          onRoundEnd       // fn({ won, reason })    ─ optional
 *        })
 *
 *        static loadWordList(url = 'words.txt')  → Promise<void>
 *        startNewRound(poolSizeOverride?)        → void
 *        abortRound(reason)                      → void
 *
 *  A “round” ends when:
 *    • player matches all WORDS_PER_ROUND correctly   → onRoundEnd({won:true})
 *    • timer hits zero                                → onRoundEnd({won:false, reason:'time'})
 *    • incorrect pair chosen                          → onRoundEnd({won:false, reason:'wrong'})
 */

export class WordSplitGame {
    /* ─────────────────────────────────────────── constants (tweak freely) */
    static WORDS_FILE = 'words.txt';
    static WORDS_PER_ROUND = 6;
    static ROUND_TIME = 30;      // seconds
    static POOL_INCREMENT = 500;
    static MAX_POOL_SIZE = 10000;

    /* the shared word list, loaded once per browser session */
    static _allWords = [];

    /* ─────────────────────────────────────────── constructor */
    constructor({
        gridEl,
        scoreEl = null,
        timerEl = null,
        messageEl = null,
        onRoundEnd = null
    }) {
        if (!gridEl) throw new Error('WordSplitGame needs a gridEl');

        /* DOM refs */
        this.gridEl = gridEl;
        this.scoreEl = scoreEl;
        this.timerEl = timerEl;
        this.messageEl = messageEl;

        /* callbacks */
        this.onRoundEnd = onRoundEnd;

        /* per-match state */
        this._currentPoolSize = 500;
        this._totalScore = 0;

        /* per-round state */
        this._roundMatches = 0;
        this._wordsSet = [];
        this._halves = [];
        this._selectedTile = null;
        this._remainingTime = WordSplitGame.ROUND_TIME;
        this._timerId = null;

        /* convenience bind */
        this._handleTileClick = this._handleTileClick.bind(this);
    }

    /* ─────────────────────────────────────────── static word loader */
    static async loadWordList(url = WordSplitGame.WORDS_FILE) {
        if (WordSplitGame._allWords.length) return;          // already cached
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Couldn’t fetch ${url} – ${res.status}`);
        const txt = await res.text();
        WordSplitGame._allWords = txt.trim().split('\n');    // assume LF endings
    }

    /* ─────────────────────────────────────────── public API */
    startNewRound(poolSizeOverride) {
        /* stop any previous activity */
        this._clearTimer();
        this._clearGrid();
        this._resetSelections();
        this._roundMatches = 0;

        /* pick pool size */
        if (typeof poolSizeOverride === 'number') {
            this._currentPoolSize = Math.min(
                poolSizeOverride,
                WordSplitGame.MAX_POOL_SIZE
            );
        }

        /* choose words & build grid */
        this._wordsSet = this._pickWords();
        this._halves = this._splitHalves(this._wordsSet);
        this._shuffle(this._halves);
        this._renderGrid();

        /* count-down */
        this._remainingTime = WordSplitGame.ROUND_TIME;
        this._updateTimerUI();
        this._timerId = setInterval(() => this._tick(), 1000);
    }

    /** Call if an external controller needs to force-fail the round */
    abortRound(reason = 'abort') {
        this._roundComplete(false, reason);
    }

    /* ─────────────────────────────────────────── internal helpers */
    _pickWords() {
        const pool = WordSplitGame._allWords.slice(
            0,
            Math.min(this._currentPoolSize, WordSplitGame._allWords.length)
        );
        const copy = [...pool];
        const chosen = [];
        while (chosen.length < WordSplitGame.WORDS_PER_ROUND && copy.length) {
            const idx = Math.floor(Math.random() * copy.length);
            chosen.push(...copy.splice(idx, 1));
        }
        return chosen;
    }

    _splitHalves(words) {
        const parts = [];
        words.forEach(w => parts.push(w.slice(0, 4), w.slice(4)));
        return parts;
    }

    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    _renderGrid() {
        this._clearGrid();
        this._halves.forEach(txt => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.textContent = txt;
            tile.addEventListener('click', this._handleTileClick, { passive: true });
            this.gridEl.appendChild(tile);
        });
    }

    _clearGrid() {
        this.gridEl.innerHTML = '';
    }

    _resetSelections() {
        if (this._selectedTile) this._selectedTile.classList.remove('selected');
        this._selectedTile = null;
    }

    _updateScoreUI() {
        if (this.scoreEl) this.scoreEl.textContent = this._totalScore;
    }

    _updateTimerUI() {
        if (this.timerEl) this.timerEl.textContent = this._remainingTime;
    }

    _clearTimer() {
        clearInterval(this._timerId);
        this._timerId = null;
    }

    _tick() {
        this._remainingTime--;
        this._updateTimerUI();
        if (this._remainingTime <= 0) {
            this._roundComplete(false, 'time');
        }
    }

    /* ─────────────────────────────────────────── click handling */
    _handleTileClick(ev) {
        const tile = ev.currentTarget;
        if (tile.classList.contains('matched')) return;   // already done

        /* first selection */
        if (!this._selectedTile) {
            this._selectedTile = tile;
            tile.classList.add('selected');
            return;
        }

        /* deselecting same tile */
        if (tile === this._selectedTile) {
            this._resetSelections();
            return;
        }

        /* attempt match */
        const candidate = this._selectedTile.textContent + tile.textContent;
        if (this._wordsSet.includes(candidate)) {
            this._selectedTile.classList.remove('selected');
            this._selectedTile.classList.add('matched');
            tile.classList.add('matched');

            this._totalScore++;
            this._roundMatches++;
            this._updateScoreUI();
            this._selectedTile = null;

            if (this._roundMatches === WordSplitGame.WORDS_PER_ROUND) {
                this._roundComplete(true);
            }
        } else {
            this._roundComplete(false, 'wrong');
        }
    }

    /* ─────────────────────────────────────────── end-of-round logic */
    _roundComplete(playerWon, reason = 'complete') {
        this._clearTimer();
        this._resetSelections();

        /* detach all click handlers to freeze grid */
        Array.from(this.gridEl.children).forEach(el =>
            el.replaceWith(el.cloneNode(true))
        );

        if (playerWon) {
            /* made it: ramp difficulty for next caller-initiated round */
            this._increaseDifficulty();
        }

        this.onRoundEnd?.({ won: playerWon, reason });
    }

    _increaseDifficulty() {
        if (this._currentPoolSize < WordSplitGame.MAX_POOL_SIZE) {
            this._currentPoolSize = Math.min(
                this._currentPoolSize + WordSplitGame.POOL_INCREMENT,
                WordSplitGame.MAX_POOL_SIZE
            );
        }
    }
}

/* ───────────────────────────────────────────
   OPTIONAL: legacy single-player bootstrap
   If this script is loaded directly in a page that contains
   #grid, #score, #timer, #message, it will auto-start just
   like the old code.  Versus mode (or any other controller)
   should **not** rely on this block – they will import the
   class and manage their own flow.
*/
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        const grid = document.getElementById('grid');
        const score = document.getElementById('score');
        const timer = document.getElementById('timer1');
        const msg = document.getElementById('message');

        if (!grid) return;   // not a stand-alone page

        await WordSplitGame.loadWordList();

        /* simple single-player run with in-page messages */
        const game = new WordSplitGame({
            gridEl: grid,
            scoreEl: score,
            timerEl: timer,
            messageEl: msg,
            onRoundEnd({ won, reason }) {
                if (!won) {
                    msg.innerHTML = `
              <p>${reason === 'time' ? 'Time’s up!' :
                            reason === 'wrong' ? 'Incorrect match!' :
                                'Game over!'}</p>
              <button id="playAgain">Play again</button>`;
                    document.getElementById('playAgain')
                        .addEventListener('click', () => {
                            msg.innerHTML = '';
                            game.startNewRound();
                        }, { once: true });
                } else {
                    /* brief delay then auto-next */
                    setTimeout(() => game.startNewRound(), 800);
                }
            }
        });

        /* first welcome panel */
        msg.innerHTML = '';
        document.getElementById('beginGame')
            .addEventListener('click', () => {
                msg.innerHTML = '';
                game.startNewRound();
            }, { once: true });
    });
}

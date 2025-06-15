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
    static WORDS_STORAGE_KEY = 'wordSplitWordList';
    static WORDS_VERSION_KEY = 'wordSplitWordListVersion';
    static CURRENT_WORDS_VERSION = '1.0';
    static WORDS_PER_ROUND = 6;
    static ROUND_TIME = 60;      // seconds
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

        this._interactionLocked = false;
        /* convenience bind */
        this._handleTileClick = this._handleTileClick.bind(this);

    }

    /* ─────────────────────────────────────────── static word loader */
    static async loadWordList(url = WordSplitGame.WORDS_FILE) {
        if (WordSplitGame._allWords.length > 0) {
            return; // Already populated
        }

        try {
            const storedVersion = localStorage.getItem(WordSplitGame.WORDS_VERSION_KEY);
            const storedWordsJson = localStorage.getItem(WordSplitGame.WORDS_STORAGE_KEY);

            if (storedVersion === WordSplitGame.CURRENT_WORDS_VERSION && storedWordsJson) {
                try {
                    const parsedWords = JSON.parse(storedWordsJson);
                    if (parsedWords && parsedWords.length > 0) {
                        WordSplitGame._allWords = parsedWords;
                        console.log('Word list loaded from localStorage cache.');
                        return;
                    }
                } catch (e) {
                    console.warn('Failed to parse cached word list, fetching from file.', e);
                    // Proceed to fetch from file
                }
            }
        } catch (e) {
            console.warn('Could not access localStorage for word list, fetching from file.', e);
            // Proceed to fetch from file
        }

        // If words were not loaded from cache
        try {
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Couldn’t fetch ${url} – ${res.status} ${res.statusText}`);
            }
            const txt = await res.text();
            WordSplitGame._allWords = txt.trim().split('\n'); // assume LF endings

            try {
                localStorage.setItem(WordSplitGame.WORDS_VERSION_KEY, WordSplitGame.CURRENT_WORDS_VERSION);
                localStorage.setItem(WordSplitGame.WORDS_STORAGE_KEY, JSON.stringify(WordSplitGame._allWords));
                console.log('Word list fetched from file and cached in localStorage.');
            } catch (e) {
                console.warn('Failed to cache word list in localStorage. Game will continue, but words will be fetched next time.', e);
            }
        } catch (fetchError) {
            console.error('Fatal error: Could not load word list.', fetchError);
            throw fetchError; // Re-throw if the game cannot function without words
        }
    }


    /* ─────────────────── public helpers the host can call ─────────────────── */

    /** Disable every tile click until `unlockInteraction()` is called. */
    lockInteraction() {
        this._interactionLocked = true;
        this.gridEl.classList.add('locked');
    }

    /** Re-enable tile clicks. */
    unlockInteraction() {
        this._interactionLocked = false;
        this.gridEl.classList.remove('locked');
    }

    /* ─────────────────────────────────────────── public API */
    startNewRound(poolSizeOverride, startNow = true) {
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
        if (startNow) {
            this.startTimer(30)
        }
    }

    startTimer(startingTime) {
        this._remainingTime = startingTime;
        this._updateTimerUI();
        this._timerId = setInterval(() => this._tick(), 1000);
        this.unlockInteraction();
    }

    /** Call if an external controller needs to force-fail the round */
    abortRound(reason = 'abort') {
        this._roundComplete(false, reason);
    }

    /* ─────────────────────────────────────────── internal helpers */
    _pickWords() {
        const effectivePoolSize = Math.min(this._currentPoolSize, WordSplitGame._allWords.length);
        // Create a working copy of the relevant part of the word list
        const wordPoolCopy = WordSplitGame._allWords.slice(0, effectivePoolSize);

        const chosen = [];
        // Ensure we don't try to pick more words than available
        const numWordsToChoose = Math.min(WordSplitGame.WORDS_PER_ROUND, wordPoolCopy.length);

        // Check wordPoolCopy.length to prevent infinite loop if WORDS_PER_ROUND is too high for the available pool
        while (chosen.length < numWordsToChoose && wordPoolCopy.length > 0) {
            const idx = Math.floor(Math.random() * wordPoolCopy.length);
            chosen.push(wordPoolCopy.splice(idx, 1)[0]); // splice returns an array, so take the first element
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
        const fragment = document.createDocumentFragment(); // Create a fragment

        this._halves.forEach(txt => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.textContent = txt;
            tile.addEventListener('click', this._handleTileClick, { passive: true });
            fragment.appendChild(tile); // Append tile to the fragment
        });

        this.gridEl.appendChild(fragment); // Append the entire fragment at once
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
        if (this._interactionLocked) return;
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


            this._roundMatches++;
            this._updateScoreUI();
            this._selectedTile = null;

            if (this._roundMatches === WordSplitGame.WORDS_PER_ROUND) {
                this._totalScore++;
                this._updateScoreUI();
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

        this.lockInteraction();

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
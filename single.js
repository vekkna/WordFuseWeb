export class WordSplitGame {
    static WORDS_FILE = 'words.txt';
    static WORDS_STORAGE_KEY = 'wordSplitWordList';
    static WORDS_VERSION_KEY = 'wordSplitWordListVersion';
    static CURRENT_WORDS_VERSION = '1.0';
    static WORDS_PER_ROUND = 6;
    static ROUND_TIME = 60;
    static POOL_INCREMENT = 150;
    static MAX_POOL_SIZE = 10000;

    static _allWords = [];

    constructor({
        gridEl,
        scoreEl = null,
        timerEl = null,
        messageEl = null,
        onRoundEnd = null
    }) {
        if (!gridEl) throw new Error('WordSplitGame needs a gridEl');

        this.gridEl = gridEl;
        this.scoreEl = scoreEl;
        this.timerEl = timerEl;
        this.messageEl = messageEl;

        this.onRoundEnd = onRoundEnd;

        this._currentPoolSize = 200;
        this._totalScore = 0;

        this._roundMatches = 0;
        this._wordsSet = [];
        this._halves = [];
        this._selectedTile = null;
        this._remainingTime = WordSplitGame.ROUND_TIME;
        this._timerId = null;

        this._interactionLocked = false;
        this._handleTileClick = this._handleTileClick.bind(this);
    }

    static async loadWordList(url = WordSplitGame.WORDS_FILE) {
        if (WordSplitGame._allWords.length > 0) {
            return;
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
                }
            }
        } catch (e) {
            console.warn('Could not access localStorage for word list, fetching from file.', e);
        }

        try {
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Couldn’t fetch ${url} – ${res.status} ${res.statusText}`);
            }
            const txt = await res.text();
            WordSplitGame._allWords = txt.trim().split('\n');

            try {
                localStorage.setItem(WordSplitGame.WORDS_VERSION_KEY, WordSplitGame.CURRENT_WORDS_VERSION);
                localStorage.setItem(WordSplitGame.WORDS_STORAGE_KEY, JSON.stringify(WordSplitGame._allWords));
                console.log('Word list fetched from file and cached in localStorage.');
            } catch (e) {
                console.warn('Failed to cache word list in localStorage. Game will continue, but words will be fetched next time.', e);
            }
        } catch (fetchError) {
            console.error('Fatal error: Could not load word list.', fetchError);
            throw fetchError;
        }
    }

    lockInteraction() {
        this._interactionLocked = true;
        this.gridEl.classList.add('locked');
    }

    unlockInteraction() {
        this._interactionLocked = false;
        this.gridEl.classList.remove('locked');
    }

    startNewRound(poolSizeOverride, startNow = true) {
        this._clearTimer();
        this._clearGrid();
        this._resetSelections();
        this._roundMatches = 0;

        if (typeof poolSizeOverride === 'number') {
            this._currentPoolSize = Math.min(
                poolSizeOverride,
                WordSplitGame.MAX_POOL_SIZE
            );
        }

        this._wordsSet = this._pickWords();
        this._halves = this._splitHalves(this._wordsSet);
        this._shuffle(this._halves);
        this._renderGrid();

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

    abortRound(reason = 'abort') {
        this._roundComplete(false, reason);
    }

    _pickWords() {
        const effectivePoolSize = Math.min(this._currentPoolSize, WordSplitGame._allWords.length);

        const wordPoolCopy = WordSplitGame._allWords.slice(0, effectivePoolSize);

        const chosen = [];

        const numWordsToChoose = Math.min(WordSplitGame.WORDS_PER_ROUND, wordPoolCopy.length);

        while (chosen.length < numWordsToChoose && wordPoolCopy.length > 0) {
            const idx = Math.floor(Math.random() * wordPoolCopy.length);
            chosen.push(wordPoolCopy.splice(idx, 1)[0]);
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
        const fragment = document.createDocumentFragment();

        this._halves.forEach(txt => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.textContent = txt;
            tile.addEventListener('click', this._handleTileClick, { passive: true });
            fragment.appendChild(tile);
        });

        this.gridEl.appendChild(fragment);
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

    _handleTileClick(ev) {
        if (this._interactionLocked) return;
        const tile = ev.currentTarget;
        if (tile.classList.contains('matched')) return;

        if (!this._selectedTile) {
            this._selectedTile = tile;
            tile.classList.add('selected');
            return;
        }


        if (tile === this._selectedTile) {
            this._resetSelections();
            return;
        }

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
            this._roundComplete(false, 'wrong', { entered: candidate });
        }
    }

    _roundComplete(playerWon, reason = 'complete', details = null) {
        this._clearTimer();
        this._resetSelections();

        this.lockInteraction();

        if (playerWon) {
            this._increaseDifficulty();
        }

        this.onRoundEnd?.({ won: playerWon, reason, details });
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
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const gridSize = 21; // 21x21 grid on a 420px canvas -> 20px cells
  const cellSize = canvas.width / gridSize;

  const colors = {
    board: '#0f0f0f',
    snakeHead: '#60d394',
    snakeBody: '#3fbf7a',
    food: '#f94144',
    grid: 'rgba(255,255,255,0.05)',
    textShadow: 'rgba(0,0,0,0.6)'
  };

  const state = {
    snake: [{ x: 10, y: 10 }],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: null,
    score: 0,
    highScore: Number(localStorage.getItem('snake.high') || 0),
    isPaused: false,
    isGameOver: false,
    tickMs: 120,
    lastTickAt: 0
  };

  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('highScore');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');

  function randomEmptyCell() {
    while (true) {
      const x = Math.floor(Math.random() * gridSize);
      const y = Math.floor(Math.random() * gridSize);
      const onSnake = state.snake.some(s => s.x === x && s.y === y);
      if (!onSnake) return { x, y };
    }
  }

  function resetGame() {
    state.snake = [{ x: 10, y: 10 }];
    state.direction = { x: 1, y: 0 };
    state.nextDirection = { x: 1, y: 0 };
    state.food = randomEmptyCell();
    state.score = 0;
    state.isPaused = false;
    state.isGameOver = false;
    state.tickMs = 120;
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = `Score: ${state.score}`;
    highEl.textContent = `High: ${state.highScore}`;
    pauseBtn.textContent = state.isPaused ? 'Resume' : 'Pause';
  }

  function setDirection(dx, dy) {
    if (state.isGameOver) return;
    // Prevent reversing directly
    const isReverse = state.direction.x === -dx && state.direction.y === -dy;
    if (!isReverse) {
      state.nextDirection = { x: dx, y: dy };
    }
  }

  function handleKey(e) {
    const k = e.key.toLowerCase();
    if (k === ' ') {
      togglePause();
      return;
    }
    if (k === 'arrowup' || k === 'w' || k === 'k') setDirection(0, -1);
    if (k === 'arrowdown' || k === 's' || k === 'j') setDirection(0, 1);
    if (k === 'arrowleft' || k === 'a' || k === 'h') setDirection(-1, 0);
    if (k === 'arrowright' || k === 'd' || k === 'l') setDirection(1, 0);
  }

  function togglePause() {
    if (state.isGameOver) return;
    state.isPaused = !state.isPaused;
    updateHud();
  }

  function step() {
    if (state.isPaused || state.isGameOver) return;
    state.direction = state.nextDirection;
    const head = state.snake[0];
    const next = { x: head.x + state.direction.x, y: head.y + state.direction.y };

    // Wrap around edges
    if (next.x < 0) next.x = gridSize - 1;
    if (next.x >= gridSize) next.x = 0;
    if (next.y < 0) next.y = gridSize - 1;
    if (next.y >= gridSize) next.y = 0;

    // Self collision
    if (state.snake.some(s => s.x === next.x && s.y === next.y)) {
      state.isGameOver = true;
      state.highScore = Math.max(state.highScore, state.score);
      localStorage.setItem('snake.high', String(state.highScore));
      updateHud();
      return;
    }

    state.snake.unshift(next);

    // Food eat
    if (state.food && next.x === state.food.x && next.y === state.food.y) {
      state.score += 1;
      if (state.score % 5 === 0 && state.tickMs > 60) state.tickMs -= 5; // speed up
      state.food = randomEmptyCell();
      updateHud();
    } else {
      state.snake.pop();
    }
  }

  function drawBoard() {
    ctx.fillStyle = colors.board;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // subtle grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let i = 1; i < gridSize; i++) {
      const p = i * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, 0); ctx.lineTo(p, canvas.height); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p); ctx.lineTo(canvas.width, p); ctx.stroke();
    }
  }

  function drawSnake() {
    for (let i = state.snake.length - 1; i >= 0; i--) {
      const segment = state.snake[i];
      const x = segment.x * cellSize;
      const y = segment.y * cellSize;
      ctx.fillStyle = i === 0 ? colors.snakeHead : colors.snakeBody;
      const r = Math.floor(cellSize * 0.2);
      roundRect(ctx, x + 1, y + 1, cellSize - 2, cellSize - 2, r);
      ctx.fill();
    }
  }

  function drawFood() {
    if (!state.food) return;
    const x = state.food.x * cellSize + cellSize / 2;
    const y = state.food.y * cellSize + cellSize / 2;
    const radius = cellSize * 0.35;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = colors.food;
    ctx.fill();
  }

  function drawOverlay() {
    if (!state.isGameOver && !state.isPaused) return;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto';
    const text = state.isGameOver ? 'Game Over — Press Restart' : 'Paused';
    ctx.shadowColor = colors.textShadow;
    ctx.shadowBlur = 8;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function gameLoop(ts) {
    const elapsed = ts - state.lastTickAt;
    if (elapsed >= state.tickMs) {
      step();
      state.lastTickAt = ts;
    }
    drawBoard();
    drawFood();
    drawSnake();
    drawOverlay();
    requestAnimationFrame(gameLoop);
  }

  // Touch & on-screen dpad
  function bindControls() {
    window.addEventListener('keydown', handleKey);
    pauseBtn.addEventListener('click', () => { togglePause(); });
    restartBtn.addEventListener('click', () => { resetGame(); });

    document.querySelectorAll('.dpad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.getAttribute('data-dir');
        if (dir === 'up') setDirection(0, -1);
        if (dir === 'down') setDirection(0, 1);
        if (dir === 'left') setDirection(-1, 0);
        if (dir === 'right') setDirection(1, 0);
      });
    });

    // Swipe gestures
    let startX = 0, startY = 0, active = false;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY; active = true;
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      if (!active) return;
      const t = e.touches[0];
      const dx = t.clientX - startX; const dy = t.clientY - startY;
      const adx = Math.abs(dx); const ady = Math.abs(dy);
      const threshold = 24;
      if (adx < threshold && ady < threshold) return;
      active = false;
      if (adx > ady) setDirection(dx > 0 ? 1 : -1, 0); else setDirection(0, dy > 0 ? 1 : -1);
    }, { passive: true });
    canvas.addEventListener('touchend', () => { active = false; }, { passive: true });
  }

  // Boot
  resetGame();
  bindControls();
  requestAnimationFrame(gameLoop);
})();



// your code goes here
// ==================== ИГРА ЗМЕЙКА ====================
(function() {
    // ----- ЭЛЕМЕНТЫ DOM -----
    const canvas = document.getElementById('snakeCanvas');
    const ctx = canvas.getContext('2d');
    const scoreSpan = document.getElementById('scoreValue');
    const bestSpan = document.getElementById('bestValue');
    const statusDiv = document.getElementById('gameStatus');
    
    // ----- ПАРАМЕТРЫ ИГРЫ -----
    const GRID_SIZE = 20;
    const CELL_SIZE = canvas.width / GRID_SIZE;
    const GAME_SPEED = 130;
    
    // ----- ПЕРЕМЕННЫЕ СОСТОЯНИЯ -----
    let snake = [];
    let food = { x: 12, y: 10 };
    let direction = 'RIGHT';
    let nextDirection = 'RIGHT';
    let score = 0;
    let bestScore = 0;
    let gameLoop = null;
    let isGameRunning = false;
    
    // ----- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ roundRect (ДОБАВЛЕНА РАНЬШЕ)-----
    function roundRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        return this;
    }
    
    // ----- ЗАГРУЗКА / СОХРАНЕНИЕ РЕКОРДА -----
    function loadBestScore() {
        const saved = localStorage.getItem('snakeBestScore');
        if (saved && !isNaN(parseInt(saved))) {
            bestScore = parseInt(saved);
        } else {
            bestScore = 0;
        }
        bestSpan.innerText = bestScore;
    }
    
    function saveBestScore() {
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('snakeBestScore', bestScore);
            bestSpan.innerText = bestScore;
        }
    }
    
    function updateScoreUI() {
        scoreSpan.innerText = score;
    }
    
    function setStatusMessage(msg, isGameOver = false) {
        statusDiv.innerHTML = msg;
        if (isGameOver) {
            statusDiv.style.color = "#ffdbb5";
            statusDiv.style.background = "#1f0f05cc";
        } else {
            statusDiv.style.color = "#cdf7c3";
            statusDiv.style.background = "#030c06cc";
        }
    }
    
    // ----- ПРОВЕРКА ЗАНЯТОСТИ КЛЕТКИ -----
    function isCellOccupiedBySnake(x, y, ignoreHead = false) {
        const startIdx = ignoreHead ? 1 : 0;
        for (let i = startIdx; i < snake.length; i++) {
            if (snake[i].x === x && snake[i].y === y) return true;
        }
        return false;
    }
    
    // ----- ГЕНЕРАЦИЯ ЕДЫ -----
    function generateRandomFood() {
        const maxAttempts = 4000;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const randX = Math.floor(Math.random() * GRID_SIZE);
            const randY = Math.floor(Math.random() * GRID_SIZE);
            if (!isCellOccupiedBySnake(randX, randY, false)) {
                food = { x: randX, y: randY };
                return;
            }
        }
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                if (!isCellOccupiedBySnake(x, y, false)) {
                    food = { x, y };
                    return;
                }
            }
        }
        if (isGameRunning) gameOver(true);
    }
    
    // ----- ОТРИСОВКА -----
    function drawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Сетка
        ctx.strokeStyle = '#3d8651';
        ctx.lineWidth = 0.8;
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(canvas.width, i * CELL_SIZE);
            ctx.stroke();
        }
        
        // ЕДА
        const fx = food.x * CELL_SIZE;
        const fy = food.y * CELL_SIZE;
        ctx.shadowBlur = 5;
        ctx.shadowColor = "#ff7b3e";
        ctx.fillStyle = '#e63e1a';
        ctx.beginPath();
        ctx.arc(fx + CELL_SIZE/2, fy + CELL_SIZE/2, CELL_SIZE/2.3, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#ffbb77';
        ctx.beginPath();
        ctx.arc(fx + CELL_SIZE/2.5, fy + CELL_SIZE/3, CELL_SIZE/7, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#783b18';
        ctx.fillRect(fx + CELL_SIZE/1.6, fy + CELL_SIZE/4, CELL_SIZE/9, CELL_SIZE/5.5);
        ctx.fill();
        
        // ЗМЕЯ
        for (let i = 0; i < snake.length; i++) {
            const seg = snake[i];
            const segX = seg.x * CELL_SIZE;
            const segY = seg.y * CELL_SIZE;
            const isHead = (i === 0);
            
            const grad = ctx.createLinearGradient(segX, segY, segX+CELL_SIZE, segY+CELL_SIZE);
            if (isHead) {
                grad.addColorStop(0, '#86d46b');
                grad.addColorStop(1, '#4a9e3f');
            } else {
                grad.addColorStop(0, '#64bc48');
                grad.addColorStop(1, '#368a2c');
            }
            ctx.fillStyle = grad;
            roundRect(ctx, segX + 2, segY + 2, CELL_SIZE - 4, CELL_SIZE - 4, 7);
            ctx.fill();
            
            if (!isHead) {
                ctx.fillStyle = '#c8ffa550';
                ctx.beginPath();
                ctx.arc(segX + CELL_SIZE/2, segY + CELL_SIZE/2, CELL_SIZE/6, 0, Math.PI*2);
                ctx.fill();
            }
            
            if (isHead) {
                ctx.fillStyle = '#FFFFFF';
                const eyeSize = CELL_SIZE * 0.12;
                let leftX, leftY, rightX, rightY;
                const offset = CELL_SIZE * 0.22;
                
                switch(direction) {
                    case 'RIGHT':
                        leftX = segX + CELL_SIZE - offset;
                        leftY = segY + offset;
                        rightX = segX + CELL_SIZE - offset;
                        rightY = segY + CELL_SIZE - offset - 2;
                        break;
                    case 'LEFT':
                        leftX = segX + offset - 3;
                        leftY = segY + offset;
                        rightX = segX + offset - 3;
                        rightY = segY + CELL_SIZE - offset - 2;
                        break;
                    case 'UP':
                        leftX = segX + offset;
                        leftY = segY + offset - 2;
                        rightX = segX + CELL_SIZE - offset - 2;
                        rightY = segY + offset - 2;
                        break;
                    default:
                        leftX = segX + offset;
                        leftY = segY + CELL_SIZE - offset;
                        rightX = segX + CELL_SIZE - offset - 2;
                        rightY = segY + CELL_SIZE - offset;
                }
                
                ctx.beginPath();
                ctx.arc(leftX, leftY, eyeSize, 0, Math.PI*2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(rightX, rightY, eyeSize, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#0a2f1a';
                ctx.beginPath();
                ctx.arc(leftX-1.5, leftY-1.5, eyeSize*0.5, 0, Math.PI*2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(rightX-1.5, rightY-1.5, eyeSize*0.5, 0, Math.PI*2);
                ctx.fill();
            }
        }
        ctx.shadowBlur = 0;
    }
    
    // ----- ИГРОВОЙ ТИК -----
    function gameTick() {
        if (!isGameRunning) return;
        
        const newDir = nextDirection;
        if ((direction === 'RIGHT' && newDir !== 'LEFT') ||
            (direction === 'LEFT' && newDir !== 'RIGHT') ||
            (direction === 'UP' && newDir !== 'DOWN') ||
            (direction === 'DOWN' && newDir !== 'UP')) {
            direction = newDir;
        }
        
        let newHead = { ...snake[0] };
        switch(direction) {
            case 'RIGHT': newHead.x += 1; break;
            case 'LEFT':  newHead.x -= 1; break;
            case 'UP':    newHead.y -= 1; break;
            case 'DOWN':  newHead.y += 1; break;
        }
        
        const willEat = (newHead.x === food.x && newHead.y === food.y);
        
        if (willEat) {
            snake.unshift(newHead);
            score++;
            updateScoreUI();
            saveBestScore();
            generateRandomFood();
            if (!isGameRunning) {
                drawCanvas();
                return;
            }
        } else {
            snake.unshift(newHead);
            snake.pop();
        }
        
        const head = snake[0];
        
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            gameOver(false);
            return;
        }
        
        if (isCellOccupiedBySnake(head.x, head.y, true)) {
            gameOver(false);
            return;
        }
        
        drawCanvas();
    }
    
    // ----- ЗАВЕРШЕНИЕ ИГРЫ -----
    function gameOver(isWinFull = false) {
        if (!isGameRunning) return;
        isGameRunning = false;
        
        if (gameLoop) {
            clearInterval(gameLoop);
            gameLoop = null;
        }
        
        if (isWinFull) {
            setStatusMessage("🏆 ПОБЕДА! ПОЛЕ ЗАПОЛНЕНО! 🏆", true);
        } else {
            setStatusMessage("💀 ИГРА ОКОНЧЕНА • Нажмите «НОВАЯ» 💀", true);
        }
        
        saveBestScore();
        drawCanvas();
    }
    
    // ----- УПРАВЛЕНИЕ -----
    function setDirectionSafely(newDir) {
        if (!isGameRunning) return;
        
        if ((direction === 'RIGHT' && newDir === 'LEFT') ||
            (direction === 'LEFT' && newDir === 'RIGHT') ||
            (direction === 'UP' && newDir === 'DOWN') ||
            (direction === 'DOWN' && newDir === 'UP')) {
            return;
        }
        nextDirection = newDir;
    }
    
    function handleKeyboard(e) {
        const key = e.key;
        let dir = null;
        if (key === 'ArrowUp') dir = 'UP';
        else if (key === 'ArrowDown') dir = 'DOWN';
        else if (key === 'ArrowLeft') dir = 'LEFT';
        else if (key === 'ArrowRight') dir = 'RIGHT';
        
        if (dir) {
            e.preventDefault();
            setDirectionSafely(dir);
        }
    }
    
    // ----- ПЕРЕЗАПУСК -----
    function restartGame() {
        if (gameLoop) {
            clearInterval(gameLoop);
            gameLoop = null;
        }
        
        const centerX = Math.floor(GRID_SIZE/2);
        const centerY = Math.floor(GRID_SIZE/2);
        snake = [
            { x: centerX, y: centerY },
            { x: centerX-1, y: centerY },
            { x: centerX-2, y: centerY }
        ];
        direction = 'RIGHT';
        nextDirection = 'RIGHT';
        score = 0;
        isGameRunning = true;
        
        updateScoreUI();
        setStatusMessage("▶ ИГРА АКТИВНА", false);
        generateRandomFood();
        drawCanvas();
        
        gameLoop = setInterval(gameTick, GAME_SPEED);
    }
    
    // ----- ИНИЦИАЛИЗАЦИЯ -----
    function init() {
        loadBestScore();
        
        window.addEventListener('keydown', handleKeyboard);
        document.getElementById('upBtn').addEventListener('click', () => setDirectionSafely('UP'));
        document.getElementById('downBtn').addEventListener('click', () => setDirectionSafely('DOWN'));
        document.getElementById('leftBtn').addEventListener('click', () => setDirectionSafely('LEFT'));
        document.getElementById('rightBtn').addEventListener('click', () => setDirectionSafely('RIGHT'));
        document.getElementById('restartBtn').addEventListener('click', () => restartGame());
        
        const allBtns = document.querySelectorAll('button');
        allBtns.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.click();
            });
        });
        
        restartGame();
    }
    
    document.addEventListener('DOMContentLoaded', init);
})();

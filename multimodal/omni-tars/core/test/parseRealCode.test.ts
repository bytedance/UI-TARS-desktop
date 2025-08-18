import { describe, it, expect } from 'vitest';
import { parseCodeContent } from '../src/utils/parser';

const input = `
<think>Now I need to create the JavaScript file with the tic-tac-toe implementation. Let me create the tic-tac-toe.js file with this implementation.</think>
<code_env>
<function=str_replace_editor>
<parameter=command>create</parameter>
<parameter=path>/home/gem/tic_tac_toe_js/tic-tac-toe.js</parameter>
<parameter=file_text>#!/usr/bin/env node
class TicTacToe {
    constructor() {
        this.board = [
            [' ', ' ', ' ']
        ];
        
        // Track current player (X goes first)
        this.currentPlayer = 'X';
        
        // Game status
        this.gameActive = true;
        
        // Winning combinations
        this.winningCombinations = [
            // Rows
            [[0, 0], [0, 1], [0, 2]],
            [[1, 0], [1, 1], [1, 2]],
            [[2, 0], [2, 1], [2, 2]],
            // Columns
            [[0, 0], [1, 0], [2, 0]],
            [[0, 1], [1, 1], [2, 1]],
            [[0, 2], [1, 2], [2, 2]],
            // Diagonals
            [[0, 0], [1, 1], [2, 2]],
            [[0, 2], [1, 1], [2, 0]]
        ];
        
        // Start the game
        this.startGame();
    }
    
    // Print the game board
    printBoard() {
        console.clear();
        console.log('Tic-Tac-Toe Game');
        console.log('-----------------');
        console.log('  1 2 3');
        for (let i = 0; i < 3; i++) {
            let row = \`\${i + 1} \`;
            for (let j = 0; j < 3; j++) {
                row += this.board[i][j];
                if (j < 2) row += '|';
            }
            console.log(row);
            if (i < 2) console.log('  -----');
        }
        console.log('\nCurrent player:', this.currentPlayer);
    }
    
    // Check if the game has been won
    checkWin() {
        for (const combination of this.winningCombinations) {
            const [a, b, c] = combination;
            if (
                this.board[a[0]][a[1]] !== ' ' &&
                this.board[a[0]][a[1]] === this.board[b[0]][b[1]] &&
                this.board[a[0]][a[1]] === this.board[c[0]][c[1]]
            ) {
                return this.board[a[0]][a[1]];
            }
        }
        
        // Check for draw
        if (this.board.flat().every(cell => cell !== ' ')) {
            return 'draw';
        }
        
        return null;
    }
    
    // Handle player move
    makeMove(row, col) {
        // Convert to 0-based index
        row--;
        col--;
        
        // Check if the move is valid
        if (
            !this.gameActive ||
            row < 0 || row >= 3 ||
            col < 0 || col >= 3 ||
            this.board[row][col] !== ' '
        ) {
            return false;
        }
        
        // Make the move
        this.board[row][col] = this.currentPlayer;
        
        // Check for game end
        const winner = this.checkWin();
        if (winner) {
            this.gameActive = false;
            this.printBoard();
            
            if (winner === 'draw') {
                console.log('\nGame ended in a draw!');
            } else {
                console.log(\`\nPlayer \${winner} wins!\`);
            }
            
            return true;
        }
        
        // Switch player
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        
        return true;
    }
    
    // Start the game and handle input
    startGame() {
        this.printBoard();
        
        // Handle user input
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const handleInput = (input) => {
            if (!this.gameActive) {
                readline.close();
                return;
            }
            
            // Parse input (format: row col)
            const [row, col] = input.trim().split(' ').map(Number);
            
            if (isNaN(row) || isNaN(col) || row < 1 || row > 3 || col < 1 || col > 3) {
                console.log('Invalid input. Please enter row and column numbers (1-3) separated by space.');
                readline.question('Enter your move (row col): ', handleInput);
                return;
            }
            
            // Make the move
            const validMove = this.makeMove(row, col);
            
            if (!validMove) {
                console.log('Invalid move. That cell is already occupied or out of bounds.');
            } else if (this.gameActive) {
                this.printBoard();
            }
            
            if (this.gameActive) {
                readline.question('Enter your move (row col): ', handleInput);
            } else {
                readline.close();
            }
        };
        
        readline.question('Enter your move (row col): ', handleInput);
    }
}

// Start a new game
new TicTacToe();
</parameter>
</function>`;

describe('parse real code successfully', () => {
  it('parse game code', () => {
    const result = parseCodeContent(input);

    expect(result.think).toBe(
      'Now I need to create the JavaScript file with the tic-tac-toe implementation. Let me create the tic-tac-toe.js file with this implementation.',
    );
    expect(result.tools.length).toBe(1);
    expect(result.tools[0].function.name).toBe('str_replace_editor');
    expect(JSON.parse(result.tools[0].function.arguments)).toEqual({
      command: 'create',
      path: '/home/gem/tic_tac_toe_js/tic-tac-toe.js',
      file_text: `#!/usr/bin/env node
class TicTacToe {
    constructor() {
        this.board = [
            [' ', ' ', ' ']
        ];
        
        // Track current player (X goes first)
        this.currentPlayer = 'X';
        
        // Game status
        this.gameActive = true;
        
        // Winning combinations
        this.winningCombinations = [
            // Rows
            [[0, 0], [0, 1], [0, 2]],
            [[1, 0], [1, 1], [1, 2]],
            [[2, 0], [2, 1], [2, 2]],
            // Columns
            [[0, 0], [1, 0], [2, 0]],
            [[0, 1], [1, 1], [2, 1]],
            [[0, 2], [1, 2], [2, 2]],
            // Diagonals
            [[0, 0], [1, 1], [2, 2]],
            [[0, 2], [1, 1], [2, 0]]
        ];
        
        // Start the game
        this.startGame();
    }
    
    // Print the game board
    printBoard() {
        console.clear();
        console.log('Tic-Tac-Toe Game');
        console.log('-----------------');
        console.log('  1 2 3');
        for (let i = 0; i < 3; i++) {
            let row = \`\${i + 1} \`;
            for (let j = 0; j < 3; j++) {
                row += this.board[i][j];
                if (j < 2) row += '|';
            }
            console.log(row);
            if (i < 2) console.log('  -----');
        }
        console.log('\nCurrent player:', this.currentPlayer);
    }
    
    // Check if the game has been won
    checkWin() {
        for (const combination of this.winningCombinations) {
            const [a, b, c] = combination;
            if (
                this.board[a[0]][a[1]] !== ' ' &&
                this.board[a[0]][a[1]] === this.board[b[0]][b[1]] &&
                this.board[a[0]][a[1]] === this.board[c[0]][c[1]]
            ) {
                return this.board[a[0]][a[1]];
            }
        }
        
        // Check for draw
        if (this.board.flat().every(cell => cell !== ' ')) {
            return 'draw';
        }
        
        return null;
    }
    
    // Handle player move
    makeMove(row, col) {
        // Convert to 0-based index
        row--;
        col--;
        
        // Check if the move is valid
        if (
            !this.gameActive ||
            row < 0 || row >= 3 ||
            col < 0 || col >= 3 ||
            this.board[row][col] !== ' '
        ) {
            return false;
        }
        
        // Make the move
        this.board[row][col] = this.currentPlayer;
        
        // Check for game end
        const winner = this.checkWin();
        if (winner) {
            this.gameActive = false;
            this.printBoard();
            
            if (winner === 'draw') {
                console.log('\nGame ended in a draw!');
            } else {
                console.log(\`\nPlayer \${winner} wins!\`);
            }
            
            return true;
        }
        
        // Switch player
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        
        return true;
    }
    
    // Start the game and handle input
    startGame() {
        this.printBoard();
        
        // Handle user input
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const handleInput = (input) => {
            if (!this.gameActive) {
                readline.close();
                return;
            }
            
            // Parse input (format: row col)
            const [row, col] = input.trim().split(' ').map(Number);
            
            if (isNaN(row) || isNaN(col) || row < 1 || row > 3 || col < 1 || col > 3) {
                console.log('Invalid input. Please enter row and column numbers (1-3) separated by space.');
                readline.question('Enter your move (row col): ', handleInput);
                return;
            }
            
            // Make the move
            const validMove = this.makeMove(row, col);
            
            if (!validMove) {
                console.log('Invalid move. That cell is already occupied or out of bounds.');
            } else if (this.gameActive) {
                this.printBoard();
            }
            
            if (this.gameActive) {
                readline.question('Enter your move (row col): ', handleInput);
            } else {
                readline.close();
            }
        };
        
        readline.question('Enter your move (row col): ', handleInput);
    }
}

// Start a new game
new TicTacToe();`,
    });
  });
});

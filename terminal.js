const output = document.getElementById('output');
const currentInput = document.getElementById('current-input');

const commands = {
    help: () => `Available commands:<br>
    <span class="terminal-text-blue">/hub</span> - Open Master Converter Hub<br>
    <span class="terminal-text-blue">/ocr</span> - Launch 1000 DPI OCR Engine<br>
    <span class="terminal-text-blue">/convert</span> - Image to PDF Converter<br>
    <span class="terminal-text-blue">/clear</span> - Clear terminal screen`,

    '/hub': () => {
        addLine('Opening Converter Master Hub...', 'info');
        setTimeout(() => window.location.href = 'hub.html', 1000);
        return 'Fetching available neural modules...';
    },

    '/ocr': () => {
        addLine('Launching AmazingOCR Neural Engine...', 'info');
        setTimeout(() => window.location.href = 'engine.html', 1000);
        return 'Establishing secure connection...';
    },

    '/convert': () => {
        addLine('Launching Image Converter...', 'info');
        setTimeout(() => window.location.href = 'converter.html', 1000);
        return 'Warming up PDF-Lib engines...';
    },

    '/office': () => 'Error: Office Data Connector in Beta. Access restricted.',

    '/clear': () => {
        output.innerHTML = '';
        return '';
    }
};

const bootSequence = [
    { text: 'AmazingSuite OS v2.4.0 (AESTHETIC_MODE)', type: 'info' },
    { text: 'Last login: ' + new Date().toLocaleString(), type: 'info' },
    { text: 'Initializing neural network cores... [DONE]', type: 'success' },
    { text: 'Loading 1000 DPI Atomic OCR modules... [DONE]', type: 'success' },
    { text: 'System ready. Type <span class="terminal-text-blue">help</span> for available commands.', type: 'info' },
    { text: '----------------------------------------', type: 'info' }
];

async function addLine(text, type = 'default') {
    const div = document.createElement('div');
    div.className = `line ${type}`;
    output.appendChild(div);

    // Simple typing effect
    if (type === 'prompt-result') {
        div.innerHTML = text;
    } else {
        const span = document.createElement('span');
        div.appendChild(span);
        for (let char of text) {
            span.innerHTML += char;
            await new Promise(r => setTimeout(r, 10));
            output.scrollTop = output.scrollHeight;
        }
    }
}

async function startBoot() {
    for (let line of bootSequence) {
        await addLine(line.text, line.type);
        await new Promise(r => setTimeout(r, 200));
    }
}

// Simulated Input Handling
let commandHistory = [];
let historyIndex = -1;

document.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        const cmd = currentInput.textContent.trim().toLowerCase();
        const fullLine = `<span class="prompt">af@helpmastr ~ %</span> ${cmd}`;
        await addLine(fullLine, 'prompt-result');

        if (cmd) {
            if (commands[cmd]) {
                const result = commands[cmd]();
                if (result) await addLine(result, 'prompt-result');
            } else {
                await addLine(`<span class="terminal-text-yellow">zsh: command not found: ${cmd}</span>`, 'prompt-result');
            }
        }

        currentInput.textContent = '';
    } else if (e.key === 'Backspace') {
        currentInput.textContent = currentInput.textContent.slice(0, -1);
    } else if (e.key.length === 1) {
        currentInput.textContent += e.key;
    }
});

startBoot();

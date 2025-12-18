// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const statusSection = document.getElementById('status-section');
const statusLabel = document.getElementById('status-label');
const progressPercent = document.getElementById('progress-percent');
const progressBar = document.getElementById('progress-bar');
const pageInfo = document.getElementById('page-info');

const batchProgressContainer = document.getElementById('batch-progress-container');
const batchProgressText = document.getElementById('batch-progress-text');
const batchProgressBar = document.getElementById('batch-progress-bar');

const resultsSection = document.getElementById('results-section');
const resultsArea = document.getElementById('results-area');
const copyBtn = document.getElementById('copy-btn');
const downloadTxtBtn = document.getElementById('download-txt-btn');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const downloadZipBtn = document.getElementById('download-zip-btn');
const resetBtn = document.getElementById('reset-btn');
const languageSelect = document.getElementById('language-select');

let processedFiles = []; // Array of { name, text, pdfBlob }
let scheduler = null;
let currentLanguage = 'eng';

// Drag and drop handlers
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length > 0) {
        processBatch(files);
    } else {
        alert('Please upload valid PDF files.');
    }
});

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) processBatch(files);
});

async function initScheduler(lang) {
    if (scheduler && currentLanguage !== lang) {
        await scheduler.terminate();
        scheduler = null;
    }

    if (scheduler) return;

    currentLanguage = lang;
    scheduler = Tesseract.createScheduler();

    const numWorkers = Math.min(navigator.hardwareConcurrency || 4, 4);
    updateProgress(0, `Initializing ${numWorkers} engines for ${lang}...`);

    for (let i = 0; i < numWorkers; i++) {
        const worker = await Tesseract.createWorker(lang, 1);
        scheduler.addWorker(worker);
    }
}

async function processBatch(files) {
    const selectedLang = languageSelect.value;

    dropzone.style.display = 'none';
    statusSection.style.display = 'block';
    resultsSection.style.display = 'none';
    resultsArea.value = '';
    processedFiles = [];

    batchProgressContainer.style.display = files.length > 1 ? 'block' : 'none';
    updateBatchProgress(0, files.length);

    try {
        await initScheduler(selectedLang);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            updateBatchProgress(i + 1, files.length);
            const result = await processFile(file);
            processedFiles.push(result);
        }

        finished();
    } catch (error) {
        console.error(error);
        alert('An error occurred during processing. Please try again.');
        resetUI();
    }
}

async function processFile(file) {
    updateProgress(0, `Processing: ${file.name}`);

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    const pdfLibDoc = await PDFLib.PDFDocument.create();
    let fileExtractedText = '';

    for (let i = 1; i <= totalPages; i++) {
        updateProgress((i / totalPages) * 100, `OCR: Page ${i}/${totalPages}`);
        pageInfo.textContent = `Rendering high-res page for handwriting detection...`;

        const page = await pdf.getPage(i);
        // Increase scale for optimized handwriting/small text (approx 300 DPI)
        const viewport = page.getViewport({ scale: 3.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        const { data } = await scheduler.addJob('recognize', canvas, { pdfTitle: `Page ${i}` }, { pdf: true });
        fileExtractedText += data.text + '\n\n';

        const pagePdf = await PDFLib.PDFDocument.load(data.pdf);
        const [copiedPage] = await pdfLibDoc.copyPages(pagePdf, [0]);
        pdfLibDoc.addPage(copiedPage);
    }

    const pdfBytes = await pdfLibDoc.save();
    return {
        name: file.name,
        text: fileExtractedText,
        pdfBlob: new Blob([pdfBytes], { type: 'application/pdf' })
    };
}

function updateProgress(percent, label) {
    progressBar.style.width = `${percent}%`;
    progressPercent.textContent = `${Math.round(percent)}%`;
    statusLabel.textContent = label;
}

function updateBatchProgress(current, total) {
    const percent = (current / total) * 100;
    batchProgressBar.style.width = `${percent}%`;
    batchProgressText.textContent = `${current} / ${total} Files`;
}

function finished() {
    statusSection.style.display = 'none';
    resultsSection.style.display = 'block';

    const combinedText = processedFiles.map(pf => `--- ${pf.name} ---\n\n${pf.text}`).join('\n\n');
    resultsArea.value = combinedText.trim();

    if (processedFiles.length > 1) {
        downloadPdfBtn.style.display = 'none';
        downloadZipBtn.style.display = 'flex';
    } else {
        downloadPdfBtn.style.display = 'flex';
        downloadZipBtn.style.display = 'none';
    }

    lucide.createIcons();
}

function resetUI() {
    dropzone.style.display = 'block';
    statusSection.style.display = 'none';
    resultsSection.style.display = 'none';
    fileInput.value = '';
    processedFiles = [];
    batchProgressContainer.style.display = 'none';
}

copyBtn.addEventListener('click', () => {
    resultsArea.select();
    document.execCommand('copy');
    const originalContent = copyBtn.innerHTML;
    copyBtn.innerHTML = '<i data-lucide="check" size="18"></i> Copied!';
    lucide.createIcons();
    setTimeout(() => {
        copyBtn.innerHTML = originalContent;
        lucide.createIcons();
    }, 2000);
});

downloadTxtBtn.addEventListener('click', () => {
    const text = resultsArea.value;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = processedFiles.length > 1 ? 'batch-extracted-text.txt' : 'extracted-text.txt';
    a.click();
    URL.revokeObjectURL(url);
});

downloadPdfBtn.addEventListener('click', () => {
    if (processedFiles.length === 0) return;
    const { pdfBlob, name } = processedFiles[0];
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name.replace('.pdf', '-ocr.pdf');
    a.click();
    URL.revokeObjectURL(url);
});

downloadZipBtn.addEventListener('click', async () => {
    if (processedFiles.length === 0) return;

    const zip = new JSZip();
    processedFiles.forEach(file => {
        const baseName = file.name.replace('.pdf', '');
        zip.file(`${baseName}.txt`, file.text);
        zip.file(`${baseName}-ocr.pdf`, file.pdfBlob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ocr-results.zip';
    a.click();
    URL.revokeObjectURL(url);
});

resetBtn.addEventListener('click', resetUI);

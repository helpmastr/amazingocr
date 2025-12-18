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

    const numWorkers = Math.min(navigator.hardwareConcurrency || 4, 8);
    updateProgress(0, `Warming up ${numWorkers} super-engines for ${lang}...`);

    for (let i = 0; i < numWorkers; i++) {
        const worker = await Tesseract.createWorker(lang, 1, {
            workerBlobURL: false,
            logger: m => {
                if (m.status === 'recognizing') {
                    // We don't update individual worker progress to avoid UI jank
                }
            }
        });

        // Optimize for handwriting and legacy documents
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO, // Automatic page segmentation with OSD
            tessjs_create_hocr: '0',
            tessjs_create_tsv: '0',
            textonly_pdf: '0'
        });

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
    updateProgress(0, `Loading: ${file.name}`);

    const profile = document.getElementById('profile-select').value;
    const arrayBuffer = await file.arrayBuffer();
    const fileSizeMB = arrayBuffer.byteLength / (1024 * 1024);

    // Auto-optimize for large files to prevent crash
    let efficientScale = 2.0;
    if (profile === 'fast') efficientScale = 1.5; // Super Fast
    else if (profile === 'balanced') efficientScale = 2.5; // Good quality
    else if (profile === 'hd') efficientScale = 4.0; // High DPI (simulated 1000 DPI effectively) but restricted

    // Safety override for large files
    if (fileSizeMB > 20 && efficientScale > 2.0) {
        efficientScale = 2.0;
        updateProgress(5, `Large file detected (${fileSizeMB.toFixed(1)}MB). Optimizing scale to ${efficientScale}x for safety...`);
    } else if (fileSizeMB > 50) {
        efficientScale = 1.5;
        updateProgress(5, `Heavy file detected (${fileSizeMB.toFixed(1)}MB). Enabling SUPER_FAST mode for stability...`);
    } else if (profile === 'hd') {
        updateProgress(5, `High-Fidelity rendering enabled (Scale: ${efficientScale}x)...`);
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    const pdfLibDoc = await PDFLib.PDFDocument.create();

    const indices = Array.from({ length: totalPages }, (_, i) => i + 1);
    let completedPages = 0;

    // Limit concurrency based on file size/profile to save memory
    const concurrency = (fileSizeMB > 30 || profile === 'hd') ? 1 : 2;

    updateProgress(5, `Processing ${totalPages} pages with ${concurrency}x concurrency...`);

    // Process pages sequentially or with limited concurrency
    const results = [];
    for (let i = 0; i < indices.length; i += concurrency) {
        const chunk = indices.slice(i, i + concurrency);
        const chunkResults = await Promise.all(chunk.map(async (pageIndex) => {
            const page = await pdf.getPage(pageIndex);

            // Dynamic scaling based on profile/size
            const viewport = page.getViewport({ scale: efficientScale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;

            // Apply Super-Accuracy Pre-processing
            const processedCanvas = preprocessImage(canvas);

            const result = await scheduler.addJob('recognize', processedCanvas, { pdfTitle: `Page ${pageIndex}` }, { pdf: true });

            // Memory Cleanup: Explicitly clear large canvases
            canvas.width = 0;
            canvas.height = 0;
            if (processedCanvas !== canvas) {
                processedCanvas.width = 0;
                processedCanvas.height = 0;
            }

            // Update progress
            completedPages++;
            updateProgress((completedPages / totalPages) * 100, `OCR: Completed ${completedPages}/${totalPages} pages`);

            return { index: pageIndex, data: result.data };
        }));
        results.push(...chunkResults);
    }

    // Sort results by index to maintain page order
    results.sort((a, b) => a.index - b.index);

    let fileExtractedText = '';
    for (const res of results) {
        fileExtractedText += res.data.text + '\n\n';
        const pagePdf = await PDFLib.PDFDocument.load(res.data.pdf);
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

/**
 * Advanced Image Pre-processing for "Hard" Handwriting
 * 1. Grayscale Conversion
 * 2. Contrast Enhancement
 * 3. Sharpening
 * 4. Adaptive-like Thresholding simulation
 */
function preprocessImage(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Apply CSS filters for fast initial enhancement
    // grayscale(1) removes color noise
    // contrast(1.5) makes text pop
    // brightness(1.1) clears murky backgrounds
    const bufferCanvas = document.createElement('canvas');
    bufferCanvas.width = width;
    bufferCanvas.height = height;
    const bctx = bufferCanvas.getContext('2d');

    bctx.filter = 'grayscale(100%) contrast(150%) brightness(110%)';
    bctx.drawImage(canvas, 0, 0);

    // Manual Pixel-level sharpening (Unsharp Mask simulation)
    const imageData = bctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Simple sharpening convolution
    // This makes the edges of handwriting strokes much clearer for Tesseract
    const sharpenedData = bctx.createImageData(width, height);
    const sData = sharpenedData.data;
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) { // R, G, B
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                        sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                const sIdx = (y * width + x) * 4 + c;
                sData[sIdx] = Math.min(255, Math.max(0, sum));
            }
            sData[(y * width + x) * 4 + 3] = 255; // Alpha
        }
    }

    bctx.putImageData(sharpenedData, 0, 0);
    return bufferCanvas;
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

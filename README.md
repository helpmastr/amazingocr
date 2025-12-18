# AmazingSuite - OCR & Converter Engine

> **Terminal-Themed Productivity Suite** for high-efficiency document processing.

![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge) ![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge)

**AmazingSuite** is a web-based toolkit designed with a premium **hacker/terminal aesthetic**. It provides local-first tools for OCR, file conversion, and document management without needing a backend.

---

## 🖥️ Screenshots

| Command Center | Converter Hub |
|:---:|:---:|
| ![Index](screenshot_index.png) | ![Hub](screenshot_hub.png) |

| Universal Converter | OCR Engine |
|:---:|:---:|
| ![Converter](screenshot_converter.png) | ![OCR](screenshot_ocr.png) |

---

## 🚀 Features

### Universal Converter v2
A step-by-step conversion engine supporting **cross-format conversions**:

1. **Select Input Type** — Documents, Images, Video, or Audio
2. **Upload File** — Drag & drop or browse
3. **Choose Output Format** — Any format (PDF→PNG, MP4→MP3, etc.)
4. **Apply OCR** — Optional text extraction on output
5. **Download** — Get your converted file

**Supported Formats:**
- **Documents**: PDF, DOCX, TXT, RTF, ODT, HTML
- **Images**: JPG, PNG, WebP, GIF, TIFF, BMP, HEIC
- **Video**: MP4, MOV, AVI, MKV, WebM
- **Audio**: MP3, WAV, AAC, FLAC, OGG, M4A

---

### Atomic OCR Engine
High-fidelity text extraction with performance profiles:

- **Super Fast** — Optimized for speed
- **Balanced** — Standard quality
- **500 DPI** — Maximum accuracy for small text

**Features:**
- Multi-language support (English, Arabic, French, German, Spanish, Japanese)
- Automatic large file optimization (prevents browser crashes)
- Searchable PDF output
- Batch processing with ZIP export

---

### Terminal Aesthetic
- **Matrix Green** typography & glowing CRT effects
- **macOS-style** window chrome and dock
- **Glassmorphism** frosted glass UI elements
- **Responsive** design with smooth animations

---

## ⚙️ Installation

No build required! Simply clone and open in your browser:

```bash
git clone https://github.com/helpmastr/amazingocr.git
cd amazingocr
open index.html
```

---

## 📁 Project Structure

```
├── index.html          # Command Center (home)
├── hub.html            # Converter Hub
├── universal-converter.html  # Step-by-step converter
├── engine.html         # OCR Engine
├── converter.html      # Image to PDF converter
├── app.js              # OCR processing logic
├── terminal.css        # Terminal theme styles
└── style.css           # Base styles
```

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

> Built with ❤️ using Vanilla JS, PDF-Lib, Tesseract.js, and pdf.js

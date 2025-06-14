
// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.5;
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');

// File input elements
const fileInput = document.getElementById('pdfFile');
const fileInfo = document.getElementById('fileInfo');
const viewerSection = document.getElementById('viewerSection');

// Control elements
const prevBtn = document.getElementById('prevPage');
const nextBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');

// File upload handler
fileInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  
  if (file && file.type === 'application/pdf') {
    fileInfo.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    
    const fileReader = new FileReader();
    fileReader.onload = function() {
      const typedarray = new Uint8Array(this.result);
      loadPDF(typedarray);
    };
    fileReader.readAsArrayBuffer(file);
  } else {
    fileInfo.textContent = 'Please select a valid PDF file.';
    fileInfo.style.color = 'red';
  }
});

// Load PDF document
function loadPDF(data) {
  pdfjsLib.getDocument(data).promise.then(function(pdfDoc_) {
    pdfDoc = pdfDoc_;
    pageNum = 1;
    updatePageInfo();
    renderPage(pageNum);
    viewerSection.style.display = 'block';
    fileInfo.style.color = '#666';
  }).catch(function(error) {
    fileInfo.textContent = 'Error loading PDF: ' + error.message;
    fileInfo.style.color = 'red';
  });
}

// Render a page
function renderPage(num) {
  pageRendering = true;
  
  pdfDoc.getPage(num).then(function(page) {
    const viewport = page.getViewport({ scale: scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    
    const renderTask = page.render(renderContext);
    
    renderTask.promise.then(function() {
      pageRendering = false;
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });
  
  updatePageInfo();
  updateNavigationButtons();
}

// Queue render if another render is in progress
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

// Update page info display
function updatePageInfo() {
  if (pdfDoc) {
    pageInfo.textContent = `Page ${pageNum} of ${pdfDoc.numPages}`;
  }
}

// Update navigation button states
function updateNavigationButtons() {
  if (pdfDoc) {
    prevBtn.disabled = pageNum <= 1;
    nextBtn.disabled = pageNum >= pdfDoc.numPages;
  }
}

// Event listeners for controls
prevBtn.addEventListener('click', function() {
  if (pageNum <= 1) return;
  pageNum--;
  queueRenderPage(pageNum);
});

nextBtn.addEventListener('click', function() {
  if (pageNum >= pdfDoc.numPages) return;
  pageNum++;
  queueRenderPage(pageNum);
});

zoomInBtn.addEventListener('click', function() {
  scale += 0.25;
  if (scale > 3) scale = 3;
  queueRenderPage(pageNum);
});

zoomOutBtn.addEventListener('click', function() {
  scale -= 0.25;
  if (scale < 0.5) scale = 0.5;
  queueRenderPage(pageNum);
});

// Keyboard navigation
document.addEventListener('keydown', function(e) {
  if (!pdfDoc) return;
  
  switch(e.key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      if (pageNum > 1) {
        pageNum--;
        queueRenderPage(pageNum);
      }
      break;
    case 'ArrowRight':
    case 'ArrowDown':
      if (pageNum < pdfDoc.numPages) {
        pageNum++;
        queueRenderPage(pageNum);
      }
      break;
    case '+':
    case '=':
      scale += 0.25;
      if (scale > 3) scale = 3;
      queueRenderPage(pageNum);
      break;
    case '-':
      scale -= 0.25;
      if (scale < 0.5) scale = 0.5;
      queueRenderPage(pageNum);
      break;
  }
});

// Drag and drop functionality
document.addEventListener('dragover', function(e) {
  e.preventDefault();
});

document.addEventListener('drop', function(e) {
  e.preventDefault();
  const files = e.dataTransfer.files;
  
  if (files.length > 0 && files[0].type === 'application/pdf') {
    fileInput.files = files;
    const event = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(event);
  }
});

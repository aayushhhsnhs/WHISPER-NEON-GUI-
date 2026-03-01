// ===============================
// ELEMENTS
// ===============================
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const removeFile = document.getElementById("removeFile");

const modelSelect = document.getElementById("modelSelect");
const taskSelect = document.getElementById("taskSelect");
const languageSelect = document.getElementById("languageSelect");

const processBtn = document.getElementById("processBtn");
const progressSection = document.getElementById("progressSection");
const progressBar = document.getElementById("progressBar");
const progressStatus = document.getElementById("progressStatus");

const resultSection = document.getElementById("resultSection");
const downloadBtn = document.getElementById("downloadBtn");

const waveformCard = document.getElementById("waveformCard");
const waveformBar = document.getElementById("waveformBar");
const waveTime = document.getElementById("waveTime");
const waveDuration = document.getElementById("waveDuration");

const gpuText = document.getElementById("gpuText");
const gpuSpeed = document.getElementById("gpuSpeed");

// ===============================
// STATE
// ===============================
let selectedFile = null;
let audioElement = null;

// ===============================
// UPLOAD HANDLERS
// ===============================
uploadArea.addEventListener("click", () => fileInput.click());

uploadArea.addEventListener("dragover", e => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", e => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener("change", e => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

// ===============================
// FILE LOAD
// ===============================
function handleFile(file) {
    selectedFile = file;

    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.style.display = "flex";

    processBtn.disabled = false;

    showWaveform(file);
}

// ===============================
// REMOVE FILE
// ===============================
removeFile.addEventListener("click", () => {
    selectedFile = null;
    fileInput.value = "";
    fileInfo.style.display = "none";
    processBtn.disabled = true;
    waveformCard.style.display = "none";
});

// ===============================
// FILE SIZE FORMAT
// ===============================
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
}

// ===============================
// WAVEFORM PREVIEW
// ===============================
function showWaveform(file) {
    waveformCard.style.display = "block";

    if (audioElement) {
        audioElement.pause();
    }

    const url = URL.createObjectURL(file);
    audioElement = new Audio(url);

    audioElement.addEventListener("loadedmetadata", () => {
        waveDuration.textContent = formatTime(audioElement.duration);
    });

    audioElement.addEventListener("timeupdate", () => {
        waveTime.textContent = formatTime(audioElement.currentTime);

        const percent = (audioElement.currentTime / audioElement.duration) * 100;
        waveformBar.style.background =
            `linear-gradient(90deg,#7b2cff ${percent}%,#ff2cff ${percent}%)`;
    });

    waveformBar.onclick = e => {
        const rect = waveformBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        audioElement.currentTime = percent * audioElement.duration;
        audioElement.play();
    };
}

// ===============================
// TIME FORMAT
// ===============================
function formatTime(sec) {
    if (!sec) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

// ===============================
// GPU INIT
// ===============================
function initGPU() {
    const device = window.APP_DEVICE || "CPU";

    if (device === "GPU") {
        gpuText.textContent = "GPU Available (Apple Metal)";
    } else {
        gpuText.textContent = "CPU Mode";
    }

    updateSpeed();
}

// ===============================
// SPEED MAP
// ===============================
const speedMapGPU = {
    tiny: "8× realtime",
    base: "5× realtime",
    small: "3× realtime",
    medium: "2× realtime",
    large: "1× realtime"
};

const speedMapCPU = {
    tiny: "2× realtime",
    base: "1.2× realtime",
    small: "0.8× realtime",
    medium: "0.5× realtime",
    large: "0.25× realtime"
};

function updateSpeed() {
    const device = window.APP_DEVICE || "CPU";
    const model = modelSelect.value;

    gpuSpeed.textContent =
        "~" + (device === "GPU" ? speedMapGPU[model] : speedMapCPU[model]);
}

modelSelect.addEventListener("change", updateSpeed);

// ===============================
// PROCESS
// ===============================
processBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    progressSection.style.display = "block";
    resultSection.style.display = "none";

    progressBar.style.width = "10%";
    progressStatus.textContent = "Uploading…";

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("model", modelSelect.value);
    formData.append("task", taskSelect.value);
    formData.append("language", languageSelect.value);

    try {
        const response = await fetch("/process", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error("Processing failed");
        }

        progressBar.style.width = "80%";
        progressStatus.textContent = "Transcribing…";

        const result = await response.json();

        progressBar.style.width = "100%";
        progressStatus.textContent = "Complete";

        resultSection.style.display = "block";
        downloadBtn.href = result.download_url;
        downloadBtn.textContent = "Download SRT";

    } catch (err) {
        progressStatus.textContent = "Error";
        console.error(err);
    }
});
// ===============================
// WORKSPACE COMING SOON
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    const workspaceLink = document.getElementById("workspaceLink");
    const toast = document.getElementById("comingSoonToast");

    if (!workspaceLink || !toast) {
        console.log("Workspace toast elements missing");
        return;
    }

    workspaceLink.addEventListener("click", () => {
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 2000);
    });
});
// ===============================
// INIT
// ===============================
initGPU();
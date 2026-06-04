import JSZip from "jszip";

const TEMPLATE_SRC = new URL("./template_finlit.png", import.meta.url).href;
const templateImage = new Image();
templateImage.src = TEMPLATE_SRC;

const canvas = document.getElementById("previewCanvas");
const ctx = canvas.getContext("2d");

const participantsInput = document.getElementById("participants");
const dateInput = document.getElementById("dateInput");
const fixedPartInput = document.getElementById("fixedPart");
const startSequenceInput = document.getElementById("startSequence");
const digitsCountInput = document.getElementById("digitsCount");
const tailPartInput = document.getElementById("tailPart");
const statusBox = document.getElementById("status");

function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.style.color = isError ? "#b42318" : "#0c8674";
}

function parseParticipants() {
  return participantsInput.value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [fullNameRaw] = line.split(";");
      return { fullName: (fullNameRaw || "").trim() };
    })
    .filter(item => item.fullName);
}

function fitText(text, maxWidth, startSize, fontFamily, fontStyle = "") {
  let size = startSize;
  while (size > 28) {
    ctx.font = `${fontStyle} ${size}px ${fontFamily}`.trim();
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function drawCenteredText(text, x, y, maxWidth, startSize, family, style = "", color = "#000") {
  const fontSize = fitText(text, maxWidth, startSize, family, style);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${style} ${fontSize}px ${family}`.trim();
  ctx.fillText(text, x, y);
}

function buildCertificateNumber(index) {
  const fixedPart = fixedPartInput.value.trim() || "КЗ 44550814";
  const startSequence = Number(startSequenceInput.value || 25);
  const digitsCount = Number(startSequenceInput.value === "" ? 6 : digitsCountInput.value || 6);
  const tailPart = tailPartInput.value || "-26";
  const current = String(startSequence + index).padStart(digitsCount, "0");
  return `${fixedPart}/${current}${tailPart}`;
}

function drawCertificate(participant, index) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

  // ПІБ по центру під "засвідчує, що"
  drawCenteredText(
    participant.fullName,
    canvas.width / 2,
    645,
    1500,
    94,
    '"Palatino Linotype", "Book Antiqua", Georgia, serif',
    'italic',
    '#000000'
  );

  // Реєстраційний номер і дата внизу праворуч
  ctx.fillStyle = "#111111";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";

  ctx.font = 'bold 23px Georgia, "Times New Roman", serif';
  ctx.fillText(buildCertificateNumber(index), 1870, 1338);

  ctx.font = 'bold 24px Georgia, "Times New Roman", serif';
  ctx.fillText(dateInput.value.trim() || "27 лютого 2026 року", 1870, 1378);
}

function previewFirst() {
  const participants = parseParticipants();
  if (!participants.length) {
    setStatus("Введи хоча б один рядок з ПІБ.", true);
    return;
  }
  if (!templateImage.complete || !templateImage.naturalWidth) {
    setStatus("Шаблон ще завантажується, спробуй ще раз через секунду.", true);
    return;
  }
  drawCertificate(participants[0], 0);
  setStatus(`Попередній перегляд готовий: ${participants[0].fullName}`);
}

function safeFileName(value) {
  return value.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_").trim();
}

function canvasToBlob() {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Не вдалося створити файл."));
    }, "image/png");
  });
}

async function downloadAll() {
  const participants = parseParticipants();
  if (!participants.length) {
    setStatus("Введи хоча б один рядок з ПІБ.", true);
    return;
  }

  try {
    setStatus("Підготовка архіву...");
    const zip = new JSZip();

    for (let i = 0; i < participants.length; i += 1) {
      drawCertificate(participants[i], i);
      const blob = await canvasToBlob();
      zip.file(`${i + 1}_${safeFileName(participants[i].fullName)}.png`, blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "certificates.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);

    setStatus(`Готово. Завантажується certificates.zip (${participants.length} сертифікатів).`);
  } catch (error) {
    console.error(error);
    setStatus("Не вдалося створити архів.", true);
  }
}

document.getElementById("previewBtn").addEventListener("click", previewFirst);
document.getElementById("downloadBtn").addEventListener("click", downloadAll);
document.getElementById("exampleBtn").addEventListener("click", () => {
  participantsInput.value = `Єремєєва Ірина Вікторівна\nСліпенчук Дмитро Сергійович`;
  previewFirst();
});

[dateInput, fixedPartInput, startSequenceInput, digitsCountInput, tailPartInput].forEach(el => {
  el.addEventListener("input", () => {
    if (templateImage.complete && templateImage.naturalWidth) previewFirst();
  });
});

templateImage.onload = () => previewFirst();
templateImage.onerror = () => setStatus("Не вдалося завантажити шаблон.", true);

console.log("CERTIFICATE TEMPLATE: USER_FILES_CORRECT_TEMPLATE_V1 PIB_Y=500");

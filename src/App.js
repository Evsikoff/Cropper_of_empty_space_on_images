import React, { useRef, useState } from "react";
// Для скачивания zip-архива
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function App() {
  const [files, setFiles] = useState([]);
  const [cropped, setCropped] = useState([]);
  const inputRef = useRef();

  const onFilesSelected = (e) => {
    const fileList = Array.from(e.target.files);
    setFiles(fileList);
    processFiles(fileList);
  };

  // Найти границы непрозрачного пикселя
  function getCropRect(ctx, w, h) {
    let minX = w,
      minY = h,
      maxX = 0,
      maxY = 0;
    const imgData = ctx.getImageData(0, 0, w, h).data;
    let found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (imgData[idx + 3] > 0) {
          // alpha > 0
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) return null;
    return [minX, minY, maxX - minX + 1, maxY - minY + 1];
  }

  async function processFiles(fileList) {
    let result = [];
    for (const file of fileList) {
      if (!file.type.startsWith("image/")) continue;
      const img = await loadImage(file);
      // Создать canvas с исходным размером
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // Найти crop rect
      const rect = getCropRect(ctx, img.width, img.height);
      let url = "";
      if (rect) {
        const [x, y, w, h] = rect;
        // Кадрируем
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = w;
        cropCanvas.height = h;
        cropCanvas.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);
        url = cropCanvas.toDataURL("image/png");
      } else {
        // Всё прозрачное — возвращаем пустое PNG
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = 1;
        cropCanvas.height = 1;
        url = cropCanvas.toDataURL("image/png");
      }
      result.push({
        name: file.name,
        url,
        origUrl: URL.createObjectURL(file),
      });
    }
    setCropped(result);
  }

  function loadImage(file) {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.src = URL.createObjectURL(file);
    });
  }

  // Скачать ZIP с кадрированными изображениями
  const downloadAll = async () => {
    const zip = new JSZip();
    for (const img of cropped) {
      const data = img.url.split(",")[1];
      zip.file(img.name, data, { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "cropped_pngs.zip");
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h2>PNG Авто-Кадрирование</h2>
      <input
        type="file"
        accept="image/png"
        multiple
        ref={inputRef}
        onChange={onFilesSelected}
        style={{ marginBottom: 12 }}
      />
      <div style={{ margin: "18px 0" }}>
        {cropped.length > 0 && (
          <button onClick={downloadAll}>Скачать все кадрированные</button>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        {cropped.map((img) => (
          <div key={img.name} style={{ textAlign: "center" }}>
            <div>
              <b>{img.name}</b>
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>Исходник</div>
            <img
              src={img.origUrl}
              alt=""
              style={{
                width: 100,
                background: "#eee",
                marginBottom: 8,
                border: "1px solid #ddd",
              }}
            />
            <div style={{ fontSize: 12, color: "#888" }}>Кадрировано</div>
            <img
              src={img.url}
              alt=""
              style={{
                width: 100,
                background: "#eee",
                border: "1px solid #888",
              }}
            />
          </div>
        ))}
      </div>
      <p style={{ marginTop: 48, fontSize: 14, color: "#777" }}>
        Приложение работает полностью в браузере.
        <br />
        Файлы никуда не загружаются.
      </p>
    </div>
  );
}

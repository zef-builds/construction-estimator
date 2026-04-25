/**
 * tabs/notes-photos.js
 * Notes and photo capture for the active scenario. Rendered at the bottom of
 * the Estimate tab. Photos are resized client-side (max 1200px, JPEG q=0.7)
 * before being stored as data URLs in the scenario, to keep localStorage usage
 * manageable.
 *
 * Exposes: renderNotesPhotos, onNotesInput, handlePhotoFiles, deletePhoto,
 *          onPhotoCaptionInput.
 * Depends on: getCurrentScenario, addScenarioPhoto, removeScenarioPhoto,
 *             updateScenarioNotes, updatePhotoCaption, MAX_PHOTOS_PER_SCENARIO,
 *             showToast.
 */

const PHOTO_MAX_DIM = 1200;
const PHOTO_QUALITY = 0.7;

function renderNotesPhotos() {
  const holder = document.getElementById("notesPhotosBlock");
  if (!holder) return;
  const s = getCurrentScenario();
  if (!s.typeId) {
    holder.innerHTML = "";
    return;
  }
  const photoCount = s.photos.length;
  const canAddMore = photoCount < MAX_PHOTOS_PER_SCENARIO;
  const notesValue = (s.notes || "").replace(/</g, "&lt;");

  let html = `
    <div class="np-section">
      <div class="est-label">Notes <span class="est-label-opt">(included in PDF report)</span></div>
      <textarea class="np-notes" rows="3" maxlength="2000"
        placeholder="Project context, assumptions, caveats — anything you want in the report."
        oninput="onNotesInput(this)">${notesValue}</textarea>
    </div>

    <div class="np-section">
      <div class="est-label">Photos
        <span class="est-label-opt">${photoCount}/${MAX_PHOTOS_PER_SCENARIO}</span>
      </div>
      <div class="np-photos">
        ${s.photos.map(p => `
          <div class="np-photo" data-id="${p.id}">
            <img src="${p.dataUrl}" alt="">
            <button class="np-photo-x" onclick="deletePhoto('${p.id}')" title="Remove photo">×</button>
            <input type="text" class="np-photo-caption" maxlength="120"
              placeholder="Add caption…"
              value="${(p.caption || "").replace(/"/g, "&quot;")}"
              oninput="onPhotoCaptionInput('${p.id}', this.value)">
          </div>
        `).join("")}
        ${canAddMore ? `
          <label class="np-photo-add">
            <input type="file" accept="image/*" multiple style="display:none"
              onchange="handlePhotoFiles(this.files); this.value='';">
            <span class="np-photo-add-icon">+</span>
            <span class="np-photo-add-label">Add photo</span>
          </label>
        ` : ""}
      </div>
      <div class="est-hint">Photos are resized to ~1200px and stored on this device only. Max ${MAX_PHOTOS_PER_SCENARIO} per scenario.</div>
    </div>
  `;
  holder.innerHTML = html;
}

function onNotesInput(el) {
  updateScenarioNotes(el.value);
}

function onPhotoCaptionInput(photoId, val) {
  updatePhotoCaption(photoId, val);
}

function deletePhoto(photoId) {
  removeScenarioPhoto(photoId);
  renderNotesPhotos();
}

async function handlePhotoFiles(fileList) {
  const files = Array.from(fileList || []);
  for (const file of files) {
    if (!file.type || !file.type.startsWith("image/")) {
      showToast("Skipped: not an image");
      continue;
    }
    const s = getCurrentScenario();
    if (s.photos.length >= MAX_PHOTOS_PER_SCENARIO) {
      showToast(`Max ${MAX_PHOTOS_PER_SCENARIO} photos`);
      break;
    }
    try {
      const dataUrl = await resizeImageFile(file, PHOTO_MAX_DIM, PHOTO_QUALITY);
      const ok = addScenarioPhoto(dataUrl, "");
      if (!ok) break;
    } catch (e) {
      showToast("Couldn't process that image");
    }
  }
  renderNotesPhotos();
}

// Read a File, draw it onto a canvas at most max dimensions wide/tall,
// export as JPEG data URL. Phone photos typically come out ~120-200 KB.
function resizeImageFile(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode-failed"));
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        const longest = Math.max(w, h);
        if (longest > maxDim) {
          const scale = maxDim / longest;
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        } catch (e) { reject(e); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

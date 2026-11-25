const API_BASE_URL = "";
const API_URL = `${API_BASE_URL}/notes`;
const token = sessionStorage.getItem("notely_access_token");
const notesList = document.getElementById("notes-list");
const noteForm = document.getElementById("note-form");
const formMessage = document.getElementById("form-message");
const notesCount = document.getElementById("notes-count");
const notesSearch = document.getElementById("notes-search");
const categoryFilter = document.getElementById("category-filter");
const notesEmpty = document.getElementById("notes-empty");
const emptyTitle = document.getElementById("empty-title");
const emptyDescription = document.getElementById("empty-description");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toast-text");
const notesSort = document.getElementById("notes-sort");
const categoryOptions = document.getElementById("category-options");

let allNotes = [];
let toastTimer;

function hideToast() {
  window.clearTimeout(toastTimer);
  toast.classList.remove("visible");
}

function startToastTimer() {
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(hideToast, 5000);
}

function showToast(message, isError = false) {
  if (!toast) return;

  toastText.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("visible");
  startToastTimer();
}

toast.addEventListener("mouseenter", () => window.clearTimeout(toastTimer));
toast.addEventListener("mouseleave", () => {
  if (toast.classList.contains("visible")) startToastTimer();
});
document.getElementById("toast-close").addEventListener("click", hideToast);

// ---- Modals (focus management, Esc, focus trap) ----
let activeModal = null;
let lastFocused = null;

function openModal(modal, focusEl) {
  lastFocused = document.activeElement;
  activeModal = modal;
  modal.hidden = false;
  (focusEl || modal.querySelector("input, textarea, button")).focus();
}

function closeModal(modal = activeModal) {
  if (!modal) return;
  modal.hidden = true;
  if (activeModal === modal) activeModal = null;
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
}

document.addEventListener("keydown", (event) => {
  if (!activeModal) return;

  if (event.key === "Escape" && activeModal.id !== "session-expired-modal") {
    activeModal.dispatchEvent(new Event("modal-dismiss"));
    closeModal();
    return;
  }

  if (event.key === "Tab") {
    const focusable = [
      ...activeModal.querySelectorAll("button, input, textarea, select"),
    ].filter((el) => !el.disabled);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.querySelectorAll("[data-close]").forEach((btn) =>
    btn.addEventListener("click", () => {
      overlay.dispatchEvent(new Event("modal-dismiss"));
      closeModal(overlay);
    }),
  );
  overlay.addEventListener("mousedown", (event) => {
    if (event.target === overlay && overlay.id !== "session-expired-modal") {
      overlay.dispatchEvent(new Event("modal-dismiss"));
      closeModal(overlay);
    }
  });
});

function confirmDialog(title, text, okLabel = "Delete") {
  const modal = document.getElementById("confirm-modal");
  const ok = document.getElementById("confirm-ok");
  document.getElementById("confirm-title").textContent = title;
  document.getElementById("confirm-text").textContent = text;
  ok.textContent = okLabel;

  return new Promise((resolve) => {
    const finish = (value) => {
      ok.removeEventListener("click", onOk);
      modal.removeEventListener("modal-dismiss", onDismiss);
      if (value) closeModal(modal);
      resolve(value);
    };
    const onOk = () => finish(true);
    const onDismiss = () => finish(false);
    ok.addEventListener("click", onOk);
    modal.addEventListener("modal-dismiss", onDismiss);
    openModal(modal, modal.querySelector("[data-close]"));
  });
}

function showFormMessage(message, type = "") {
  formMessage.textContent = message;
  if (type) {
    formMessage.className = `message ${type}`;
  } else {
    formMessage.className = "message";
  }
}

function createNoteCard(note, index) {
  const article = document.createElement("article");
  article.className = "note-card";
  article.style.setProperty("--card-index", index);
  article.tabIndex = 0;
  article.setAttribute("role", "button");
  article.setAttribute("aria-label", `Edit note: ${note.title}`);
  article.addEventListener("click", (event) => {
    if (event.target.closest(".delete-button")) return;
    openEditModal(note);
  });
  article.addEventListener("keydown", (event) => {
    if (event.target !== article) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEditModal(note);
    }
  });

  const top = document.createElement("div");
  top.className = "note-card-top";
  const category = document.createElement("span");

  const categoryNumber =
    (String(note.category || "")
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0) %
      4) +
    1;

  category.className = `category-tag category-${categoryNumber}`;
  category.textContent = note.category || "Uncategorized";
  category.title = note.category || "Uncategorized";

  const deleteButton = document.createElement("button");
  deleteButton.className = "icon-button delete-button";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Delete note: ${note.title}`);
  deleteButton.title = "Delete note";
  deleteButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M10 11v6m4-6v6M6.5 7l1 13h9l1-13M9 7V4h6v3"
                stroke="currentColor" stroke-width="1.7"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
  deleteButton.addEventListener("click", () => deleteNote(note, deleteButton));

  top.append(category, deleteButton);

  const title = document.createElement("h3");
  title.textContent = note.title;
  title.dir = "auto";
  const content = document.createElement("p");
  content.className = "note-content";
  content.textContent = note.content;
  content.dir = "auto";

  const footer = document.createElement("div");
  footer.className = "note-card-footer";
  const label = document.createElement("span");
  const words = note.content.trim().split(/\s+/).filter(Boolean).length;
  label.textContent = `${words} ${words === 1 ? "WORD" : "WORDS"}`;
  const hint = document.createElement("span");
  hint.className = "edit-hint";
  hint.textContent = "CLICK TO EDIT";
  footer.append(label, hint);

  article.append(top, title, content, footer);
  return article;
}

function updateCategoryOptions(notes) {
  const selected = categoryFilter.value;
  const categories = [
    ...new Set(notes.map((note) => note.category).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  categoryFilter.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All categories";
  categoryFilter.appendChild(allOption);

  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  }

  categoryFilter.value = categories.includes(selected) ? selected : "";

  categoryOptions.replaceChildren(
    ...categories.map((category) => {
      const option = document.createElement("option");
      option.value = category;
      return option;
    }),
  );
}

function renderNotes() {
  const searchTerm = notesSearch.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;

  const filteredNotes = allNotes.filter((note) => {
    const matchesSearch = `${note.title} ${note.content} ${note.category}`
      .toLowerCase()
      .includes(searchTerm);
    const matchesCategory =
      !selectedCategory || note.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sort = notesSort.value;
  filteredNotes.sort((a, b) =>
    sort === "title"
      ? a.title.localeCompare(b.title)
      : sort === "oldest"
        ? a.id - b.id
        : b.id - a.id,
  );

  notesList.replaceChildren();
  notesCount.textContent = String(filteredNotes.length);

  if (filteredNotes.length === 0) {
    notesEmpty.classList.remove("hidden");

    if (allNotes.length === 0) {
      emptyTitle.textContent = "A fresh page.";
      emptyDescription.textContent =
        "Your first note is waiting to be written.";
    } else {
      emptyTitle.textContent = "No notes found.";
      emptyDescription.textContent =
        "Try another search or choose a different category.";
    }
    return;
  }

  notesEmpty.classList.add("hidden");

  filteredNotes.forEach((note, index) => {
    notesList.appendChild(createNoteCard(note, Math.min(index, 20)));
  });
}

function handleUnauthorized(response) {
  if (response.status !== 401) {
    return false;
  }

  showSessionExpiredModal();
  return true;
}

function showSkeletons(count = 6) {
  notesEmpty.classList.add("hidden");
  notesList.replaceChildren(
    ...Array.from({ length: count }, () => {
      const el = document.createElement("div");
      el.className = "note-card skeleton";
      el.setAttribute("aria-hidden", "true");
      return el;
    }),
  );
  notesList.setAttribute("aria-busy", "true");
}

async function loadNotes() {
  showSkeletons();
  try {
    const response = await fetch(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(`Failed to load notes (${response.status})`);
    }

    allNotes = await response.json();
    updateCategoryOptions(allNotes);
    renderNotes();
  } catch (error) {
    console.error(error);
    notesList.replaceChildren();
    notesEmpty.classList.remove("hidden");
    emptyTitle.textContent = "Couldn't load your notes.";
    emptyDescription.textContent =
      "Check that the server is running, then try refreshing.";
    showToast("Could not load notes.", true);
  } finally {
    notesList.removeAttribute("aria-busy");
  }
}

async function deleteNote(note, button) {
  const confirmed = await confirmDialog(
    "Delete note?",
    `"${note.title}" will be permanently deleted. This can't be undone.`,
  );
  if (!confirmed) return;

  button.disabled = true;

  try {
    const response = await fetch(`${API_URL}/${note.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error(`Failed to delete note (${response.status})`);
    }

    allNotes = allNotes.filter((item) => item.id !== note.id);
    updateCategoryOptions(allNotes);
    renderNotes();
    showToast("Note deleted.");
  } catch (error) {
    console.error(error);
    button.disabled = false;
    showToast("Could not delete note.", true);
  }
}

function getTokenExpiration(token) {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");

    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

    const claims = JSON.parse(atob(paddedBase64));

    if (typeof claims.exp !== "number") {
      return null;
    }

    return claims.exp * 1000;
  } catch {
    return null;
  }
}

function showSessionExpiredModal() {
  sessionStorage.removeItem("notely_access_token");

  const modal = document.getElementById("session-expired-modal");

  if (modal) {
    if (activeModal && activeModal !== modal) activeModal.hidden = true;
    openModal(modal, document.getElementById("return-to-login-btn"));
  }
}

function scheduleTokenExpiration() {
  const expirationTime = getTokenExpiration(token);

  if (expirationTime === null) {
    return;
  }

  const timeUntilExpiration = expirationTime - Date.now();

  if (timeUntilExpiration <= 0) {
    showSessionExpiredModal();
    return;
  }

  window.setTimeout(() => {
    showSessionExpiredModal();
  }, timeUntilExpiration);
}

async function loadProfile() {
  const profileName = document.getElementById("profile-name");
  const profileImage = document.getElementById("profile-image");

  try {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      throw new Error("Failed to load profile.");
    }

    const user = await response.json();

    profileName.textContent = `${user.firstName} ${user.lastName}`;

    if (user.profile_image) {
      profileImage.src = user.profile_image;
    }
  } catch (error) {
    console.error("Could not load profile:", error);
    showToast("Could not load profile.", true);
  }
}

function setAvatarLoading(isLoading) {
  const wrapper = document.getElementById("avatar-wrapper");
  const uploadLabel = document.querySelector(
    'label[for="profile-image-input"]',
  );

  wrapper.classList.toggle("is-loading", isLoading);
  wrapper.setAttribute("aria-busy", String(isLoading));
  uploadLabel.classList.toggle("is-disabled", isLoading);
  document.getElementById("profile-image-input").disabled = isLoading;
}

function loadImage(img, src) {
  return new Promise((resolve) => {
    img.addEventListener("load", resolve, { once: true });
    img.addEventListener("error", resolve, { once: true });
    img.src = src;
  });
}

async function update_picture(file) {
  const profileImage = document.getElementById("profile-image");

  const formData = new FormData();
  formData.append("file", file);

  setAvatarLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/users/me/profile-picture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (handleUnauthorized(response)) {
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to load image.");
    }

    if (data.profile_image) {
      await loadImage(profileImage, data.profile_image);
    }
  } catch (error) {
    console.error("Could not load image:", error);
    showToast(error.message || "Could not update profile picture.", true);
  } finally {
    setAvatarLoading(false);
  }
}

const profileImageInput = document.getElementById("profile-image-input");

document
  .querySelector('label[for="profile-image-input"]')
  .addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!profileImageInput.disabled) profileImageInput.click();
    }
  });

profileImageInput.addEventListener("change", async () => {
  const file = profileImageInput.files[0];

  if (!file) {
    return;
  }

  await update_picture(file);

  profileImageInput.value = "";
});

if (!token) {
  window.location.href = "index.html";
}

noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showFormMessage("");

  const formData = new FormData(noteForm);
  const newNote = {
    title: String(formData.get("title") || "").trim(),
    content: String(formData.get("content") || "").trim(),
    category: String(formData.get("category") || "").trim(),
  };

  if (!newNote.title || !newNote.content || !newNote.category) {
    showFormMessage("Please complete all fields.", "error");
    return;
  }

  const submitButton = noteForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Saving…";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newNote),
    });

    if (handleUnauthorized(response)) {
      return;
    }

    if (!response.ok) {
      let message = "Could not create note.";
      try {
        const data = await response.json();
        if (data.detail) {
          message = Array.isArray(data.detail)
            ? data.detail.map((item) => item.msg).join(", ")
            : data.detail;
        }
      } catch (_) {}
      throw new Error(message);
    }

    const createdNote = await response.json();
    allNotes.unshift(createdNote);
    updateCategoryOptions(allNotes);
    notesSearch.value = "";
    categoryFilter.value = "";
    renderNotes();
    noteForm.reset();
    showToast("Note saved.");
  } catch (error) {
    console.error(error);
    showFormMessage(error.message || "Could not create note.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Save note";
  }
});

// ---- Edit ----
const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");
const editMessage = document.getElementById("edit-message");
let editingNote = null;

function openEditModal(note) {
  editingNote = note;
  editMessage.textContent = "";
  editMessage.className = "message";
  document.getElementById("edit-title").value = note.title;
  document.getElementById("edit-content").value = note.content;
  document.getElementById("edit-category").value = note.category;
  openModal(editModal, document.getElementById("edit-title"));
}

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!editingNote) return;

  const changes = {
    title: document.getElementById("edit-title").value.trim(),
    content: document.getElementById("edit-content").value.trim(),
    category: document.getElementById("edit-category").value.trim(),
  };
  if (!changes.title || !changes.content || !changes.category) {
    editMessage.textContent = "Please complete all fields.";
    editMessage.className = "message error";
    return;
  }

  const submit = editForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = "Saving…";

  try {
    const response = await fetch(`${API_URL}/${editingNote.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(changes),
    });

    if (handleUnauthorized(response)) return;
    if (!response.ok) throw new Error(`Failed to update (${response.status})`);

    const updated = await response.json();
    allNotes = allNotes.map((n) => (n.id === updated.id ? updated : n));
    updateCategoryOptions(allNotes);
    renderNotes();
    closeModal(editModal);
    showToast("Note updated.");
  } catch (error) {
    console.error(error);
    editMessage.textContent = "Could not update note.";
    editMessage.className = "message error";
  } finally {
    submit.disabled = false;
    submit.textContent = "Save changes";
  }
});

// ---- Search / filter / sort ----
let searchTimer;
notesSearch.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(renderNotes, 150);
});
categoryFilter.addEventListener("change", renderNotes);
notesSort.addEventListener("change", renderNotes);

document.addEventListener("keydown", (event) => {
  if (event.key !== "/" || activeModal) return;
  if (event.target.matches("input, textarea, select")) return;
  event.preventDefault();
  notesSearch.focus();
});

document.getElementById("logout-button").addEventListener("click", () => {
  sessionStorage.removeItem("notely_access_token");
  window.location.href = "index.html";
});

const returnToLoginButton = document.getElementById("return-to-login-btn");

if (returnToLoginButton) {
  returnToLoginButton.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

if (token) {
  scheduleTokenExpiration();
}

loadProfile();
loadNotes();

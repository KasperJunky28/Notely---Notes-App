const API_BASE_URL = "http://127.0.0.1:8000";
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

let allNotes = [];
let toastTimer;

function showToast(message, isError = false) {
    if (!toast) return;

    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("visible");

    toastTimer = window.setTimeout(() => {
        toast.classList.remove("visible");
    }, 5000);
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

    const top = document.createElement("div");
    top.className = "note-card-top";
    const category = document.createElement("span");

    const categoryNumber = (String(note.category || "")
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4) + 1;

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
    const content = document.createElement("p");
    content.className = "note-content";
    content.textContent = note.content;

    const footer = document.createElement("div");
    footer.className = "note-card-footer";
    const label = document.createElement("span");
    label.textContent = "NOTE";
    footer.append(label);

    article.append(top, title, content, footer);
    return article;
}

function updateCategoryOptions(notes) {
    const selected = categoryFilter.value;
    const categories = [...new Set(
        notes.map(note => note.category).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

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
}

function renderNotes() {
    const searchTerm = notesSearch.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;

    const filteredNotes = allNotes.filter(note => {
        const matchesSearch = `${note.title} ${note.content} ${note.category}`
            .toLowerCase()
            .includes(searchTerm);
        const matchesCategory = !selectedCategory || note.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    notesList.replaceChildren();
    notesCount.textContent = String(filteredNotes.length);

    if (filteredNotes.length === 0) {
        notesEmpty.classList.remove("hidden");

        if (allNotes.length === 0) {
            emptyTitle.textContent = "A fresh page.";
            emptyDescription.textContent = "Your first note is waiting to be written.";
        } else {
            emptyTitle.textContent = "No notes found.";
            emptyDescription.textContent = "Try another search or choose a different category.";
        }
        return;
    }

    notesEmpty.classList.add("hidden");

    filteredNotes.forEach((note) => {
        notesList.appendChild(createNoteCard(note));
    });
}

function handleUnauthorized(response) {
    if (response.status !== 401) {
        return false;
    }

    showSessionExpiredModal();
    return true;
}

async function loadNotes() {
    try {
        const response = await fetch(API_URL, {
            headers: { Authorization: `Bearer ${token}` }
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
        emptyDescription.textContent = "Check that the server is running, then try refreshing.";
        showToast("Could not load notes.", true);
    }
}

async function deleteNote(note, button) {
    const confirmed = window.confirm(`Delete "${note.title}"? This can't be undone.`);
    if (!confirmed) return;

    button.disabled = true;

    try {
        const response = await fetch(`${API_URL}/${note.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (handleUnauthorized(response)) {
            return;
        }

        if (!response.ok) {
            throw new Error(`Failed to delete note (${response.status})`);
        }

        allNotes = allNotes.filter(item => item.id !== note.id);
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
        const base64 = payload
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const paddedBase64 = base64.padEnd(
            Math.ceil(base64.length / 4) * 4,
            "="
        );

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
        modal.hidden = false;
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
                Authorization: `Bearer ${token}`
            }
        });

        if (handleUnauthorized(response)) {
            return;
        }

        if (!response.ok) {
            throw new Error("Failed to load profile.");
        }

        const user = await response.json();

        profileName.textContent =
            `${user.firstName} ${user.lastName}`;

        if (user.profile_image) {
            profileImage.src =`${API_BASE_URL}${user.profile_image}`;
        }
    } catch (error) {
        console.error("Could not load profile:", error);
        showToast("Could not load profile.", true);
    }
} 

 async function update_picture(file) {
    const profileImage = document.getElementById("profile-image");

     const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch(`${API_BASE_URL}/users/me/profile-picture`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`},
            body: formData
        });

        if (handleUnauthorized(response)) {
            return;
        }
        
        const data = await response.json();

         if (!response.ok) {
            throw new Error(data.detail || "Failed to load image.");
        }

        if (data.profile_image) {
            profileImage.src =`${API_BASE_URL}${data.profile_image}`;
        }
    } catch (error) {
        console.error("Could not load image:", error);
        showToast(error.message || "Could not update profile picture.",true);
 }
}


const profileImageInput = document.getElementById("profile-image-input");

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

noteForm.addEventListener("submit", async event => {
    event.preventDefault();
    showFormMessage("");

    const formData = new FormData(noteForm);
    const newNote = {
        title: String(formData.get("title") || "").trim(),
        content: String(formData.get("content") || "").trim(),
        category: String(formData.get("category") || "").trim()
    };

    if (!newNote.title || !newNote.content || !newNote.category) {
        showFormMessage("Please complete all fields.", "error");
        return;
    }

    const submitButton = noteForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(newNote)
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
                        ? data.detail.map(item => item.msg).join(", ")
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
    }
});

notesSearch.addEventListener("input", renderNotes);
categoryFilter.addEventListener("change", renderNotes);

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

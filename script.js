// ===== FIREBASE SETUP =====
import { initializeApp } from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore, collection, addDoc, getDocs, query, where
} from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (err) {
    console.error("Firebase init failed:", err);
}

// ===== GLOBALS =====
const GOAL = 500;
let allStudents = [];
let studentsShown = 0;
const STUDENTS_PER_PAGE = 12;

// ===== SAFE DOM HELPER =====
function $(id) { return document.getElementById(id); }

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
    setupForm();
    loadSignatures();
    loadComments();
});

// ===== PETITION TOGGLE =====
window.togglePetition = () => {
    const body = $("petitionBody");
    const icon = $("toggleIcon");
    if (body && icon) {
        body.classList.toggle("open");
        icon.classList.toggle("open");
    }
};

// ===== SCROLL TO SIGN =====
window.scrollToSign = () => {
    const el = $("signSection");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

// ===== FORM SETUP =====
function setupForm() {
    const form = $("petitionForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!db) { showMsg("Database is not available.", "error"); return; }

        const name = ($("nameInput")?.value || "").trim();
        const roll = ($("rollInput")?.value || "").trim();
        const course = ($("courseSelect")?.value || "");
        const branch = ($("branchInput")?.value || "").trim();
        const year = ($("yearSelect")?.value || "");

        if (!name || !roll || !course || !branch || !year) {
            showMsg("Please fill all fields.", "warning");
            return;
        }

        const btn = $("submitBtn");
        if (btn) { btn.textContent = "Signing..."; btn.disabled = true; }

        try {
            // Duplicate check by roll
            const q = query(collection(db, "signatures"), where("roll", "==", roll));
            const snap = await getDocs(q);

            if (!snap.empty) {
                showMsg("This roll number has already signed.", "warning");
                return;
            }

            await addDoc(collection(db, "signatures"), {
                name,
                roll,
                course,
                branch: branch.toUpperCase(), // Normalize branch to uppercase
                year,
                timestamp: Date.now()
            });

            showMsg("Thank you! Your signature has been recorded.", "success");
            form.reset();
            loadSignatures(); // Refresh everything

        } catch (err) {
            console.error("Sign error:", err);
            showMsg("Failed to sign. Please try again.", "error");
        } finally {
            if (btn) { btn.textContent = "Sign Petition"; btn.disabled = false; }
        }
    });
}

// ===== MESSAGE HELPER =====
function showMsg(text, type) {
    const el = $("message");
    if (!el) return;
    el.textContent = text;
    el.className = `msg-${type}`;
    setTimeout(() => { el.textContent = ""; el.className = ""; }, 6000);
}

// ===== LOAD SIGNATURES =====
async function loadSignatures() {
    if (!db) return;

    try {
        const snapshot = await getDocs(collection(db, "signatures"));
        const count = snapshot.size;

        // Update hero counter
        const heroCount = $("heroCount");
        if (heroCount) heroCount.textContent = count;

        // Update goal percentage
        const goalPct = $("heroGoalPercent");
        if (goalPct) goalPct.textContent = Math.min(100, Math.round((count / GOAL) * 100)) + "%";

        // Update progress bar
        const bar = $("progressBar");
        if (bar) bar.style.width = Math.min(100, (count / GOAL) * 100) + "%";

        // Update pill
        const pill = $("signedCountPill");
        if (pill) pill.textContent = count + " signature" + (count !== 1 ? "s" : "");

        // Collect data
        allStudents = [];
        let branchStats = {};
        let yearStats = {};

        snapshot.forEach(doc => {
            const d = doc.data();
            allStudents.push(d);

            // CASE-INSENSITIVE branch: normalize to uppercase
            const normalizedBranch = (d.branch || "Unknown").toUpperCase().trim();
            branchStats[normalizedBranch] = (branchStats[normalizedBranch] || 0) + 1;

            const yr = d.year || "Unknown";
            yearStats[yr] = (yearStats[yr] || 0) + 1;
        });

        // Sort students by timestamp (newest first)
        allStudents.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // Render student list
        studentsShown = 0;
        renderStudents();

        // Render charts
        drawCharts(branchStats, yearStats);

    } catch (err) {
        console.error("Load signatures error:", err);
        const heroCount = $("heroCount");
        if (heroCount) heroCount.textContent = "—";
    }
}

// ===== RENDER STUDENT LIST =====
function renderStudents() {
    const container = $("studentList");
    const loadMoreBtn = $("loadMoreBtn");
    if (!container) return;

    if (allStudents.length === 0) {
        container.innerHTML = '<p class="empty-state">No signatures yet. Be the first to sign!</p>';
        if (loadMoreBtn) loadMoreBtn.style.display = "none";
        return;
    }

    const end = Math.min(studentsShown + STUDENTS_PER_PAGE, allStudents.length);

    if (studentsShown === 0) container.innerHTML = "";

    for (let i = studentsShown; i < end; i++) {
        const s = allStudents[i];
        const card = document.createElement("div");
        card.className = "student-card";
        card.innerHTML = `
            <div class="student-name">${escapeHtml(s.name || "Anonymous")}</div>
            <div class="student-meta">${escapeHtml((s.branch || "").toUpperCase())} · ${escapeHtml(s.year || "")} · ${escapeHtml(s.course || "")}</div>
        `;
        container.appendChild(card);
    }

    studentsShown = end;

    if (loadMoreBtn) {
        loadMoreBtn.style.display = (studentsShown < allStudents.length) ? "block" : "none";
    }
}

window.showMoreStudents = () => { renderStudents(); };

// ===== CHARTS =====
let branchChart, yearChart;

function drawCharts(branchStats, yearStats) {
    const colors = [
        '#3b82f6', '#f59e0b', '#10b981', '#ef4444',
        '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
        '#14b8a6', '#6366f1'
    ];

    try {
        // Branch chart
        const branchEl = $("branchChart");
        if (branchEl && Object.keys(branchStats).length > 0) {
            if (branchChart) branchChart.destroy();
            branchChart = new Chart(branchEl, {
                type: "bar",
                data: {
                    labels: Object.keys(branchStats),
                    datasets: [{
                        data: Object.values(branchStats),
                        backgroundColor: colors,
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: "#64748b" }, grid: { display: false } },
                        y: {
                            ticks: { color: "#64748b", stepSize: 1 },
                            grid: { color: "#f1f5f9" },
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Year chart
        const yearEl = $("yearChart");
        if (yearEl && Object.keys(yearStats).length > 0) {
            if (yearChart) yearChart.destroy();
            yearChart = new Chart(yearEl, {
                type: "doughnut",
                data: {
                    labels: Object.keys(yearStats),
                    datasets: [{
                        data: Object.values(yearStats),
                        backgroundColor: colors,
                        borderColor: "#fff",
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: { color: "#475569", padding: 12, font: { size: 12 } }
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error("Chart error:", err);
    }
}

// ===== COMMENTS =====
window.postComment = async () => {
    if (!db) return;

    const textarea = $("commentText");
    const text = (textarea?.value || "").trim();
    const btn = $("commentBtn");

    if (!text) return;

    if (btn) { btn.textContent = "Posting..."; btn.disabled = true; }

    try {
        await addDoc(collection(db, "comments"), {
            text,
            time: Date.now()
        });
        if (textarea) textarea.value = "";
        loadComments(); // Reload immediately
    } catch (err) {
        console.error("Comment error:", err);
    } finally {
        if (btn) { btn.textContent = "Post Comment"; btn.disabled = false; }
    }
};

async function loadComments() {
    if (!db) return;

    const container = $("commentsList");
    if (!container) return;

    try {
        const snap = await getDocs(collection(db, "comments"));

        if (snap.empty) {
            container.innerHTML = '<p class="empty-state">No comments yet. Be the first to share your thoughts.</p>';
            return;
        }

        const comments = [];
        snap.forEach(doc => comments.push(doc.data()));
        comments.sort((a, b) => (b.time || 0) - (a.time || 0));

        container.innerHTML = "";
        comments.forEach(c => {
            const date = c.time
                ? new Date(c.time).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "";
            container.innerHTML += `
                <div class="comment-card">
                    <p>${escapeHtml(c.text)}</p>
                    ${date ? `<span class="comment-time">${date}</span>` : ""}
                </div>
            `;
        });
    } catch (err) {
        console.error("Load comments error:", err);
        container.innerHTML = '<p class="empty-state">Could not load comments.</p>';
    }
}

// ===== SHARE =====
window.copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    const btn = document.querySelector(".btn-copy");
    if (btn) {
        const orig = btn.textContent;
        btn.textContent = "✅ Copied!";
        setTimeout(() => btn.textContent = orig, 2000);
    }
};

window.shareWhatsApp = () => {
    const text = "Student Voice — Sign the petition:\n" + window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
};

window.shareTwitter = () => {
    const text = "Every student deserves to be heard. Sign the petition:";
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`);
};

// ===== XSS PROTECTION =====
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}
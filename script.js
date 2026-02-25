// ===== FIREBASE SETUP =====
import { initializeApp } from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore, collection, addDoc, getDocs, getDoc, updateDoc, doc, query, where
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

// ===== CONSTANTS =====
const GOAL = 500;
const STUDENTS_PER_PAGE = 12;

// ===== BRANCH OPTIONS BY COURSE =====
const BRANCH_OPTIONS = {
    "B.Tech": [
        "CSE",
        "CSE (Data Science)",
        "CSE (AI & ML)",
        "CSE (Cyber Security)",
        "CSE (IoT)",
        "IT",
        "ECE",
        "EEE",
        "Electrical Engineering",
        "Mechanical Engineering",
        "Civil Engineering",
        "Other"
    ],
    "BCA": ["BCA", "BCA (Cloud Computing)", "Other"],
    "MBA": [
        "MBA (Marketing)", "MBA (Finance)", "MBA (HR)",
        "MBA (IT)", "MBA (International Business)", "MBA (Operations)", "Other"
    ],
    "MCA": ["MCA", "Other"]
};

// ===== GLOBALS =====
let allStudents = [];
let studentsShown = 0;

function $(id) { return document.getElementById(id); }

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
    setupForm();
    loadSignatures();
    loadComments();
    setupScrollTop();
});

// ===== PETITION TOGGLE =====
window.togglePetition = () => {
    const body = $("petitionBody");
    const icon = $("toggleIcon");
    if (body) body.classList.toggle("open");
    if (icon) icon.classList.toggle("open");
};

window.scrollToSign = () => {
    const el = $("signSection");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

// ===== FAQ =====
window.toggleFaq = (el) => {
    const answer = el.nextElementSibling;
    const isOpen = el.classList.contains("open");
    document.querySelectorAll(".faq-q").forEach(q => q.classList.remove("open"));
    document.querySelectorAll(".faq-a").forEach(a => a.classList.remove("open"));
    if (!isOpen) {
        el.classList.add("open");
        if (answer) answer.classList.add("open");
    }
};

// ===== SCROLL TO TOP =====
function setupScrollTop() {
    const btn = $("scrollTopBtn");
    if (!btn) return;
    window.addEventListener("scroll", () => {
        btn.classList.toggle("visible", window.scrollY > 400);
    });
}

// ===== DYNAMIC BRANCH DROPDOWN =====
window.updateBranchOptions = () => {
    const course = ($("courseSelect")?.value || "");
    const branchSelect = $("branchSelect");
    const otherInput = $("otherBranchInput");
    if (!branchSelect) return;

    branchSelect.innerHTML = '<option value="">Select Branch</option>';
    if (otherInput) { otherInput.style.display = "none"; otherInput.required = false; }

    const branches = BRANCH_OPTIONS[course] || [];
    branches.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b;
        opt.textContent = b;
        branchSelect.appendChild(opt);
    });

    branchSelect.onchange = () => {
        if (otherInput) {
            if (branchSelect.value === "Other") {
                otherInput.style.display = "block";
                otherInput.required = true;
            } else {
                otherInput.style.display = "none";
                otherInput.required = false;
                otherInput.value = "";
            }
        }
    };
};

// ===== FORM =====
function setupForm() {
    const form = $("petitionForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!db) { showMsg("Database not available. Try again later.", "error"); return; }

        const name = ($("nameInput")?.value || "").trim();
        const roll = ($("rollInput")?.value || "").trim();
        const course = ($("courseSelect")?.value || "");
        let branch = ($("branchSelect")?.value || "");
        const year = ($("yearSelect")?.value || "");

        if (branch === "Other") {
            branch = ($("otherBranchInput")?.value || "").trim();
            if (!branch) { showMsg("Please enter your branch name.", "warning"); return; }
        }

        if (!name || !roll || !course || !branch || !year) {
            showMsg("Please fill all fields.", "warning");
            return;
        }

        const btn = $("submitBtn");
        if (btn) { btn.textContent = "Signing..."; btn.disabled = true; }

        try {
            const q = query(collection(db, "signatures"), where("roll", "==", roll));
            const snap = await getDocs(q);

            if (!snap.empty) {
                showMsg("This roll number has already signed.", "warning");
                return;
            }

            const normalizedBranch = branch.toUpperCase();
            await addDoc(collection(db, "signatures"), {
                name, roll, course,
                branch: normalizedBranch,
                year,
                timestamp: Date.now()
            });

            showMsg("Thank you! Your signature & pledge have been recorded.", "success");

            // Show certificate
            showCertificate(name, normalizedBranch, course, year, allStudents.length + 1);

            form.reset();
            if ($("otherBranchInput")) $("otherBranchInput").style.display = "none";
            const branchSelect = $("branchSelect");
            if (branchSelect) branchSelect.innerHTML = '<option value="">Select Branch (choose course first)</option>';
            loadSignatures();

        } catch (err) {
            console.error("Sign error:", err);
            showMsg("Failed to sign. Check connection and try again.", "error");
        } finally {
            if (btn) { btn.textContent = "Sign Petition & Take Pledge"; btn.disabled = false; }
        }
    });
}

// ===== CERTIFICATE =====
function showCertificate(name, branch, course, year, number) {
    const overlay = $("certOverlay");
    if (!overlay) return;

    const certName = $("certName");
    const certBranch = $("certBranch");
    const certCourse = $("certCourse");
    const certYear = $("certYear");
    const certNumber = $("certNumber");
    const certDate = $("certDate");

    if (certName) certName.textContent = name;
    if (certBranch) certBranch.textContent = branch;
    if (certCourse) certCourse.textContent = course;
    if (certYear) certYear.textContent = year;
    if (certNumber) certNumber.textContent = number;
    if (certDate) certDate.textContent = new Date().toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric"
    });

    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

window.closeCertificate = (e) => {
    const overlay = $("certOverlay");
    const container = $("certContainer");
    // Close only when clicking outside the cert
    if (e.target === overlay || (container && !container.contains(e.target))) {
        overlay.classList.remove("active");
        document.body.style.overflow = "";
    }
};

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

        const heroCount = $("heroCount");
        if (heroCount) heroCount.textContent = count;

        const goalPct = $("heroGoalPercent");
        if (goalPct) goalPct.textContent = Math.min(100, Math.round((count / GOAL) * 100)) + "%";

        const bar = $("progressBar");
        if (bar) bar.style.width = Math.min(100, (count / GOAL) * 100) + "%";

        const pill = $("signedCountPill");
        if (pill) pill.textContent = count + " signature" + (count !== 1 ? "s" : "");

        const pledgeCount = $("pledgeCount");
        if (pledgeCount) pledgeCount.textContent = count;

        allStudents = [];
        let branchStats = {};
        let yearStats = {};

        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            allStudents.push(d);
            const nb = (d.branch || "Unknown").toUpperCase().trim();
            branchStats[nb] = (branchStats[nb] || 0) + 1;
            yearStats[d.year || "Unknown"] = (yearStats[d.year || "Unknown"] || 0) + 1;
        });

        allStudents.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        buildTicker();
        studentsShown = 0;
        renderStudents();
        drawCharts(branchStats, yearStats);

    } catch (err) {
        console.error("Load signatures error:", err);
        const heroCount = $("heroCount");
        if (heroCount) heroCount.textContent = "—";
    }
}

// ===== TICKER =====
function buildTicker() {
    const ticker = $("ticker");
    const section = $("tickerSection");
    if (!ticker || !section || allStudents.length === 0) return;

    const recent = allStudents.slice(0, 8);
    ticker.innerHTML = recent.map(s =>
        `<span style="margin-right:32px">✍️ <strong>${escapeHtml(s.name || "Someone")}</strong> from ${escapeHtml((s.branch || "").toUpperCase())} just signed</span>`
    ).join("");
    section.style.display = "block";
}

// ===== RENDER STUDENTS =====
function renderStudents() {
    const container = $("studentList");
    const loadMoreBtn = $("loadMoreBtn");
    if (!container) return;

    if (allStudents.length === 0) {
        container.innerHTML = '<p class="empty-state">No signatures yet. Be the first!</p>';
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
    if (loadMoreBtn) loadMoreBtn.style.display = (studentsShown < allStudents.length) ? "block" : "none";
}

window.showMoreStudents = () => renderStudents();

// ===== CHARTS =====
let branchChart, yearChart;

function drawCharts(branchStats, yearStats) {
    const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'];

    try {
        const branchEl = $("branchChart");
        if (branchEl && Object.keys(branchStats).length > 0) {
            if (branchChart) branchChart.destroy();
            branchChart = new Chart(branchEl, {
                type: "bar",
                data: {
                    labels: Object.keys(branchStats),
                    datasets: [{ data: Object.values(branchStats), backgroundColor: colors, borderRadius: 6, borderSkipped: false }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: "#64748b" }, grid: { display: false } },
                        y: { ticks: { color: "#64748b", stepSize: 1 }, grid: { color: "#f1f5f9" }, beginAtZero: true }
                    }
                }
            });
        }

        const yearEl = $("yearChart");
        if (yearEl && Object.keys(yearStats).length > 0) {
            if (yearChart) yearChart.destroy();
            yearChart = new Chart(yearEl, {
                type: "doughnut",
                data: {
                    labels: Object.keys(yearStats),
                    datasets: [{ data: Object.values(yearStats), backgroundColor: colors, borderColor: "#fff", borderWidth: 2 }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: "bottom", labels: { color: "#475569", padding: 12 } } }
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

    if (!text) { showMsg("Please write something before posting.", "warning"); return; }
    if (text.length > 500) { showMsg("Comment too long (max 500 characters).", "warning"); return; }

    if (btn) { btn.textContent = "Posting..."; btn.disabled = true; }

    try {
        const q = query(collection(db, "comments"), where("text", "==", text));
        const existing = await getDocs(q);
        if (!existing.empty) {
            showMsg("This comment already exists.", "warning");
            if (btn) { btn.textContent = "Post Comment"; btn.disabled = false; }
            return;
        }

        await addDoc(collection(db, "comments"), { text, time: Date.now(), likes: 0 });
        if (textarea) textarea.value = "";
        showMsg("Comment posted!", "success");
        await loadComments();
    } catch (err) {
        console.error("Comment error:", err);
        showMsg("Failed to post comment. Try again.", "error");
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

        const seen = new Set();
        const comments = [];
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const key = (d.text || "").trim().toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                comments.push({ ...d, id: docSnap.id });
            }
        });

        comments.sort((a, b) => (b.time || 0) - (a.time || 0));
        const likedComments = JSON.parse(localStorage.getItem("likedComments") || "[]");

        container.innerHTML = "";
        comments.forEach(c => {
            const date = c.time
                ? new Date(c.time).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "";
            const isLiked = likedComments.includes(c.id);
            const likeCount = c.likes || 0;

            const card = document.createElement("div");
            card.className = "comment-card";
            card.innerHTML = `
                <p>${escapeHtml(c.text)}</p>
                <div class="comment-footer">
                    <span class="comment-time">${date}</span>
                    <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="likeComment('${c.id}', this)" ${isLiked ? 'disabled' : ''}>
                        ❤️ <span>${likeCount}</span>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Load comments error:", err);
        container.innerHTML = '<p class="empty-state">Could not load comments.</p>';
    }
}

// ===== LIKE =====
window.likeComment = async (commentId, btnEl) => {
    if (!db) return;
    const likedComments = JSON.parse(localStorage.getItem("likedComments") || "[]");
    if (likedComments.includes(commentId)) return;

    try {
        const ref = doc(db, "comments", commentId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;

        const currentLikes = snap.data().likes || 0;
        await updateDoc(ref, { likes: currentLikes + 1 });

        likedComments.push(commentId);
        localStorage.setItem("likedComments", JSON.stringify(likedComments));

        if (btnEl) {
            btnEl.classList.add("liked");
            btnEl.disabled = true;
            const countSpan = btnEl.querySelector("span");
            if (countSpan) countSpan.textContent = currentLikes + 1;
        }
    } catch (err) {
        console.error("Like error:", err);
    }
};

// ===== SHARE =====
const SHARE_MESSAGE = `Hey everyone 👋

A few of us students created a small petition regarding the Genero fest ticket pricing — just to request a more student-friendly price and extension of the early bird dates so more people can participate.

It's completely respectful and just represents student concerns.

If you agree, please take 30 seconds to sign and share it with your friends/groups 🙌

🔗 https://generopetition.netlify.app/

The more students sign, the stronger our collective voice becomes.
Let's make Genero accessible for everyone ❤️`;

window.copyLink = () => {
    navigator.clipboard.writeText("https://generopetition.netlify.app/");
    const btn = document.querySelector(".btn-copy");
    if (btn) { const orig = btn.textContent; btn.textContent = "✅ Copied!"; setTimeout(() => btn.textContent = orig, 2000); }
};

window.shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}`);
};

window.shareTwitter = () => {
    const tweet = "Every student deserves to be heard. Sign the Genero petition for fair ticket pricing 🎭🙌";
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent("https://generopetition.netlify.app/")}`);
};

// ===== XSS =====
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}
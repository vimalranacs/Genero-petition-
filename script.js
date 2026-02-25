import { initializeApp } from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    where
} from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Config
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const form = document.getElementById("petitionForm");
const countEl = document.getElementById("count");
const nameInput = document.getElementById("name");
const rollInput = document.getElementById("roll");
const courseSelect = document.getElementById("course");
const branchInput = document.getElementById("branch");
const yearSelect = document.getElementById("year");
const messageEl = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");

let branchChart, yearChart;


// ========== SIGN PETITION ==========
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        name: nameInput.value.trim(),
        roll: rollInput.value.trim(),
        course: courseSelect.value,
        branch: branchInput.value.trim(),
        year: yearSelect.value
    };

    if (!data.name || !data.roll || !data.course || !data.branch || !data.year) {
        showMessage("Please fill all fields.", "warning");
        return;
    }

    // Loading state
    submitBtn.textContent = "Signing...";
    submitBtn.disabled = true;

    try {
        // Check for duplicate
        const q = query(
            collection(db, "signatures"),
            where("roll", "==", data.roll)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
            showMessage("This roll number has already signed.", "warning");
            return;
        }

        await addDoc(collection(db, "signatures"), {
            ...data,
            timestamp: Date.now()
        });

        showMessage("Thank you! Your signature has been recorded.", "success");
        form.reset();
        loadAll();

    } catch (err) {
        console.error("Error signing petition:", err);
        showMessage("Something went wrong. Please try again.", "error");
    } finally {
        submitBtn.textContent = "Sign Petition";
        submitBtn.disabled = false;
    }
});


// ========== MESSAGE HELPER ==========
function showMessage(text, type) {
    messageEl.innerText = text;
    messageEl.className = `msg-${type}`;
    setTimeout(() => {
        messageEl.innerText = "";
        messageEl.className = "";
    }, 5000);
}


// ========== LOAD ALL DATA ==========
async function loadAll() {
    try {
        const snapshot = await getDocs(collection(db, "signatures"));
        countEl.innerText = snapshot.size;

        let branchStats = {};
        let yearStats = {};

        snapshot.forEach(doc => {
            const d = doc.data();
            branchStats[d.branch] = (branchStats[d.branch] || 0) + 1;
            yearStats[d.year] = (yearStats[d.year] || 0) + 1;
        });

        drawCharts(branchStats, yearStats);
    } catch (err) {
        console.error("Failed to load signatures:", err);
    }
}

loadAll();


// ========== DRAW CHARTS ==========
function drawCharts(branchStats, yearStats) {
    if (branchChart) branchChart.destroy();
    if (yearChart) yearChart.destroy();

    const colors = [
        '#3d5af1', '#f25f5c', '#ffd166', '#06d6a0',
        '#118ab2', '#7b68ee', '#e76f51', '#2ec4b6',
        '#e9c46a', '#264653'
    ];

    branchChart = new Chart(
        document.getElementById("branchChart"), {
        type: "bar",
        data: {
            labels: Object.keys(branchStats),
            datasets: [{
                label: "Signatures",
                data: Object.values(branchStats),
                backgroundColor: colors,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: "By Branch",
                    color: "#3a3f5a",
                    font: { size: 13, weight: '600' }
                }
            },
            scales: {
                x: { ticks: { color: "#6b7094" }, grid: { display: false } },
                y: { ticks: { color: "#6b7094" }, grid: { color: "#eef0f4" } }
            }
        }
    });

    yearChart = new Chart(
        document.getElementById("yearChart"), {
        type: "doughnut",
        data: {
            labels: Object.keys(yearStats),
            datasets: [{
                data: Object.values(yearStats),
                backgroundColor: colors,
                borderColor: "#ffffff",
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: "#3a3f5a", padding: 12 }
                },
                title: {
                    display: true,
                    text: "By Year",
                    color: "#3a3f5a",
                    font: { size: 13, weight: '600' }
                }
            }
        }
    });
}


// ========== SHARE ==========
window.shareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    const btn = document.querySelector(".btn-outline");
    btn.textContent = "✅ Copied!";
    setTimeout(() => btn.textContent = "🔗 Copy Link", 2000);
};

window.shareWhatsApp = () => {
    const text = "Sign the Genero Petition:\n" + window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
};


// ========== COMMENTS ==========
window.addComment = async () => {
    const textarea = document.getElementById("commentText");
    const text = textarea.value.trim();
    const btn = document.getElementById("commentBtn");

    if (!text) return;

    btn.textContent = "Posting...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "comments"), {
            text,
            time: Date.now()
        });
        textarea.value = "";
        loadComments();
    } catch (err) {
        console.error("Failed to post comment:", err);
    } finally {
        btn.textContent = "Post Comment";
        btn.disabled = false;
    }
};

async function loadComments() {
    try {
        const snap = await getDocs(collection(db, "comments"));
        const div = document.getElementById("comments");

        if (snap.empty) {
            div.innerHTML = '<p class="no-comments">No comments yet. Be the first to share your thoughts.</p>';
            return;
        }

        div.innerHTML = "";

        // Sort by time (newest first)
        const comments = [];
        snap.forEach(doc => comments.push(doc.data()));
        comments.sort((a, b) => (b.time || 0) - (a.time || 0));

        comments.forEach(d => {
            const date = d.time ? new Date(d.time) : null;
            const timeStr = date
                ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : "";

            div.innerHTML += `
                <div class="comment-card">
                    <p>${escapeHtml(d.text)}</p>
                    ${timeStr ? `<span class="comment-time">${timeStr}</span>` : ""}
                </div>
            `;
        });
    } catch (err) {
        console.error("Failed to load comments:", err);
    }
}

// Prevent XSS in comments
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

loadComments();
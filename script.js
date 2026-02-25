import { initializeApp } from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy
} from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔥 Firebase Config
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Properly grab DOM elements (bare `name` = window.name in module scope!)
const form = document.getElementById("petitionForm");
const countEl = document.getElementById("count");
const nameInput = document.getElementById("name");
const rollInput = document.getElementById("roll");
const courseSelect = document.getElementById("course");
const branchInput = document.getElementById("branch");
const yearSelect = document.getElementById("year");
const messageEl = document.getElementById("message");

let branchChart, yearChart;


// SIGN PETITION
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        name: nameInput.value.trim(),
        roll: rollInput.value.trim(),
        course: courseSelect.value,
        branch: branchInput.value.trim(),
        year: yearSelect.value
    };

    // Validate
    if (!data.name || !data.roll || !data.course || !data.branch || !data.year) {
        showMessage("⚠️ Please fill all fields.", "warning");
        return;
    }

    // Show loading state
    const submitBtn = form.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Signing...";
    submitBtn.disabled = true;

    try {
        // Duplicate check
        const q = query(
            collection(db, "signatures"),
            where("roll", "==", data.roll)
        );

        const snap = await getDocs(q);

        if (!snap.empty) {
            showMessage("⚠️ This roll number has already signed!", "warning");
            return;
        }

        await addDoc(collection(db, "signatures"), {
            ...data,
            timestamp: Date.now()
        });

        showMessage("✅ Thank you! Your signature has been recorded.", "success");
        form.reset();
        loadAll();

    } catch (err) {
        console.error(err);
        showMessage("❌ Something went wrong. Please try again.", "error");
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});


// MESSAGE HELPER
function showMessage(text, type) {
    messageEl.innerText = text;
    messageEl.className = `message ${type}`;
    // Auto-clear after 5 seconds
    setTimeout(() => {
        messageEl.innerText = "";
        messageEl.className = "";
    }, 5000);
}


// LOAD EVERYTHING
async function loadAll() {
    try {
        const snapshot = await getDocs(collection(db, "signatures"));

        // Animate counter
        animateCounter(countEl, snapshot.size);

        // Stats
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


// ANIMATE COUNTER
function animateCounter(el, target) {
    let current = 0;
    const step = Math.max(1, Math.floor(target / 40));
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.innerText = current;
    }, 30);
}


// DRAW CHARTS
function drawCharts(branchStats, yearStats) {
    if (branchChart) branchChart.destroy();
    if (yearChart) yearChart.destroy();

    const colors = [
        '#00ffd5', '#ff6b6b', '#ffd93d', '#6c5ce7',
        '#a29bfe', '#fd79a8', '#00cec9', '#e17055',
        '#74b9ff', '#55efc4'
    ];

    branchChart = new Chart(
        document.getElementById("branchChart"), {
        type: "bar",
        data: {
            labels: Object.keys(branchStats),
            datasets: [{
                label: "Signatures by Branch",
                data: Object.values(branchStats),
                backgroundColor: colors,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: "Signatures by Branch",
                    color: "#ccc",
                    font: { size: 14 }
                }
            },
            scales: {
                x: { ticks: { color: "#aaa" }, grid: { color: "#222" } },
                y: { ticks: { color: "#aaa" }, grid: { color: "#222" } }
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
                borderColor: "#0f0f0f",
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: "#ccc" } },
                title: {
                    display: true,
                    text: "Signatures by Year",
                    color: "#ccc",
                    font: { size: 14 }
                }
            }
        }
    });
}


// SHARE BUTTONS
window.shareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    const btn = document.querySelector(".share button:first-child");
    const original = btn.textContent;
    btn.textContent = "✅ Link Copied!";
    setTimeout(() => btn.textContent = original, 2000);
}

window.shareWhatsApp = () => {
    const text = "Sign the Genero Petition 🚨\n" + window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
}


// COMMENTS
window.addComment = async () => {
    const textarea = document.getElementById("commentText");
    const text = textarea.value.trim();

    if (!text) return;

    const btn = document.querySelector("#comments + button, .comment-section button");
    try {
        await addDoc(collection(db, "comments"), {
            text,
            time: Date.now()
        });

        textarea.value = "";
        loadComments();
    } catch (err) {
        console.error("Failed to post comment:", err);
    }
};

async function loadComments() {
    try {
        const snap = await getDocs(collection(db, "comments"));
        const div = document.getElementById("comments");

        if (snap.empty) {
            div.innerHTML = '<p class="no-comments">No comments yet. Be the first to share your thoughts!</p>';
            return;
        }

        div.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const time = d.time ? new Date(d.time).toLocaleDateString() : "";
            div.innerHTML += `
                <div class="comment-card">
                    <p>🧑‍🎓 ${d.text}</p>
                    ${time ? `<span class="comment-time">${time}</span>` : ""}
                </div>
            `;
        });
    } catch (err) {
        console.error("Failed to load comments:", err);
    }
}

loadComments();
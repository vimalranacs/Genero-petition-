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


// 🔥 FIREBASE CONFIG IMPORTED FROM SEPARATE FILE TO HIDE CREDENTIALS
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const form = document.getElementById("petitionForm");
const countEl = document.getElementById("count");

let branchChart, yearChart;


// SIGN PETITION
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        name: name.value.trim(),
        roll: roll.value.trim(),
        course: course.value,
        branch: branch.value.trim(),
        year: year.value
    };

    // duplicate check
    const q = query(
        collection(db, "signatures"),
        where("roll", "==", data.roll)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
        message.innerText = "⚠️ Already signed.";
        return;
    }

    await addDoc(collection(db, "signatures"), data);

    message.innerText = "✅ Signed successfully!";
    form.reset();

    loadAll();
});


// LOAD EVERYTHING
async function loadAll() {

    const snapshot = await getDocs(collection(db, "signatures"));

    countEl.innerText = snapshot.size;

    // stats
    let branchStats = {};
    let yearStats = {};

    snapshot.forEach(doc => {
        const d = doc.data();

        branchStats[d.branch] = (branchStats[d.branch] || 0) + 1;
        yearStats[d.year] = (yearStats[d.year] || 0) + 1;
    });

    drawCharts(branchStats, yearStats);
}

loadAll();


// DRAW GRAPHS
function drawCharts(branchStats, yearStats) {

    if (branchChart) branchChart.destroy();
    if (yearChart) yearChart.destroy();

    branchChart = new Chart(
        document.getElementById("branchChart"),
        {
            type: "bar",
            data: {
                labels: Object.keys(branchStats),
                datasets: [{ data: Object.values(branchStats) }]
            }
        });

    yearChart = new Chart(
        document.getElementById("yearChart"),
        {
            type: "pie",
            data: {
                labels: Object.keys(yearStats),
                datasets: [{ data: Object.values(yearStats) }]
            }
        });
}


// SHARE BUTTONS
window.shareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied!");
}

window.shareWhatsApp = () => {
    const text =
        "Sign the Genero Petition 🚨\n" + window.location.href;
    window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`
    );
}


// COMMENTS
window.addComment = async () => {
    const text = document.getElementById("commentText").value;

    if (!text) return;

    await addDoc(collection(db, "comments"), {
        text,
        time: Date.now()
    });

    document.getElementById("commentText").value = "";
    loadComments();
};

async function loadComments() {
    const snap = await getDocs(collection(db, "comments"));
    const div = document.getElementById("comments");

    div.innerHTML = "";

    snap.forEach(doc => {
        div.innerHTML += `<p>🧑‍🎓 ${doc.data().text}</p>`;
    });
}

loadComments();
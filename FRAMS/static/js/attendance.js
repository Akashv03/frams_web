let video = document.getElementById("video");
let canvas = document.createElement("canvas");
let stream;

// ---------------- NOTIFICATION ----------------
function showNotification(message, type = "success") {

    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let icon = "✅";
    if (type === "error") icon = "❌";
    if (type === "warning") icon = "⚠";

    toast.innerHTML = `<span>${icon} ${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        toast.style.transition = "0.4s ease";

        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ---------------- CAMERA ----------------
async function startCamera() {

    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

    } catch (err) {
        showNotification("Camera Access Denied", "error");
    }

}

function stopCamera() {
    if (stream) stream.getTracks().forEach(track => track.stop());
}

// ---------------- CLOCK ----------------
function updateClock() {

    const now = new Date();

    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();

    let ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12 || 12;

    minutes = minutes.toString().padStart(2, "0");
    seconds = seconds.toString().padStart(2, "0");

    const timeString = `${hours}:${minutes}:${seconds} ${ampm}`;

    const clock = document.getElementById("clock");
    if (clock) clock.innerText = timeString;

}

setInterval(updateClock, 1000);
updateClock();


// ---------------- PAGE REFRESH ----------------
function refreshPage() {

    document.body.style.opacity = "0";

    setTimeout(() => {
        location.reload();
    }, 300);

}

// ---------------- FACE CAPTURE ----------------
async function captureFace() {

    console.log("Capture triggered");

    if (!video.videoWidth || !video.videoHeight) {
        showNotification("Camera not ready!", "error");
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    let context = canvas.getContext("2d");
    context.drawImage(video, 0, 0);

    let imageData = canvas.toDataURL("image/jpeg");

    try {

        let response = await fetch("/recognize", {

            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                image: imageData
            })

        });

        if (!response.ok) {
            showNotification("Server Error! Check Backend", "error");
            return;
        }

        let data = await response.json();

        console.log("Server Response:", data);

        const status = document.querySelector(".id-status");

        // -------- MATCHED --------
        if (data.status === "matched") {

            let student = data; // directly use the returned object

            const reg = document.getElementById("reg");
            if (reg) reg.value = student.regno;

            const name = document.getElementById("name");
            if (name) name.value = student.name;

            const dept = document.getElementById("dept");
            if (dept) dept.value = student.dept;

            const course = document.getElementById("course");
            if (course) course.value = student.course;

            const year = document.getElementById("year");
            if (year) year.value = student.year;

            const shift = document.getElementById("shift");
            if (shift) shift.value = student.shift;

            const period = document.getElementById("period");
            if (period) period.value = student.period;

            const time = document.getElementById("time");
            if (time) time.value = student.time;

            const preview = document.getElementById("preview");
            if (preview) preview.src = imageData;

            if (status) {
                status.innerText = "Present ✅";
                status.style.color = "limegreen";
            }

            showNotification("Attendance Marked Successfully", "success");
        }

        // -------- ALREADY MARKED --------
        else if (data.status === "already_marked") {

            showNotification("Attendance Already Marked", "warning");

            if (status) {
                status.innerText = "Already Marked ⚠";
                status.style.color = "orange";
            }

        }

        // -------- NOT MATCHED --------
        else if (data.status === "not_matched") {

            const preview = document.getElementById("preview");
            if (preview) preview.src = imageData;

            if (status) {
                status.innerText = "Not Recognized ❌";
                status.style.color = "red";
            }

            showNotification("Face not recognized!", "error");

        }

        // -------- NO FACE --------
        else if (data.status === "no_face_detected") {

            showNotification("No face detected!", "warning");

        }

        // -------- TIMETABLE ISSUE --------
        else if (data.status === "no_timetable_found") {

            showNotification("No timetable found for this period", "warning");

        }

    } catch (error) {

        console.error(error);
        showNotification("Error: " + error.message, "error");

    }

}


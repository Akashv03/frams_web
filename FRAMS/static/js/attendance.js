let video = document.getElementById("video");
let canvas = document.createElement("canvas");
let stream;

// --- 1. Custom Notification Function ---
function showNotification(message, type = 'success') {
    const container = document.getElementById("toast-container");
    if (!container) return; 

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "✅";
    if(type === 'error') icon = "❌";
    if(type === 'warning') icon = "⚠";

    toast.innerHTML = `<span>${icon} ${message}</span>`;
    container.appendChild(toast);

    // 4 seconds kazhithu auto-remove aagum
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        toast.style.transition = "0.4s ease";
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// --- 2. Camera Logic ---
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (err) {
        showNotification("Camera Access Denied", "error");
    }
}

function stopCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop());
}

// --- 3. Clock Logic ---
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
    document.getElementById("clock").innerText = timeString;
}
setInterval(updateClock, 1000);
updateClock();

function refreshPage() {
    document.body.style.opacity = "0";
    setTimeout(() => location.reload(), 300);
}

// --- 4. Main Logic: Face Capture & Recognize ---
async function captureFace() {
    if (!video.videoWidth || !video.videoHeight) {
        showNotification("Camera not ready!", "error");
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    let context = canvas.getContext("2d");
    context.drawImage(video, 0, 0);

    let imageData = canvas.toDataURL("image/jpeg");
    document.getElementById("preview").src = imageData;

    try {
        let response = await fetch("/recognize", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({image: imageData})
        });

        if (!response.ok) {
            showNotification("Server Error! Check Backend", "error");
            return;
        }  

        let data = await response.json();

        if (data.status === "matched") {
            showNotification("Attendance Marked Successfully", "success");

            document.getElementById("reg").value = data.regno;
            document.getElementById("name").value = data.name;
            document.getElementById("dept").value = data.dept;
            document.getElementById("course").value = data.course;
            document.getElementById("year").value = data.year;
            document.getElementById("date").value = data.date;
            document.getElementById("time").value = data.time;
            document.getElementById("shift").value = data.shift;

            const status = document.querySelector(".id-status");
            status.innerText = "Present ✅";
            status.style.color = "limegreen";

        } 
        else if (data.status === "already_marked") {
            showNotification(data.message, "warning");
            
            const status = document.querySelector(".id-status");
            status.innerText = "Already Marked ⚠";
            status.style.color = "orange";
        } 
        else {
            showNotification("Face Not Recognized", "error");
            
            const status = document.querySelector(".id-status");
            status.innerText = "Not Recognized ❌";
            status.style.color = "red";
        }
    } catch (error) {
        showNotification("Connection Lost!", "error");
    }
}
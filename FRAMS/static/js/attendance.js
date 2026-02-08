let video = document.getElementById("video");
let canvas = document.createElement("canvas");
let stream;

async function startCamera() {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
}

function stopCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop());
}

function updateClock() {

    const now = new Date();

    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();

    let ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12;

    minutes = minutes.toString().padStart(2, "0");
    seconds = seconds.toString().padStart(2, "0");

    const timeString = `${hours}:${minutes}:${seconds} ${ampm}`;

    document.getElementById("clock").innerText = timeString;
}

// update every second
setInterval(updateClock, 1000);

// run immediately
updateClock();

function refreshPage() {
    document.body.style.opacity = "0";
    setTimeout(() => location.reload(), 300);
}

function captureFace() {

    console.log("📸 captureFace clicked");

    const video = document.getElementById("video");

    if (!video.videoWidth) {
        alert("Camera not ready!");
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const image = canvas.toDataURL("image/jpeg");

    console.log("Sending image to server...");

    fetch("/recognize", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ image })
    })
    .then(res => res.json())
    .then(data => {

        console.log("Server response:", data);

        if (data.status === "matched") {

            document.getElementById("reg").value = data.regno;
            alert("Face recognized ✅");

        } else {

            alert("Unknown face ❌");

        }

    })
    .catch(err => {
        console.error("Fetch error:", err);
        alert("Server error!");
    });
}



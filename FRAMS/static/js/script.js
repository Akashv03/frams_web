// LOGIN
// async function login(event) {
//     event.preventDefault(); // stop page reload

//     let user = document.getElementById("username").value;
//     let pass = document.getElementById("password").value;

//     try {
//         let res = await fetch("/student-login", {
//             method: "POST",
//             headers: {"Content-Type": "application/json"},
//             body: JSON.stringify({regno: user, password: pass})
//         });

//         let result = await res.json();
//         console.log(result);

//         if (result.status === "success") {
//             if (result.role === "admin") {
//                 window.location.href = "/attendance"; // Admin page
//             } else if (result.role === "student") {
//                 // Pass student regno as query param (optional)
//                 window.location.href = `/student-dashboard?regno=${result.regno}`;
//             }
//         } else {
//             alert("❌ " + result.message);
//         }

//     } catch (err) {
//         console.error(err);
//         alert("❌ Network error");
//     }

//     return false;
// }
async function login(event) {
    event.preventDefault();

    let user = document.getElementById("username").value;
    let pass = document.getElementById("password").value;

    let res = await fetch("/student-login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({regno: user, password: pass})
    });

    let result = await res.json();

    if (result.status === "success") {

        if (result.role === "admin") {
            sessionStorage.setItem('registerNo', "24mca066")
            window.location.href = "/admin-dashboard";
        }

        if (result.role === "student") {
            window.location.href = "/student-dashboard";
        }

    } else {
        alert("❌ " + result.message);
    }
}



let captureInterval;
let isCapturing = false;

// Open Camera
async function startCamera() {
    const video = document.getElementById("webcam");
    const placeholder = document.getElementById("camPlaceholder");
    const statusText = document.getElementById("captureStatus");
    if (!statusText) {
    console.error("captureStatus element not found!");
    return;
}

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        placeholder.style.display = "none";
        statusText.innerHTML = "Camera Started... Preparing capture...";

        // Start auto capture after 2 seconds
        // setTimeout(() => {
        //     autoCapture();
        // }, 2000);

    } catch (error) {
        statusText.innerHTML = "❌ Unable to access camera";
    }
}

// Stop Camera
function stopCamera() {
    const video = document.getElementById("webcam");
    const statusText = document.getElementById("captureStatus");

    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }

    clearInterval(captureInterval);
    isCapturing = false;
    statusText.innerHTML = "Camera Stopped";
}

// Auto Capture Function
async function autoCapture() {

    if (isCapturing) return;

    const regno = document.getElementById("regno").value.trim();
    const video = document.getElementById("webcam");
    const statusText = document.getElementById("captureStatus");

    if (!regno) {
        statusText.innerHTML = "⚠ Enter Register Number!";
        return;
    }

    if (!video.videoWidth) {
        statusText.innerHTML = "⚠ Camera not ready!";
        return;
    }

    isCapturing = true;
    statusText.innerHTML = "📸 Capturing faces...";

    captureInterval = setInterval(async () => {

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0);

        const image = canvas.toDataURL("image/jpeg");

        try {
            const res = await fetch("/autoCapture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    regno: regno,
                    image: image
                })
            });

            const data = await res.json();

            statusText.innerHTML = data.message;

            if (data.message.includes("Already collected 40")) {
                clearInterval(captureInterval);
                isCapturing = false;
                statusText.innerHTML = "40 Images Collected Successfully!";
                stopCamera();
            }

        } catch (error) {
            statusText.innerHTML = "❌ Error capturing image";
            clearInterval(captureInterval);
            isCapturing = false;
        }

    }, 300);
}


// PAGE SWITCH
function showRegister() {

    document.getElementById("loginForm").classList.remove("active");
    document.getElementById("registerForm").classList.add("active");

}

function showLogin() {

    stopCamera();
    document.getElementById("registerForm").classList.remove("active");
    document.getElementById("loginForm").classList.add("active");

}


//save student details in db 
                                                                  
async function saveStudent(event) {
    event.preventDefault();  // STOP form from reloading page

    let student = {
        regno: document.getElementById("regno").value,
        password: document.getElementById("regPassword").value,
        fullname: document.getElementById("fullname").value,
        dob: document.getElementById("dob").value,
        department: document.getElementById("department").value,
        course: document.getElementById("course").value,
        year: document.getElementById("year").value
    };

    let res = await fetch("/studentregister", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(student)
    });

    let result = await res.json();
    console.log(result); // 🔥 Debug: see server response

    if (result.status === "success") {
        alert("✅ Student saved to database!");
        showLogin();
    } else {
        alert("❌ Error: " + result.message);
    }

    return false;
}
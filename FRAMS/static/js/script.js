// // LOGIN **
// function login() {

//     let user = document.getElementById("username").value;
//     let pass = document.getElementById("password").value;

//     if (user === "admin" && pass === "123") {

//         window.location.href = "/attendance";
//         return false;

//     } else {

//         alert("Wrong username or password!");
//         return false;

//     }
// }

// //UNIQUE REGNO **
// let regno = document.getElementById("regno").value;
// console.log(regno);




// //CAMERA OPEN / CLOSE / CAPTURE**
// let videoStream = null;

// async function startCamera() {
//     const video = document.getElementById('webcam');
//     const placeholder = document.getElementById('camPlaceholder');
//     const scanLine = document.querySelector('.scan-overlay');

//     try {
//         videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
//         video.srcObject = videoStream;
//         video.style.display = 'block';
//         placeholder.style.display = 'none';
//         scanLine.style.display = 'block';
//     } catch (err) {
//         console.error("Camera Error:", err);
//         alert("Please allow camera access to enroll.");
//     }
// }

// function stopCamera() {
//     if (videoStream) {
//         videoStream.getTracks().forEach(track => track.stop());
//         document.getElementById('webcam').style.display = 'none';
//         document.getElementById('camPlaceholder').style.display = 'flex';
//         document.querySelector('.scan-overlay').style.display = 'none';
//         videoStream = null;
//     }
// }

// // function takeSnapshot() {
// //     if (!videoStream) return alert("Open camera first");
    
// //     // Add a quick flash effect for "Attractive" UI feedback
// //     const wrapper = document.querySelector('.camera-wrapper');
// //     wrapper.style.filter = 'brightness(2)';
// //     setTimeout(() => wrapper.style.filter = 'brightness(1)', 100);
    
// //     alert("Biometric pattern captured successfully!");
// // }

// // function takeSnapshot() {

// //     if (!videoStream) return alert("Open camera first");

// //     const regno = document.getElementById("regno").value;

// //     if (!regno) {
// //         alert("Enter Register Number first!");
// //         return;
// //     }

// //     const video = document.getElementById("webcam");

// //     const canvas = document.createElement("canvas");
// //     canvas.width = video.videoWidth;
// //     canvas.height = video.videoHeight;

// //     const ctx = canvas.getContext("2d");
// //     ctx.drawImage(video, 0, 0);

// //     const image = canvas.toDataURL("image/jpeg");

// //     // UI flash effect (keep your style)
// //     const wrapper = document.querySelector('.camera-wrapper');
// //     wrapper.style.filter = 'brightness(2)';
// //     setTimeout(() => wrapper.style.filter = 'brightness(1)', 100);

// //     fetch("/capture_face", {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify({
// //             regno: regno,
// //             image: image
// //         })
// //     })
// //     .then(res => res.json())
// //     .then(data => alert(data.message))
// //     .catch(() => alert("Server error"));
// // }

// fetch("/capture_face", {
//     method: "POST",
//     headers: {"Content-Type": "application/json"},
//     body: JSON.stringify({...})
// })




// //THORUGH BACK **
// function showRegister() {
//     document.getElementById("loginForm").classList.remove("active");
//     setTimeout(() => document.getElementById("registerForm").classList.add("active"), 300);
// }



// function showLogin() {
//     stopCamera(); // Clean up camera if they go back
//     document.getElementById("registerForm").classList.remove("active");
//     setTimeout(() => document.getElementById("loginForm").classList.add("active"), 300);
// }



// LOGIN
function login() {

    let user = document.getElementById("username").value;
    let pass = document.getElementById("password").value;

    if (user === "admin" && pass === "123") {

        window.location.href = "/attendance";

    } else {

        alert("Wrong username or password!");
    }

    return false;
}


// CAMERA
let videoStream = null;

async function startCamera() {

    const video = document.getElementById("webcam");

    try {

        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = videoStream;

    } catch (err) {

        alert("Camera access denied");

    }
}

function stopCamera() {

    if (videoStream) {

        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;

    }
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



 async function autoCapture() {

    const regno = document.getElementById("regno").value.trim();
    const video = document.getElementById("webcam");

    if (!regno) {
        alert("Enter register number!");
        return;
    }

    if (!video.videoWidth) {
        alert("Camera not ready!");
        return;
    }

    alert("Auto capture starting...");

    for (let i = 1; i <= 30; i++) {

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0);

        const image = canvas.toDataURL("image/jpeg");

        const res = await fetch("/autoCapture", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                regno: regno,
                image: image
            })
        });

        const data = await res.json();
        console.log(data.message);

        await new Promise(r => setTimeout(r, 200));
    }

    alert("✅ 30 images captured!");
}







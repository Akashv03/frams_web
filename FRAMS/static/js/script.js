// function login() {
//     console.log("akash");
//     const username = document.getElementById("username").value;
//     const password = document.getElementById("password").value;
//     const error = document.getElementById("error");

//     // Admin credentials
//     const adminUser = "admin";
//     const adminPass = "123";

//     if (username === adminUser && password === adminPass) {
//         error.style.color = "green";
//         error.innerText = "Login Successful ✔";

//         // redirect to attendance page
//         setTimeout(() => {
//             window.location.href = "/attendance";
//         }, 800);

//     } else {
//         error.style.color = "red";
//         error.innerText = "Invalid Username or Password ❌";
//     }
// }


// 2nd one
// function login() {
//     let username = document.getElementById("username").value;
//     let password = document.getElementById("password").value;

//     console.log("Username:", username);
//     console.log("Password:", password);

//     if (username === "admin" && password === "123") {
//         // navigate to attendance page
//         window.location.href = "/attendance";

//     } else {
//         document.getElementById("error").innerText =
//             "Invalid username or password";
//         document.getElementById("error").style.color = "red";
//     }

//     // stop form reload
//     return false;
// }

// function goattendance(){
//     window.location.href = "/attendance";
//     return false;
// }

function login() {

    let user = document.getElementById("username").value;
    let pass = document.getElementById("password").value;

    if (user === "admin" && pass === "123") {

        window.location.href = "/attendance";
        return false;

    } else {

        alert("Wrong username or password!");
        return false;

    }
}





let videoStream = null;

async function startCamera() {
    const video = document.getElementById('webcam');
    const placeholder = document.getElementById('camPlaceholder');
    const scanLine = document.querySelector('.scan-overlay');

    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = videoStream;
        video.style.display = 'block';
        placeholder.style.display = 'none';
        scanLine.style.display = 'block';
    } catch (err) {
        console.error("Camera Error:", err);
        alert("Please allow camera access to enroll.");
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        document.getElementById('webcam').style.display = 'none';
        document.getElementById('camPlaceholder').style.display = 'flex';
        document.querySelector('.scan-overlay').style.display = 'none';
        videoStream = null;
    }
}

function takeSnapshot() {
    if (!videoStream) return alert("Open camera first");
    
    // Add a quick flash effect for "Attractive" UI feedback
    const wrapper = document.querySelector('.camera-wrapper');
    wrapper.style.filter = 'brightness(2)';
    setTimeout(() => wrapper.style.filter = 'brightness(1)', 100);
    
    alert("Biometric pattern captured successfully!");
}

function showRegister() {
    document.getElementById("loginForm").classList.remove("active");
    setTimeout(() => document.getElementById("registerForm").classList.add("active"), 300);
}



function showLogin() {
    stopCamera(); // Clean up camera if they go back
    document.getElementById("registerForm").classList.remove("active");
    setTimeout(() => document.getElementById("loginForm").classList.add("active"), 300);
}



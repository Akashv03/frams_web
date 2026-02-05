let video = document.getElementById("video");
let canvas = document.getElementById("canvas");
let context = canvas.getContext("2d");
let stream = null;

// Open Camera
function openCamera() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
            stream = s;
            video.srcObject = stream;
        })
        .catch(err => {
            alert("Camera access denied!");
            console.error(err);
        });
}

// Capture Photo
function capturePhoto() {
    canvas.style.display = "block";
    video.style.display = "none";

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stop camera
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

// Save Student
function saveStudent() {
    let studentData = {
        firstName: document.getElementById("fname").value,
        lastName: document.getElementById("lname").value,
        dob: document.getElementById("dob").value,
        phone: document.getElementById("phone").value,
        department: document.getElementById("department").value,
        course: document.getElementById("course").value,
        year: document.getElementById("year").value,
        shift: document.getElementById("shift").value,
        photo: canvas.toDataURL("image/png")
    };

    console.log(studentData);
    alert("Student Registered Successfully ✅");

    return false; // prevent page reload
}

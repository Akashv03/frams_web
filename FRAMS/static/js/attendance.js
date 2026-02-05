const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("status");

startBtn.addEventListener("click", () => {
    statusText.innerText = "Starting camera... Please look at the camera 📷";
    startBtn.disabled = true;

    fetch("/start-attendance")
        .then(response => {
            statusText.innerText = "Attendance process completed ✅";
            startBtn.disabled = false;
        })
        .catch(error => {
            statusText.innerText = "Error starting attendance ❌";
            startBtn.disabled = false;
        });
});

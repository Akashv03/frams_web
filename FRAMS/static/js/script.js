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
function login() {
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;

    console.log("Username:", username);
    console.log("Password:", password);

    if (username === "admin" && password === "123") {
        // navigate to attendance page
        window.location.href = "/attendance";

    } else {
        document.getElementById("error").innerText =
            "Invalid username or password";
        document.getElementById("error").style.color = "red";
    }

    // stop form reload
    return false;
}


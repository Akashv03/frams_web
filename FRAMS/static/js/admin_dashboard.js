// -------------------------------------------------------------
// ==================MANAGE STUDENT==========================
// -------------------------------------------------------------

let editingStudentId = null;

// ===== LOAD STUDENTS =====
async function loadStudents() {
    try {
        const response = await fetch("/get_students");
        const students = await response.json();

        const tableBody = document.getElementById("studentTableBody");
        if (!tableBody) return;

        tableBody.innerHTML = "";

        students.forEach(student => {
            const row = `
                <tr>
                    <td>${student.regno}</td>
                    <td>${student.fullname}</td>
                    <td>${student.department}</td>
                    <td>${student.year}</td>
                    <td>
                        <button onclick="editStudent(${student.id})" class="btn-primary">Edit</button>
                        <button onclick="deleteStudent(${student.id})" class="btn-danger">Delete</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

    } catch (error) {
        console.error("Error loading students:", error);
    }
}


// ===== EDIT STUDENT =====
async function editStudent(id) {
    try {
        const response = await fetch(`/get_student/${id}`);
        const student = await response.json();

        document.getElementById("regno").value = student.regno;
        document.getElementById("fullname").value = student.fullname;

        // ✅ Correct DOB Fix
        if (student.dob) {
            const dateObj = new Date(student.dob);
            const formattedDOB = dateObj.toISOString().split("T")[0];
            document.getElementById("dob").value = formattedDOB;
        }

        document.getElementById("department").value = student.department;
        document.getElementById("course").value = student.course;
        document.getElementById("year").value = student.year;

        const passwordInput = document.getElementById("password");
        passwordInput.value = "";
        passwordInput.required = false;

        editingStudentId = id;

        document.getElementById("modalTitle").textContent = "Edit Student";
        document.querySelector(".save-btn").textContent = "Save Student";

        document.getElementById("studentModal").style.display = "flex";

    } catch (error) {
        console.error("Error fetching student:", error);
    }
}


// ===== DELETE STUDENT =====
async function deleteStudent(id) {
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
        const response = await fetch(`/delete_student/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            loadStudents();
        } else {
            alert(result.error);
        }

    } catch (error) {
        console.error("Error deleting student:", error);
    }
}



/* ================= DOM READY ================= */

document.addEventListener("DOMContentLoaded", function () {

    // ===== SECTION SWITCHING =====
    const navItems = document.querySelectorAll(".nav-item");
    
    const dashboardSection = document.getElementById("dashboardSection");
    const studentsSection = document.getElementById("studentsSection");
    const subjectsSection = document.getElementById("subjectsSection");
    const facerecSection = document.getElementById("facerecSection");
    
    navItems.forEach(item => {
        item.addEventListener("click", function () {
        
            navItems.forEach(i => i.classList.remove("active"));
            this.classList.add("active");
        
            const section = this.getAttribute("data-section");
        
            // Hide all
            dashboardSection.style.display = "none";
            studentsSection.style.display = "none";
            subjectsSection.style.display = "none";
            facerecSection.style.display = "none";
        
            // Show selected
            if (section === "dashboard") {
                dashboardSection.style.display = "block";
            }
        
            if (section === "students") {
                studentsSection.style.display = "block";
                loadStudents();
            }
        
            if (section === "subjects") {
                subjectsSection.style.display = "block";
                loadSubjects();
            }
        
            if (section === "facerec") {
                facerecSection.style.display = "block";
            }
        
        });
});



    // ===== MODAL CONTROL =====
    const studentModal = document.getElementById("studentModal");
    const addStudentBtn = document.getElementById("addStudentBtn");
    const closeStudentModal = document.getElementById("closeStudentModal");
    const studentForm = document.getElementById("studentForm");

    addStudentBtn.addEventListener("click", () => {
        editingStudentId = null;
        studentForm.reset();

        document.getElementById("modalTitle").textContent = "Add Student";
        document.querySelector(".save-btn").textContent = "Save Student";

        const passwordInput = document.getElementById("password");
        passwordInput.value = "";
        passwordInput.required = true;

        studentModal.style.display = "flex";
    });

    closeStudentModal.addEventListener("click", () => {
        studentModal.style.display = "none";
    });

    window.addEventListener("click", function (e) {
        if (e.target === studentModal) {
            studentModal.style.display = "none";
        }
    });



    // ===== SEARCH =====
    const studentSearchInput = document.getElementById("studentSearch");

    if (studentSearchInput) {
        studentSearchInput.addEventListener("input", function () {
            const filter = this.value.toLowerCase();
            const rows = document
                .getElementById("studentTableBody")
                .getElementsByTagName("tr");

            for (let i = 0; i < rows.length; i++) {
                const regno = rows[i].cells[0].textContent.toLowerCase();
                const fullname = rows[i].cells[1].textContent.toLowerCase();

                rows[i].style.display =
                    regno.includes(filter) || fullname.includes(filter)
                        ? ""
                        : "none";
            }
        });
    }



    // ===== ADD / UPDATE STUDENT =====
    studentForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const regno = document.getElementById("regno").value.trim();
        const fullname = document.getElementById("fullname").value.trim();
        const dob = document.getElementById("dob").value;
        const department = document.getElementById("department").value.trim();
        const course = document.getElementById("course").value.trim();
        const year = document.getElementById("year").value.trim();
        const passwordVal = document.getElementById("password").value.trim();

        const studentData = { regno, fullname, dob, department, course, year };

        if (passwordVal !== "") {
            studentData.password = passwordVal;
        }

        try {
            let response;

            if (editingStudentId) {
                response = await fetch(`/update_student/${editingStudentId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(studentData)
                });
            } else {
                response = await fetch("/add_student", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(studentData)
                });
            }

            const result = await response.json();

            if (response.ok) {
                alert(result.message);

                studentForm.reset();
                studentModal.style.display = "none";
                editingStudentId = null;

                loadStudents();
            } else {
                alert(result.error);
            }

        } catch (error) {
            console.error("Error saving student:", error);
        }
    });



    // ===== LOAD DASHBOARD CHART =====
    const chartCanvas = document.getElementById("attendanceChart");

    if (chartCanvas) {
        const ctx = chartCanvas.getContext("2d");

        new Chart(ctx, {
            type: "line",
            data: {
                labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
                datasets: [{
                    label: "Attendance %",
                    data: [80, 85, 75, 90, 88],
                    borderColor: "#4318ff",
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } }
            }
        });
    }

});

// -----------------------------------------------------------------
// =================MANAGE SUBJECT===================
// -----------------------------------------------------------------

async function loadSubjects() {
    try {
        const response = await fetch("/get_subjects");
        const subjects = await response.json();

        const tableBody = document.getElementById("subjectTableBody");
        tableBody.innerHTML = "";

        subjects.forEach(sub => {
            const row = `
                <tr>
                    <td>${sub.subject_code}</td>
                    <td>${sub.subject_name}</td>
                    <td>${sub.department}</td>
                    <td>${sub.year}</td>
                    <td>
                        <button onclick="deleteSubject(${sub.id})" class="btn-danger">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

    } catch (error) {
        console.error("Error loading subjects:", error);
    }
}

// -------------DELETE SUBJECT----------
async function deleteSubject(id) {
    if (!confirm("Delete this subject?")) return;

    const response = await fetch(`/delete_subject/${id}`, {
        method: "DELETE"
    });

    const result = await response.json();

    alert(result.message);
    loadSubjects();
}

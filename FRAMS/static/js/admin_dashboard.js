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
    const staffSection = document.getElementById("staffSection");
    // const timetableSection = document.getElementById("timetableSection");

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
            staffSection.style.display = "none";
            // timetableSection.style.display = "none";

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

            if (section === "staff") {
                staffSection.style.display = "block";
                loadStaff();
            }

            // if (section == "timetable") {
            //     timetableSection.style.display = "block";
            //     loadTimetable();
            // }

        });
    });



    // ===== STUDENT MODAL CONTROL =====
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



    // ===== SUBJECT MODAL CONTROL =====

    const subjectModal = document.getElementById("subjectModal");
    const addSubjectBtn = document.getElementById("addSubjectBtn");
    const closeSubjectModal = document.getElementById("closeSubjectModal");
    const subjectForm = document.getElementById("subjectForm");

    addSubjectBtn.addEventListener("click", () => {

        editingSubjectId = null;

        subjectForm.reset();

        document.getElementById("subjectModalTitle").textContent = "Add Subject";
        document.querySelector(".subject-save-btn").textContent = "Save Subject";

        subjectModal.style.display = "flex";

    });


    closeSubjectModal.addEventListener("click", () => {

        subjectModal.style.display = "none";

    });


    window.addEventListener("click", function (e) {

        if (e.target === subjectModal) {

            subjectModal.style.display = "none";

        }

    });

    // ------------ Add / Update Subject Submit ---------
    subjectForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const subjectData = {
            subject_code: document.getElementById("subjectCode").value.trim(),
            subject_name: document.getElementById("subjectName").value.trim(),
            course: document.getElementById("subjectcourse").value.trim(),
            year: document.getElementById("subjectYear").value,
            semester: document.getElementById("subjectsemester").value
        };

        try {

            let url = editingSubjectId
                ? `/update_subject/${editingSubjectId}`
                : "/add_subject";

            let method = editingSubjectId ? "PUT" : "POST";

            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subjectData)
            });

            const result = await response.json();

            if (response.ok) {

                alert(result.message || "Subject saved successfully");

                subjectForm.reset();
                subjectModal.style.display = "none";
                editingSubjectId = null;

                loadSubjects();

            } else {

                alert(result.error || "Failed to save subject");

            }

        } catch (error) {

            console.error("Error saving subject:", error);
            alert("Server error");

        }

    });

});
// -------------------------------------------------------------
// ================== MANAGE SUBJECT ==========================
// -------------------------------------------------------------

let editingSubjectId = null;


// ===== LOAD SUBJECTS =====
async function loadSubjects() {

    try {

        const response = await fetch("/get_subjects");
        const subjects = await response.json();

        const tableBody = document.getElementById("subjectTableBody");

        if (!tableBody) return;

        tableBody.innerHTML = "";

        subjects.forEach(sub => {

            const row = `
            <tr>
                <td>${sub.subject_code}</td>
                <td>${sub.subject_name}</td>
                <td>${sub.course}</td>
                <td>${sub.year}</td>
                <td>${sub.semester}</td>

                <td>
                    <button onclick="editSubject(${sub.id})" class="btn-primary">Edit</button>
                    <button onclick="deleteSubject(${sub.id})" class="btn-danger">Delete</button>
                </td>
            </tr>
            `;

            tableBody.innerHTML += row;

        });

    } catch (error) {

        console.error("Error loading subjects:", error);

    }
}



// ===== EDIT SUBJECT =====
async function editSubject(id) {

    try {

        const response = await fetch(`/get_subject/${id}`);
        const subject = await response.json();

        document.getElementById("subjectCode").value = subject.subject_code;
        document.getElementById("subjectName").value = subject.subject_name;
        document.getElementById("subjectcourse").value = subject.course;
        document.getElementById("subjectYear").value = subject.year;
        document.getElementById("subjectsemester").value = subject.semester;

        editingSubjectId = id;

        document.getElementById("subjectModalTitle").textContent = "Edit Subject";
        document.querySelector(".subject-save-btn").textContent = "Save Subject";

        document.getElementById("subjectModal").style.display = "flex";

    } catch (error) {

        console.error("Error fetching subject:", error);

    }
}



// ===== DELETE SUBJECT =====
async function deleteSubject(id) {

    if (!confirm("Delete this subject?")) return;

    try {

        const response = await fetch(`/delete_subject/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (response.ok) {

            alert(result.message);
            loadSubjects();

        } else {

            alert(result.error);

        }

    } catch (error) {

        console.error("Error deleting subject:", error);

    }

}


// -------------------------------------------------------------
// ================= MANAGE STAFF ==============================
// -------------------------------------------------------------

let editingStaffId = null;


// ================= LOAD STAFF =================
async function loadStaff() {

    try {

        const response = await fetch("/get_staff");
        const staff = await response.json();

        const tableBody = document.getElementById("staffTableBody");

        if (!tableBody) return;

        tableBody.innerHTML = "";

        staff.forEach(s => {

            const row = `
                <tr>
                    <td>${s.staff_id}</td>
                    <td>${s.staff_name}</td>
                    <td>${s.department}</td>
                    <td>${s.email}</td>
                    <td>
                        <button onclick="editStaff('${s.staff_id}')" class="btn-primary">Edit</button>
                        <button onclick="deleteStaff('${s.staff_id}')" class="btn-danger">Delete</button>
                    </td>
                </tr>
                `;

            tableBody.innerHTML += row;

        });

    } catch (error) {

        console.error("Error loading staff:", error);

    }
}

// STAFF MODAL BUTTONS

const cancelStaffBtn = document.getElementById("cancelStaffBtn");

if (cancelStaffBtn) {
    cancelStaffBtn.onclick = () => {
        staffModal.style.display = "none";
    }
}


// ================= ADD STAFF BUTTON =================

const addStaffBtn = document.getElementById("addStaffBtn");
const staffModal = document.getElementById("staffModal");
const closeStaffModal = document.getElementById("closeStaffModal");
const staffForm = document.getElementById("staffForm");

// OPEN ADD STAFF MODAL
if (addStaffBtn) {

    addStaffBtn.onclick = () => {

        editingStaffId = null;

        staffForm.reset();

        document.getElementById("staffId").disabled = false;

        staffModal.style.display = "flex";

    }

}



// ================= CLOSE MODAL =================

if (closeStaffModal) {

    closeStaffModal.onclick = () => {

        staffModal.style.display = "none";

    }

}



// ================= ADD / UPDATE STAFF =================
if (staffForm) {


    staffForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const staff_id = document.getElementById("staffId").value;
        const staff_name = document.getElementById("staffName").value;
        const department = document.getElementById("staffDept").value;
        const email = document.getElementById("staffEmail").value;

        let url;
        let method;
        let data;

        // EDIT STAFF
        if (editingStaffId) {

            url = `/update_staff/${editingStaffId}`;
            method = "PUT";

            data = {
                staff_name: staff_name,
                department: department,
                email: email
            };

        }
        // ADD STAFF
        else {

            url = "/add_staff";
            method = "POST";

            data = {
                staff_id: staff_id,
                staff_name: staff_name,
                department: department,
                email: email
            };

        }

        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        alert(result.message);

        staffModal.style.display = "none";

        editingStaffId = null;

        loadStaff();

    });


}


// ================= EDIT STAFF =================

async function editStaff(id) {


    const response = await fetch(`/get_staff/${id}`);
    const staff = await response.json();

    document.getElementById("staffId").value = staff.staff_id;
    document.getElementById("staffName").value = staff.staff_name;
    document.getElementById("staffDept").value = staff.department;
    document.getElementById("staffEmail").value = staff.email;

    document.getElementById("staffId").disabled = true;

    editingStaffId = id;

    staffModal.style.display = "flex";


}


// ================= DELETE STAFF =================

async function deleteStaff(id) {

    if (!confirm("Delete this staff?")) return;

    const response = await fetch(`/delete_staff/${id}`, {

        method: "DELETE"

    });

    const result = await response.json();

    alert(result.message);

    loadStaff();

}

// // -------------------------------------------------------------
// // ================== TIME TABLE  ==========================
// // -------------------------------------------------------------

// // ================= LOAD TIMETABLE =================
// async function loadTimetable() {

//     const department = document.getElementById("ttdepartment").value;
//     const shift = document.getElementById("ttshift").value;

//     if (!department) return;

//     const res = await fetch(`/get_timetable?department=${department}&shift=${shift}`);
//     const data = await res.json();

//     const tbody = document.getElementById("timetableBody");
//     tbody.innerHTML = "";

//     const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

//     days.forEach(day => {

//         let row = `<tr><td>${day}</td>`;

//         for (let i = 1; i <= 5; i++) {

//             const cell = data.find(d => d.day === day && d.period == i);

//             if (cell) {

//                 row += `
//                 <td>
//                 ${cell.subject_code}<br>
//                 ${cell.subject}
//                 <small>${cell.staff_id}</small>
//                 </td>
//                 `;

//             }

//             else {

//                 row += `<td>-</td>`;

//             }

//         }

//         row += "</tr>";

//         tbody.innerHTML += row;

//     });

// }

// // ================= SAVE TIMETABLE =================

// async function saveTimetable() {

//     const department = document.getElementById("ttdepartment").value;
//     const semester = document.getElementById("semester").value;
//     const day = document.getElementById("day").value;
//     const period = document.getElementById("period").value;

//     const subject_code = document.getElementById("subject_code").value;
//     const subject_name = document.getElementById("subject_name").value;
//     const staff_id = document.getElementById("staff_id").value;

//     const res = await fetch("/add_timetable", {

//         method: "POST",

//         headers: {
//             "Content-Type": "application/json"
//         },

//         body: JSON.stringify({

//             department: department,
//             semester: semester,
//             shift: "Morning",
//             day: day,
//             period: period,
//             subject_code: subject_code,
//             subject: subject_name,
//             staff_id: staff_id

//         })

//     });

//     const data = await res.json();

//     alert(data.message);

//     loadTimetable();

//     closeModal();

// }

// function openAddModal() {

//     document.getElementById("addModal").style.display = "block";

//     loadStaffDropdown();

// }

// function closeModal() {
//     document.getElementById("addModal").style.display = "none";
// }

// async function loadStaffDropdown() {

//     const dept = document.getElementById("ttdepartment").value;

//     if (!dept) {
//         alert("Select department first");
//         return;
//     }

//     const res = await fetch(`/get_staff_by_department/${dept}`);
//     const staff = await res.json();

//     const staffSelect = document.getElementById("staff_id");

//     staffSelect.innerHTML = "";

//     staff.forEach(s => {

//         const option = document.createElement("option");

//         option.value = s.staff_id;

//         option.textContent = `${s.staff_id} - ${s.staff_name}`;

//         staffSelect.appendChild(option);

//     });

// }

// async function loadSubjectsDropdown() {

//     const res = await fetch("/get_subjects");
//     const subjects = await res.json();

//     const subjectSelect = document.getElementById("subject");

//     subjectSelect.innerHTML = "";

//     subjects.forEach(sub => {

//         const option = document.createElement("option");

//         option.value = sub.subject_code;

//         option.textContent = `${sub.subject_code} - ${sub.subject_name}`;

//         subjectSelect.appendChild(option);

//     });

// }

// async function checkStaff() {

//     const staff_id = document.getElementById("staff_id").value;

//     if (!staff_id) return;

//     const res = await fetch(`/get_staff/${staff_id}`);

//     if (res.status === 200) {

//         const staff = await res.json();

//         if (staff) {

//             document.getElementById("staffStatus").innerHTML =
//                 "✔ Staff: " + staff.staff_name;

//         }
//         else {

//             document.getElementById("staffStatus").innerHTML =
//                 "❌ Staff Not Available";

//         }

//     }

// }   
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
                    <td>${student.course}</td>
                    <td>${student.year}</td>
                    <td>${student.semester}</td>

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
        document.getElementById("semester").value = student.semester;

        const passwordInput = document.getElementById("password");
        passwordInput.value = "";
        passwordInput.required = false;
        passwordInput.disabled = true; // hide password while editing

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

    // Sections
    const dashboardSection = document.getElementById("dashboardSection");
    const studentsSection = document.getElementById("studentsSection");
    const subjectsSection = document.getElementById("subjectsSection");
    const facerecSection = document.getElementById("facerecSection");
    const staffSection = document.getElementById("staffSection");
    const timetablesection = document.getElementById("timetablesection");
    const attendancesection = document.getElementById("attendanceSection");

    // Show dashboard by default on page load
    dashboardSection.style.display = "block";
    document.querySelector('.nav-item[data-section="dashboard"]').classList.add("active");

    // Section switching
    const navItems = document.querySelectorAll(".nav-item");

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
            timetablesection.style.display = "none";
            attendancesection.style.display = "none";

            // Show selected
            switch(section) {
                case "dashboard":
                    dashboardSection.style.display = "block";
                    break;
                case "students":
                    studentsSection.style.display = "block";
                    loadStudents();
                    break;
                case "subjects":
                    subjectsSection.style.display = "block";
                    loadSubjects();
                    break;
                case "facerec":
                    facerecSection.style.display = "block";
                    break;
                case "staff":
                    staffSection.style.display = "block";
                    loadStaff();
                    break;
                case "timetable":
                    timetablesection.style.display = "block";
                    break;
                case "attendance":
                    attendancesection.style.display = "block";
                    loadAttendance();
                    break;
            }

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
        passwordInput.disabled = false; // show password when adding

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
        const semester = document.getElementById("semester").value.trim();
        const passwordVal = document.getElementById("password").value.trim();

        const studentData = { regno, fullname, dob, department, course, year, semester };

        if (!editingStudentId) {
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

    // --------------------------------------------------------
    // =================== TIMETABLE BUTTON ===================
    // --------------------------------------------------------
    const btnLoadTimetable = document.getElementById('btnLoadTimetable');
    if (btnLoadTimetable) {
        btnLoadTimetable.addEventListener('click', loadTimetable);
    }



    const closeTimetableModal = document.getElementById('closeTimetableModal');
    if (closeTimetableModal) {
        closeTimetableModal.onclick = () => {
            document.getElementById('timetableModal').style.display = 'none';
        }
    }

    const timetableForm = document.getElementById('timetableForm');
    if (timetableForm) {
        timetableForm.onsubmit = function (e) {
            e.preventDefault();
            const dep = document.getElementById('ttdepartment').value;
            const course = document.getElementById('ttcourse').value;
            const year = document.getElementById('ttyear').value;
            const sem = document.getElementById('ttsemester').value;
            const shift = document.getElementById('ttshift').value;
            const day = document.getElementById('ttDay').value;
            const period = document.getElementById('ttPeriod').value;
            const subject_code = document.getElementById('ttSubject').value;
            const staff_id = document.getElementById('ttStaff').value;

            fetch('/add_timetable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    department: dep,
                    course: course,
                    year: year,
                    semester: sem,
                    shift: shift,
                    day_order: day,
                    period: period,
                    subject_code: subject_code,
                    staff_id: staff_id
                })
            })
                .then(res => res.json())
                .then(data => {
                    alert('Timetable updated!');
                    document.getElementById('timetableModal').style.display = 'none';
                    loadTimetable(); // refresh grid
                });
        };
    }



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

        if (!response.ok) {
            alert("Failed to load subject");
            return;
        }

        const subject = await response.json();

        if (!subject) {
            alert("Subject not found");
            return;
        }

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

// --------------------------------------------------------
// =================== ATTENDANCE MONITOR ===================
// --------------------------------------------------------



// // -------------------------------------------------------------
// // ================== TIME TABLE  ==========================
// // -------------------------------------------------------------

function loadTimetable() {
    const dep = document.getElementById('ttdepartment').value;
    const course = document.getElementById('ttcourse').value;
    const year = document.getElementById('ttyear').value;
    const sem = document.getElementById('ttsemester').value;
    const shift = document.getElementById('ttshift').value;

    if (!dep || !course || !year || !sem || !shift) {
        alert('Please select all filters!');
        return;
    }

    fetch(`/get_timetable?department=${dep}&course=${course}&year=${year}&semester=${sem}&shift=${shift}`)
        .then(res => res.json())
        .then(data => {
            renderTimetableGrid(data);
            document.getElementById('timetableGrid').style.display = 'table';
        })
        .catch(err => console.error(err));
}

function renderTimetableGrid(timetable) {

    const tbody = document.getElementById('timetableBody');
    tbody.innerHTML = '';

    const dayOrders = [1, 2, 3, 4, 5, 6];

    for (let day of dayOrders) {

        const tr = document.createElement('tr');
        tr.innerHTML = `<td>Day ${day}</td>`;

        for (let p = 1; p <= 5; p++) {

            const slot = timetable.find(t => t.day_order == day && t.period == p);

            const td = document.createElement('td');

            td.textContent = slot
                ? `${slot.subject_code} (${slot.staff_id})`
                : '---';

            td.onclick = () => openSlotModal(day, p, slot);

            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    }
}

function openSlotModal(day, period, slot = null) {
    document.getElementById('ttDay').value = day;
    document.getElementById('ttPeriod').value = period;

    // Populate subjects
    fetch(`/get_subjects`).then(r => r.json()).then(data => {
        const subjSelect = document.getElementById('ttSubject');
        subjSelect.innerHTML = '';
        data.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.subject_code;
            opt.text = s.subject_name;
            subjSelect.add(opt);
        });
        if (slot) subjSelect.value = slot.subject_code;
    });

    // Populate staff
    fetch(`/get_staff`).then(r => r.json()).then(data => {
        const staffSelect = document.getElementById('ttStaff');
        staffSelect.innerHTML = '';
        data.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.staff_id;
            opt.text = s.staff_name;
            staffSelect.add(opt);
        });
        if (slot) staffSelect.value = slot.staff_id;
    });

    document.getElementById('timetableModal').style.display = 'block';
}

// // -----------------------------------------------------------------
// // ================== ATTENDANCE MONITOR  ==========================
// // -----------------------------------------------------------------

async function loadAttendance() {
    const res = await fetch("/get_attendance");
    const data = await res.json();

    const table = document.getElementById("attendanceTableBody");
    table.innerHTML = "";

    data.forEach(a => {
        table.innerHTML += `
        <tr>
            <td>${a.regno}</td>
            <td>${a.name}</td>
            <td>${a.date}</td>
            <td>${a.shift}</td>
            <td>${a.time}</td>
            <td>${a.status}</td>
        </tr>
        `;
    });
}

async function searchAttendance() {
    const regno = document.getElementById("searchRegno").value.trim();
    const date = document.getElementById("searchDate").value;

    if (!regno && !date) {
        alert("Enter Reg No or Date to search");
        return;
    }

    let query = [];
    if (regno) query.push(`regno=${regno}`);
    if (date) query.push(`date=${date}`);

    const url = `/get_attendance?${query.join("&")}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        const table = document.getElementById("attendanceTableBody");
        table.innerHTML = "";

        data.forEach(a => {
            table.innerHTML += `
            <tr>
                <td>${a.regno}</td>
                <td>${a.name}</td>
                <td>${a.date}</td>
                <td>${a.shift}</td>
                <td>${a.time}</td>
                <td>${a.status}</td>
            </tr>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}
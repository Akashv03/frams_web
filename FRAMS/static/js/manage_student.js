document.addEventListener("DOMContentLoaded", function () {

    const studentTableBody = document.getElementById("studentTableBody");
    const studentForm = document.getElementById("studentForm");
    const studentModal = document.getElementById("studentModal");
    const addStudentBtn = document.getElementById("addStudentBtn");
    const closeModal = document.querySelector(".close-modal");
    const modalTitle = document.getElementById("modalTitle");
    const regnoInput = document.getElementById("regno");

    let isEditMode = false;
    let currentStudentId = null;

    // ==============================
    // 🔹 FETCH ALL STUDENTS
    // ==============================
    async function fetchStudents() {
        try {
            const res = await fetch("/get_students");
            if (!res.ok) throw new Error("Failed to fetch students");

            const students = await res.json();
            renderTable(students);

        } catch (error) {
            console.error("Fetch Error:", error);
            alert("Error loading students ❌");
        }
    }

    // ==============================
    // 🔹 RENDER TABLE
    // ==============================
    function renderTable(students) {

        studentTableBody.innerHTML = "";

        if (students.length === 0) {
            studentTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;">No students found</td>
                </tr>
            `;
            return;
        }

        students.forEach(student => {
            const row = `
                <tr>
                    <td>${student.regno}</td>
                    <td>${student.fullname}</td>
                    <td>${student.dob || ""}</td>
                    <td>${student.department}</td>
                    <td>${student.course}</td>
                    <td>${student.year}</td>
                    <td>
                        <button onclick="editStudent(${student.id})">Edit</button>
                        <button onclick="deleteStudent(${student.id})">Delete</button>
                    </td>
                </tr>
            `;
            studentTableBody.innerHTML += row;
        });
    }

    // ==============================
    // 🔹 OPEN ADD MODAL
    // ==============================
    addStudentBtn.addEventListener("click", () => {
        studentForm.reset();
        modalTitle.innerText = "Add Student";

        isEditMode = false;
        currentStudentId = null;

        regnoInput.disabled = false;   // allow editing
        studentModal.style.display = "block";
    });

    // ==============================
    // 🔹 CLOSE MODAL
    // ==============================
    closeModal.addEventListener("click", () => {
        studentModal.style.display = "none";
    });

    // ==============================
    // 🔹 ADD STUDENT FUNCTION
    // ==============================
    async function addStudent(studentData) {

        const response = await fetch("/add_student", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(studentData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Add failed");
        }

        return result;
    }

    // ==============================
    // 🔹 UPDATE STUDENT FUNCTION
    // ==============================
    async function updateStudent(id, studentData) {

        const response = await fetch(`/update_student/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(studentData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Update failed");
        }

        return result;
    }

    // ==============================
    // 🔹 FORM SUBMIT
    // ==============================
    studentForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const studentData = {
            regno: document.getElementById("regno").value.trim(),
            fullname: document.getElementById("fullname").value.trim(),
            dob: document.getElementById("dob").value,
            department: document.getElementById("department").value.trim(),
            course: document.getElementById("course").value.trim(),
            year: document.getElementById("year").value.trim(),
            password: document.getElementById("password").value.trim()
        };

        // 🔹 Basic Validation
        if (!studentData.regno) {
            alert("Register Number is required ❌");
            return;
        }

        if (!isEditMode && !studentData.password) {
            alert("Password is required ❌");
            return;
        }

        try {

            let result;

            if (isEditMode) {
                result = await updateStudent(currentStudentId, studentData);
            } else {
                result = await addStudent(studentData);
            }

            alert(result.message || "Success ✅");

            studentModal.style.display = "none";
            fetchStudents();

        } catch (error) {
            console.error("Submit Error:", error);
            alert(error.message);
        }
    });

    // ==============================
    // 🔹 EDIT STUDENT
    // ==============================
    window.editStudent = async function (id) {

        try {
            const res = await fetch(`/get_student/${id}`);
            if (!res.ok) throw new Error("Failed to fetch student");

            const student = await res.json();

            document.getElementById("regno").value = student.regno;
            document.getElementById("fullname").value = student.fullname;
            document.getElementById("dob").value = student.dob;
            document.getElementById("department").value = student.department;
            document.getElementById("course").value = student.course;
            document.getElementById("year").value = student.year;
            document.getElementById("password").value = "";

            modalTitle.innerText = "Edit Student";

            isEditMode = true;
            currentStudentId = id;

            regnoInput.disabled = true;  // 🔥 Make regno non-editable

            studentModal.style.display = "block";

        } catch (error) {
            console.error("Edit Error:", error);
            alert("Unable to load student ❌");
        }
    };

    // ==============================
    // 🔹 DELETE STUDENT
    // ==============================
    window.deleteStudent = async function (id) {

        if (!confirm("Are you sure you want to delete this student?")) return;

        try {
            const res = await fetch(`/delete_student/${id}`, {
                method: "DELETE"
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || "Delete failed");
            }

            alert(result.message || "Deleted successfully ✅");
            fetchStudents();

        } catch (error) {
            console.error("Delete Error:", error);
            alert(error.message);
        }
    };

    // ==============================
    // 🔹 INITIAL LOAD
    // ==============================
    fetchStudents();
});
function advancedSearch() {

    let regno = document.getElementById("regno").value;
    let name = document.getElementById("name").value;
    let department = document.getElementById("department").value;
    let year = document.getElementById("year").value;

    fetch(`/advanced_search?regno=${regno}&name=${name}&department=${department}&year=${year}`)
    .then(res => res.json())
    .then(data => {

        let tableBody = document.getElementById("studentTableBody");

        if (!tableBody) {
            console.error("studentTableBody not found");
            return;
        }

        tableBody.innerHTML = "";

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4">No Results Found</td></tr>`;
        } else {
            data.forEach(student => {
                tableBody.innerHTML += `
                    <tr>
                        <td>${student.regno}</td>
                        <td>${student.fullname}</td>
                        <td>${student.department}</td>
                        <td>${student.year}</td>
                    </tr>
                `;
            });
        }

        closeSearchModal();
    });
}

function openSearchModal() {
    document.getElementById("searchModal").style.display = "block";
}

function closeSearchModal() {
    document.getElementById("searchModal").style.display = "none";
}
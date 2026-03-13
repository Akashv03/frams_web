from flask import Flask, render_template, jsonify, request, redirect
from flask import jsonify, session
import cv2
import numpy as np
import base64
import os
import pickle
import mysql.connector
from datetime import datetime,time


app = Flask(__name__)

app.secret_key = "super_secret_key"



#------MySQL Connection------

def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="akash2003",
        database="face_rams"
    )

def get_cursor():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    return conn, cursor



#------LOGIN------

@app.route("/")
def login_page():
    return render_template("login.html")

#------LOGOUT------

@app.route("/logout")
def logout():
    session.clear()   # remove all session data
    return redirect("/")

# ----- ADMIN DASHBOARD -----
@app.route("/admin-dashboard")
def admin_dashboard():
    if session.get("role") != "admin":
        return redirect("/")
    return render_template("admin_dashboard.html")

#------LIVE ATTENDANCE------

@app.route("/attendance")
def attendance():
    if session.get("role") not in ["admin", "student"]:
        return redirect("/")
    return render_template("attendance.html")

#------STUDENT DASHBOARD-----

@app.route("/student-dashboard")
def student_dashboard():
    if session.get("role") != "student":
        return redirect("/")
    return render_template("student_dashboard.html")

#-----FORGOT PASSWORD------
@app.route("/forgot-password")
def forgot_password():
    return render_template("forgot_password.html")


#------LOGIN LOGIC------
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    conn = get_db()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT * FROM user WHERE username=%s AND password=%s",
                (username, password))
    user = cur.fetchone()

    cur.close()
    conn.close()

    if user:
        session["username"] = username
        session["role"] = user["role"]

        if user["role"] == "admin":
            return jsonify({
                "status": "success",
                "redirect": "/admin-dashboard"
            })

        elif user["role"] == "student":
            return jsonify({
                "status": "success",
                "redirect": "/student-dashboard"
            })

    return jsonify({"status": "error", "message": "Invalid credentials"})

#------Student Registration API------

@app.route("/studentregister", methods=["POST"])
def register_student():
    data = request.get_json()

    try:
        conn = get_db()
        cur = conn.cursor()

        # 1️⃣ Insert into student table
        student_sql = """
        INSERT INTO student (regno, fullname, dob, department, course, year)
        VALUES (%s, %s, %s, %s, %s, %s)
        """

        student_values = (
            data["regno"],
            data["fullname"],
            data["dob"],
            data["department"],
            data["course"],
            data["year"]
        )

        cur.execute(student_sql, student_values)

        # 2️⃣ Insert into user table
        user_sql = """
        INSERT INTO user (username, password, role)
        VALUES (%s, %s, %s)
        """

        user_values = (
            data["regno"],      # username = regno
            data["password"],
            "student"           # 🔒 Force role student
        )

        cur.execute(user_sql, user_values)

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success"})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


#------FACE CAPTURE WITH TRAIN & TEST SPLIT------

@app.route("/autoCapture", methods=["GET", "POST"])
def autocapture():

    data = request.json
    regno = data["regno"]
    image_data = data["image"]

    # Decode base64 image
    image_data = image_data.split(",")[1]
    img_bytes = base64.b64decode(image_data)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    face_cascade = cv2.CascadeClassifier("haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    train_folder = os.path.join("dataset", "train", regno)
    test_folder = os.path.join("dataset", "test", regno)

    os.makedirs(train_folder, exist_ok=True)
    os.makedirs(test_folder, exist_ok=True)

    # Count already saved images
    train_count = len(os.listdir(train_folder))
    test_count = len(os.listdir(test_folder))
    total_count = train_count + test_count

    for (x, y, w, h) in faces:
        if total_count >= 40:
            return jsonify({"message": "Already collected 40 images"})

        face_img = gray[y:y+h, x:x+w]
        face_img = cv2.resize(face_img, (200, 200))

        total_count += 1

        if total_count <= 30:
            filename = os.path.join(train_folder, f"{regno}_{total_count}.jpg")
        else:
            filename = os.path.join(test_folder, f"{regno}_{total_count}.jpg")

        cv2.imwrite(filename, face_img)

        if total_count == 40:
            train_model()
            accuracy = test_model()
            return jsonify({
            "message": "Dataset Completed",
            "accuracy": accuracy
    })


    return jsonify({"message": f"Total images collected: {total_count}"})


#------TRAIN MODEL-----
def train_model():

    train_path = "dataset/train"
    faces = []
    labels = []
    label_map = {}
    label_id = 0

    for person in os.listdir(train_path):
        person_path = os.path.join(train_path, person)

        if not os.path.isdir(person_path):
            continue

        label_map[label_id] = person

        for img_name in os.listdir(person_path):
            img_path = os.path.join(person_path, img_name)
            img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)

            if img is None:
                continue

            img = cv2.resize(img, (200, 200))
            faces.append(img)
            labels.append(label_id)

        label_id += 1

    if len(faces) == 0:
        print("⚠ No training data found")
        return

    faces = np.array(faces)
    labels = np.array(labels)

    model = cv2.face.LBPHFaceRecognizer_create()
    model.train(faces, labels)
    model.save("model.yml")

    # Save label map
    with open("labels.pkl", "wb") as f:
        pickle.dump(label_map, f)

    print("✅ Model Trained Successfully")

#------TEST MODEL-----

def test_model():

    test_path = "dataset/test"
    model = cv2.face.LBPHFaceRecognizer_create()
    model.read("model.yml")

    correct = 0
    total = 0

    with open("labels.pkl", "rb") as f:
        label_map = pickle.load(f)

    for label, person in label_map.items():
        person_path = os.path.join(test_path, person)

        if not os.path.exists(person_path):
            continue

        for img_name in os.listdir(person_path):
            img_path = os.path.join(person_path, img_name)
            img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)

            predicted_label, confidence = model.predict(img)

            total += 1
            if predicted_label == label:
                correct += 1

    accuracy = (correct / total) * 100 if total > 0 else 0

    print(f"🎯 Test Accuracy: {accuracy:.2f}%")
    return accuracy

def get_shift_and_period():

    print("NEW PERIOD FUNCTION RUNNING")

    now = datetime.now().time()

    morning = [
        (time(8,0), time(9,0), 1),
        (time(9,0), time(10,0), 2),
        (time(10,0), time(11,0), 3),
        (time(11,0), time(12,0), 4),
        (time(12,0), time(13,0), 5)
    ]

    for start, end, p in morning:
        if start <= now < end:
            return "Morning", p

    afternoon = [
        (time(13,0), time(14,0), 1),
        (time(14,0), time(15,0), 2),
        (time(15,0), time(16,0), 3),
        (time(16,0), time(17,0), 4),
        (time(17,0), time(18,0), 5)
    ]

    for start, end, p in afternoon:
        if start <= now < end:
            return "Afternoon", p

    return None, None

def close_previous_period(conn):

    cursor = conn.cursor(dictionary=True, buffered=True)

    shift, current_period = get_shift_and_period()

    if not shift or not current_period:
        return

    today = datetime.now().date()

    # Get all students
    cursor.execute("""
        SELECT regno, fullname, department, course, semester
        FROM student
    """)
    students = cursor.fetchall()

    for student in students:

        # Loop through all previous periods
        for p in range(1, current_period):

            cursor.execute("""
                SELECT id FROM attendance
                WHERE regno=%s
                AND date=%s
                AND shift=%s
                AND period=%s
            """,(student["regno"], today, shift, p))

            record = cursor.fetchone()

            # -------- GET SUBJECT + STAFF FROM TIMETABLE --------
            cursor.execute("""
                SELECT subject_code, staff_id
                FROM timetable
                WHERE UPPER(course)=UPPER(%s)
                AND semester=%s
                AND UPPER(shift_type)=UPPER(%s)
                AND period=%s
                """, (
                    student["course"],
                    student["semester"],
                    shift,
                    p
                ))

            timetable = cursor.fetchone()
            print("Period:", p, "Timetable:", timetable)

            if timetable:
                subject_code = timetable["subject_code"]
                staff_id = timetable["staff_id"]
            else:
                subject_code = None
                staff_id = None

            # -------- INSERT ABSENT IF RECORD NOT EXISTS --------
            if not record:

                cursor.execute("""
                    INSERT INTO attendance
                    (regno,name,date,shift,period,status,department,course,semester,subject_code,staff_id)
                    VALUES (%s,%s,%s,%s,%s,'absent',%s,%s,%s,%s,%s)
                """,(
                    student["regno"],
                    student["fullname"],
                    today,
                    shift,
                    p,
                    student["department"],
                    student["course"],
                    student["semester"],
                    subject_code,
                    staff_id
                ))

            else:

                # Convert pending → absent
                cursor.execute("""
                    UPDATE attendance
                    SET status='absent',subject_code=%s,
                    staff_id=%s
                    WHERE regno=%s
                    AND date=%s
                    AND shift=%s
                    AND period=%s
                    AND status='pending'
                """,(subject_code,staff_id,student["regno"], today, shift, p))

    conn.commit()

def create_pending_attendance(conn, department, course, semester, shift, period):

    cursor = conn.cursor(dictionary=True, buffered=True)

    today = datetime.now().date()

    cursor.execute("""
    SELECT regno, fullname
    FROM student
    WHERE department=%s AND course=%s AND semester=%s
    """,(department,course,semester))

    students = cursor.fetchall()

    # get timetable
    cursor.execute("""
    SELECT subject_code, staff_id
    FROM timetable
    WHERE course=%s AND semester=%s AND shift_type=%s AND period=%s
    """,(course,semester,shift,period))

    timetable = cursor.fetchone()

    if timetable:
        subject_code = timetable["subject_code"]
        staff_id = timetable["staff_id"]
    else:
        subject_code = None
        staff_id = None

    for student in students:

       cursor.execute("""
       SELECT id FROM attendance
       WHERE regno=%s
       AND date=%s
       AND shift=%s
       AND period=%s
       """,(student["regno"], today, shift, period))
    
       exists = cursor.fetchone()
    
       if not exists:
        
           cursor.execute("""
           INSERT INTO attendance
           (regno,name,date,shift,period,status,department,course,semester,subject_code,staff_id)
           VALUES (%s,%s,%s,%s,%s,'pending',%s,%s,%s,%s,%s)
           """,(
               student["regno"],
               student["fullname"],
               today,
               shift,
               period,
               department,
               course,
               semester,
               subject_code,
               staff_id
           ))
    conn.commit()

#------LIVE FACE RECOGNIZE------

@app.route("/recognize", methods=["POST"])
def recognize():

    data = request.json
    image_data = data["image"].split(",")[1]

    img_bytes = base64.b64decode(image_data)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    face_cascade = cv2.CascadeClassifier("haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    if len(faces) == 0:
        return jsonify({"status": "no_face_detected"})

    if not os.path.exists("model.yml"):
        return jsonify({"status": "model_not_trained"})

    # Load Model
    model = cv2.face.LBPHFaceRecognizer_create()
    model.read("model.yml")

    with open("labels.pkl", "rb") as f:
        label_map = pickle.load(f)

    conn = get_db()
    cursor = conn.cursor(dictionary=True, buffered=True)

    # 1️⃣ close previous periods
    close_previous_period(conn)

    shift, period = get_shift_and_period()
    print("CURRENT TIME:", datetime.now())
    print("SHIFT:", shift)
    print("PERIOD:", period)

    if not shift:
        return jsonify({"status": "outside_class_time"})

    today = datetime.now().date()
    current_time = datetime.now().strftime("%H:%M:%S")

    for (x, y, w, h) in faces:

        face_img = gray[y:y+h, x:x+w]
        face_img = cv2.resize(face_img, (200, 200))

        predicted_label, confidence = model.predict(face_img)

        print("Confidence:", confidence)

        if confidence > 60:
            return jsonify({"status": "unknown_face"})

        if predicted_label not in label_map:
            return jsonify({"status": "unknown_face"})

        regno = label_map[predicted_label]

        # -------- GET STUDENT --------
        cursor.execute("""
        SELECT fullname, department, course, semester, year
        FROM student
        WHERE regno=%s
        """, (regno,))

        student = cursor.fetchone()

        if not student:
            return jsonify({"status": "student_not_found"})

        # -------- CREATE PENDING ATTENDANCE --------
        # 2️⃣ create rows for current period
        create_pending_attendance(
            conn,
            student["department"],
            student["course"],
            student["semester"],
            shift,
            period
        )

        # -------- GET SUBJECT --------
        cursor.execute("""
        SELECT subject_code, staff_id
        FROM timetable
        WHERE course=%s
        AND semester=%s
        AND shift_type=%s
        AND period=%s
        """, (
            student["course"],
            student["semester"],
            shift,
            period
        ))

        timetable = cursor.fetchone()

        if not timetable:
            return jsonify({"status": "no_class_now"})

        subject_code = timetable["subject_code"]
        staff_id = timetable["staff_id"]

        # -------- CHECK IF PRESENT ALREADY --------
        cursor.execute("""
        SELECT id FROM attendance
        WHERE regno=%s
        AND date=%s
        AND shift=%s
        AND period=%s
        AND status='present'
        """, (
            regno,
            today,
            shift,
            period
        ))

        already_present = cursor.fetchone()

        if already_present:
            return jsonify({
                "status": "already_marked",
                "regno": regno,
                "name": student["fullname"]
            })

        # -------- UPDATE ATTENDANCE --------
        cursor.execute("""
        UPDATE attendance
        SET status='present',
            time=%s,
            staff_id=%s
        WHERE regno=%s
        AND date=%s
        AND shift=%s
        AND period=%s
        AND status='pending'
        """, (
            current_time,
            staff_id,
            regno,
            today,
            shift,
            period
        ))

        conn.commit()

        conn.close()

        return jsonify({
            "status": "matched",
            "regno": regno,
            "name": student["fullname"],
            "department": student["department"],
            "course": student["course"],
            "semester": student["semester"],
            "year": student["year"],
            "subject_code": subject_code,
            "staff_id": staff_id,
            "period": period,
            "shift": shift,
            "date": str(today),
            "time": current_time,
            "confidence": float(confidence)
        })

    conn.close()

    return jsonify({"status": "not_matched"})
# ----------------------------------------------
# =============== MANAGE STUDENT ==============
# ---------------------------------------------

# ------GET ALL STUDENTS DETAILS------
@app.route('/get_students', methods=['GET'])
def get_students():
    conn, cursor = get_cursor()
    cursor.execute("SELECT * FROM student")
    students = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(students)

#-----ADD STUDENT-----
@app.route('/add_student', methods=['POST'])
def add_student():
    try:
        data = request.json
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        # 1️⃣ Insert into student table
        cursor.execute("""
            INSERT INTO student (regno, fullname, dob, department, course, semester, year)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            data['regno'],
            data['fullname'],
            data['dob'],
            data['department'],
            data['course'],
            data['semester'],
            data['year']
        ))

        # 2️⃣ Insert into user table
        cursor.execute("""
            INSERT INTO user (username, password, role)
            VALUES (%s, %s, %s)
        """, (
            data['regno'],
            data['password'],
            'student'
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Student added successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

#------UPDATE STUDENT------
@app.route('/update_student/<int:id>', methods=['PUT'])
def update_student(id):
    try:
        data = request.json
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        # 1️⃣ Get old regno
        cursor.execute("SELECT regno FROM student WHERE id=%s", (id,))
        old_data = cursor.fetchone()
        old_regno = old_data['regno']

        # 2️⃣ Update attendance FIRST
        cursor.execute("""
            UPDATE attendance
            SET regno=%s
            WHERE regno=%s
        """, (data['regno'], old_regno))

        # 3️⃣ Update user login
        cursor.execute("""
            UPDATE user
            SET username=%s
            WHERE username=%s
        """, (data['regno'], old_regno))

        # 4️⃣ Update student table LAST
        cursor.execute("""
            UPDATE student
            SET regno=%s, fullname=%s, dob=%s, department=%s, course=%s,  semester=%s, year=%s
            WHERE id=%s
        """, (
            data['regno'],
            data['fullname'],
            data['dob'],
            data['department'],
            data['course'],
            data['semester'],
            data['year'],
            id
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Student updated successfully"})

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500
    

#------DELETE STUDENT------
@app.route('/delete_student/<int:id>', methods=['DELETE'])
def delete_student(id):
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        # 1️⃣ Get regno
        cursor.execute("SELECT regno FROM student WHERE id=%s", (id,))
        data = cursor.fetchone()
        regno = data['regno']

        # 2️⃣ Delete from student
        cursor.execute("DELETE FROM student WHERE id=%s", (id,))

        # 3️⃣ Delete from user
        cursor.execute("DELETE FROM user WHERE username=%s", (regno,))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Student deleted successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

#------GET STUDENT BY ID------
@app.route('/get_student/<int:id>', methods=['GET'])
def get_student(id):
    conn, cursor = get_cursor()
    cursor.execute("SELECT * FROM student WHERE id=%s", (id,))
    student = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(student)


#----------SEARCH BAR---------
@app.route('/advanced_search', methods=['GET'])
def advanced_search():

    regno = request.args.get('regno')
    name = request.args.get('name')
    department = request.args.get('department')
    year = request.args.get('year')

    conn, cursor = get_cursor()

    query = "SELECT * FROM student WHERE 1=1"
    values = []

    if regno:
        query += " AND regno LIKE %s"
        values.append(f"%{regno}%")

    if name:
        query += " AND fullname LIKE %s"
        values.append(f"%{name}%")

    if department:
        query += " AND department LIKE %s"
        values.append(f"%{department}%")

    if year:
        query += " AND year LIKE %s"
        values.append(f"%{year}%")

    cursor.execute(query, values)
    students = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(students)

#-------------------------------------
#=========MANAGE STAFF==============
# ------------------------------------

#--------GET STAFF------
@app.route('/get_staff', methods=['GET'])
def get_staff():
    conn, cursor = get_cursor()
    cursor.execute("SELECT * FROM staff")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

#--------ADD STAFF--------
@app.route('/add_staff', methods=['POST'])
def add_staff():

    data = request.json

    staff_id = data['staff_id']
    name = data['staff_name']
    dept = data['department']
    email = data['email']

    conn, cursor = get_cursor()

    # Check duplicate
    cursor.execute("SELECT * FROM staff WHERE staff_id=%s", (staff_id,))
    existing = cursor.fetchone()

    if existing:
        cursor.close()
        conn.close()
        return jsonify({"message": "Staff ID already exists"})

    # Insert staff
    cursor.execute("""
        INSERT INTO staff (staff_id, staff_name, department, email)
        VALUES (%s, %s, %s, %s)
    """, (staff_id, name, dept, email))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Staff added successfully"})


#-------EDIT STAFF-------
@app.route("/get_staff/<staff_id>")
def get_staff_by_id(staff_id):

    conn,cursor = get_cursor()

    cursor.execute("SELECT * FROM staff WHERE staff_id=%s",(staff_id,))
    staff = cursor.fetchone()

    cursor.close()
    conn.close()

    return jsonify(staff)

#--------UPDATE STAFF-------
@app.route("/update_staff/<staff_id>", methods=["PUT"])
def update_staff(staff_id):

    data = request.json

    name = data["staff_name"]
    dept = data["department"]
    email = data["email"]

    conn, cursor = get_cursor()

    cursor.execute("""
        UPDATE staff
        SET staff_name=%s, department=%s, email=%s
        WHERE staff_id=%s
    """, (name, dept, email, staff_id))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Staff updated successfully"})


#--------DELETE STAFF-------
@app.route('/delete_staff/<staff_id>', methods=['DELETE'])
def delete_staff(staff_id):

    conn, cursor = get_cursor()

    cursor.execute("DELETE FROM staff WHERE staff_id=%s",(staff_id,))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message":"Staff deleted successfully"})



#========================================================
#=============== MANAGE SUBJECT =========================
#========================================================

# -------- GET ALL SUBJECTS --------
@app.route("/get_subjects", methods=["GET"])
def get_subjects():
    conn, cursor = get_cursor()

    cursor.execute("SELECT * FROM subject")
    subjects = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(subjects)


# -------- GET SINGLE SUBJECT --------
@app.route("/get_subject/<int:id>", methods=["GET"])
def get_subject(id):
    try:
        conn, cursor = get_cursor()

        cursor.execute(
            "SELECT id, subject_code, subject_name, course, year, semester FROM subject WHERE id=%s",
            (id,)
        )

        subject = cursor.fetchone()

        cursor.close()
        conn.close()

        if not subject:
            return jsonify({"error": "Subject not found"}), 404

        return jsonify({
            "id": subject["id"],
            "subject_code": subject["subject_code"],
            "subject_name": subject["subject_name"],
            "course": subject["course"],
            "year": subject["year"],
            "semester": subject["semester"]
        })

    except Exception as e:
        print("ERROR:", e)  # This will show error in terminal
        return jsonify({"error": str(e)}), 500


# -------- ADD SUBJECT --------
@app.route("/add_subject", methods=["POST"])
def add_subject():
    try:
        data = request.json

        subject_code = data["subject_code"]
        subject_name = data["subject_name"]
        department = data["department"]
        year = data["year"]
        semester = data["semester"]

        conn, cursor = get_cursor()

        cursor.execute("""
            INSERT INTO subject 
            (subject_code, subject_name, department, year, semester)
            VALUES (%s,%s,%s,%s,%s)
        """, (subject_code, subject_name, department, year, semester))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "message": "Subject added successfully"
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        })

# ---------UPDATE SUBJECT--------
@app.route("/update_subject/<int:id>", methods=["PUT"])
def update_subject(id):

    data = request.json

    subject_code = data["subject_code"]
    subject_name = data["subject_name"]
    course = data["course"]
    year = data["year"]
    semester = data["semester"]

    conn, cursor = get_cursor()

    cursor.execute("""
        UPDATE subject
        SET subject_code=%s,
            subject_name=%s,
            course=%s,
            year=%s,
            semester=%s
        WHERE id=%s
    """,(subject_code,subject_name,course,year,semester,id))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "message":"Subject updated successfully"
    })


# -------- DELETE SUBJECT --------
@app.route("/delete_subject/<int:id>", methods=["DELETE"])
def delete_subject(id):

    conn, cursor = get_cursor()

    cursor.execute("DELETE FROM subject WHERE id=%s", (id,))
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "message": "Subject deleted successfully"
    })



#===================================================================
#------------------TIME TABLE-------------------------------
#===================================================================

@app.route("/get_timetable", methods=["GET"])
def get_timetable():

    department = request.args.get("department")
    course = request.args.get("course")
    year = request.args.get("year")
    semester = request.args.get("semester")
    shift = request.args.get("shift")

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT * FROM timetable
        WHERE department=%s AND course=%s AND year=%s
        AND semester=%s AND shift_type=%s
    """

    cursor.execute(query, (department, course, year, semester, shift))
    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(data)

@app.route("/add_timetable", methods=["POST"])
def add_timetable():
    data = request.json
    dept = data["department"]
    course = data["course"]
    year = data["year"]
    sem = data["semester"]
    shift = data["shift"]
    day_order = data["day_order"]
    period = data["period"]
    subject_code = data["subject_code"]
    staff_id = data["staff_id"]

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    # Check Staff
    cursor.execute("SELECT * FROM staff WHERE staff_id=%s", (staff_id,))
    staff = cursor.fetchone()
    if not staff:
        return jsonify({"success": False, "message": "Staff Not Registered"})

    # Check Subject
    cursor.execute("SELECT * FROM subject WHERE subject_code=%s", (subject_code,))
    subject = cursor.fetchone()
    if not subject:
        return jsonify({"success": False, "message": "Subject Not Registered"})

    # Check Staff Max 3 periods per day
    cursor.execute("""
        SELECT COUNT(*) as total FROM timetable 
        WHERE staff_id=%s AND day_order=%s AND semester=%s AND shift_type=%s
    """, (staff_id, day_order, sem, shift))
    total = cursor.fetchone()["total"]
    if total >= 3:
        return jsonify({"success": False, "message": "Staff already has 3 periods today"})

    # Check if slot exists (for same department, course, year, semester, shift, day, period)
    cursor.execute("""
        SELECT * FROM timetable 
        WHERE department=%s AND course=%s AND year=%s AND semester=%s AND shift_type=%s AND day_order=%s AND period=%s
    """, (dept, course, year, sem, shift, day_order, period))
    slot = cursor.fetchone()

    if slot:
        # Update existing slot
        cursor.execute("""
            UPDATE timetable 
            SET subject_code=%s, staff_id=%s, subject=%s
            WHERE id=%s
        """, (subject_code, staff_id, subject["subject_name"], slot["id"]))
        conn.commit()
        return jsonify({"success": True, "message": "Timetable Slot Updated", "slot": {
            "id": slot["id"], "department": dept, "course": course, "year": year, "semester": sem,
            "shift": shift, "day_order": day_order, "period": period, "subject_code": subject_code, "staff_id": staff_id
        }})

    else:
        # Insert new slot
        cursor.execute("""
            INSERT INTO timetable (department, course, year, semester, shift_type, day_order, period, subject_code, staff_id, subject)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (dept, course, year, sem, shift, day_order, period, subject_code, staff_id, subject["subject_name"]))
        conn.commit()
        slot_id = cursor.lastrowid
        return jsonify({"success": True, "message": "Timetable Added", "slot": {
            "id": slot_id, "department": dept, "course": course, "year": year, "semester": sem,
            "shift": shift, "day_order": day_order, "period": period, "subject_code": subject_code, "staff_id": staff_id
        }})


@app.route("/delete_timetable", methods=["POST"])
def delete_timetable():
    data = request.json
    dept = data["department"]
    course = data["course"]
    year = data["year"]
    sem = data["semester"]
    shift = data["shift"]
    day_order = data["day_order"]
    period = data["period"]

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM timetable
        WHERE department=%s AND course=%s AND year=%s AND semester=%s AND shift_type=%s AND day_order=%s AND period=%s
    """, (dept, course, year, sem, shift, day_order, period))
    conn.commit()
    return jsonify({"success": True, "message": "Timetable Slot Deleted"})


#===================================================================
#------------------ ATTENDANCE MONITOR-------------------------------
#===================================================================

# ----------- GET ATTENDANCE ----------
@app.route("/get_attendance")
def get_attendance():
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT * FROM attendance")
    rows = cur.fetchall()

    data = []
    for r in rows:
        data.append({
            "regno": r["regno"],
            "name": r["name"],
            "date": r["date"].strftime("%Y-%m-%d") if r["date"] else "",
            "shift": r["shift"],
            "period": r["period"],
            "time": str(r["time"]) if r["time"] else "",  # convert timedelta/time to string
            "status": r["status"],
            "staff_id": r["staff_id"]
        })

    cur.close()
    db.close()

    return jsonify(data)

# ---------- ATTENDANCE SUMMARY ----------
@app.route('/attendance_summary')
def attendance_summary():

    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
    SELECT 
        s.regno,
        s.name,
        COUNT(CASE WHEN a.status='Present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status='Absent' THEN 1 END) as absent
    FROM student s
    LEFT JOIN attendance a ON s.regno = a.regno
    GROUP BY s.regno
    """)

    data = cursor.fetchall()

    cursor.close()
    db.close()

    return jsonify(data)



if __name__ == "__main__":
    app.run(debug=True)

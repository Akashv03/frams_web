from flask import Flask, render_template, jsonify, request, redirect
from flask import jsonify, session
import cv2
import numpy as np
import base64
import os
import pickle
import mysql.connector
from datetime import datetime


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

#------LIVE FACE RECOGNIZE------

@app.route("/recognize", methods=["POST"])
def recognize():

    import pickle

    data = request.json
    image_data = data["image"]

    image_data = image_data.split(",")[1]
    img_bytes = base64.b64decode(image_data)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    face_cascade = cv2.CascadeClassifier("haarcascade_frontalface_default.xml")
    detected_faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    if len(detected_faces) == 0:
        return jsonify({"status": "no_face_detected"})

    if not os.path.exists("model.yml"):
        return jsonify({"status": "error", "message": "Model not trained yet"})

    model = cv2.face.LBPHFaceRecognizer_create()
    model.read("model.yml")

    with open("labels.pkl", "rb") as f:
        label_map = pickle.load(f)

    for (x, y, w, h) in detected_faces:

        face_img = gray[y:y+h, x:x+w]
        face_img = cv2.resize(face_img, (200, 200))

        predicted_label, confidence = model.predict(face_img)
        if predicted_label not in label_map:
            return jsonify({"status": "unknown_face"})

        print("Confidence:", confidence)
        


        if confidence < 60:

            regno = label_map[predicted_label]

            conn = get_db()
            cursor = conn.cursor(dictionary=True)

            # Get user details
            cursor.execute(
                "SELECT fullname, department, course, year FROM student WHERE regno=%s",
                (regno,)
            )
            student = cursor.fetchone()

            if student:

                now = datetime.now()
                today_date = now.date()
                current_time = now.strftime("%H:%M:%S")

                # Decide shift
                if now.hour < 12:
                    shift = "Morning"
                else:
                    shift = "Evening"

                # Check duplicate attendance
                cursor.execute("""
                    SELECT * FROM attendance 
                    WHERE regno=%s AND date=%s AND shift=%s
                """, (regno, today_date, shift))

                already = cursor.fetchone()

                if not already:
                    cursor.execute("""
                        INSERT INTO attendance (regno, name, date, shift, time)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (regno, student["fullname"], today_date, shift, current_time))

                    conn.commit()

                    status = "matched"
                else:
                    status = "already_marked"

                conn.close()

                return jsonify({
                    "status": status,
                    "regno": regno,
                    "name": student["fullname"],
                    "dept": student["department"],
                    "course": student["course"],
                    "year": student["year"],
                    "image": data["image"],
                    "date": str(today_date),
                    "time": current_time,
                    "shift": shift,
                    "confidence": float(confidence)
                })

    return jsonify({"status": "not_matched"})


# ------GET ALL STUDENT DETAILS------
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
            INSERT INTO student (regno, fullname, dob, department, course, year)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            data['regno'],
            data['fullname'],
            data['dob'],
            data['department'],
            data['course'],
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

        # 1️⃣ Get old regno (important if regno changed)
        cursor.execute("SELECT regno FROM student WHERE id=%s", (id,))
        old_data = cursor.fetchone()
        old_regno = old_data['regno']

        # 2️⃣ Update student table (NO PASSWORD HERE)
        cursor.execute("""
            UPDATE student
            SET regno=%s, fullname=%s, dob=%s, department=%s, course=%s, year=%s
            WHERE id=%s
        """, (
            data['regno'],
            data['fullname'],
            data['dob'],
            data['department'],
            data['course'],
            data['year'],
            id
        ))

        # 3️⃣ Update user table (username + password)
        cursor.execute("""
            UPDATE user
            SET username=%s, password=%s
            WHERE username=%s
        """, (
            data['regno'],
            data['password'],
            old_regno
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Student updated successfully"})

    except Exception as e:
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
            "SELECT id, subject_code, subject_name, department, year, semester FROM subject WHERE id=%s",
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
            "department": subject["department"],
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
@app.route("/update_subject/<int:id>", methods=["POST"])
def update_subject(id):

    data = request.json

    code = data["code"]
    name = data["name"]
    dept = data["department"]
    year = data["year"]
    semester = data["semester"]

    conn, cursor = get_cursor()

    cursor.execute("""
        UPDATE subject
        SET subject_code=%s,
            subject_name=%s,
            department=%s,
            year=%s,
            semester=%s
        WHERE id=%s
    """,(code,name,dept,year,semester,id))

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




#-------------------------------------
#=========MANAGE STAFF==============

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


#===================================================================
#------------------TIME TABLE-------------------------------
#===================================================================


# #--------ADD TIMETABLE-------
# @app.route('/add_timetable', methods=['POST'])
# def add_timetable():

#     data = request.json

#     department = data['department']
#     semester = data['semester']
#     shift = data['shift']
#     day = data['day']
#     period = data['period']
#     subject_code = data['subject_code']
#     subject = data['subject']
#     staff_id = data['staff_id']

#     conn = get_db()
#     cursor = conn.cursor()

#     cursor.execute("""
#         INSERT INTO timetable
#         (department, semester, shift_type, day, period, subject_code, subject, staff_id)
#         VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
#     """, (department, semester, shift, day, period, subject_code, subject, staff_id))

#     conn.commit()

#     return jsonify({"message": "Timetable added successfully"})

#--------GET TIMETABEL IN FORNTEND--------

# @app.route('/get_timetable')
# def get_timetable():

#     department = request.args.get("department")
#     shift = request.args.get("shift")

#     conn, cursor = get_cursor()

#     cursor.execute("""
#     SELECT t.day,t.period,s.subject_name,t.staff_id
#     FROM timetable t
#     JOIN subject s ON t.subject_code = s.subject_code
#     WHERE t.department=%s AND t.shift_type=%s
#     """,(department,shift))

#     rows = cursor.fetchall()

#     cursor.close()
#     conn.close()

#     return jsonify(rows)

# @app.route("/get_staff_by_department/<dept>")
# def get_staff_by_department(dept):

#     conn, cursor = get_cursor()

#     cursor.execute(
#         "SELECT staff_id, staff_name FROM staff WHERE department=%s",
#         (dept,)
#     )

#     staff = cursor.fetchall()

#     cursor.close()
#     conn.close()

#     return jsonify(staff)


if __name__ == "__main__":
    app.run(debug=True)

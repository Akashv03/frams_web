from flask import Flask, render_template,jsonify,request,render_template
from database import get_db_connection
import cv2
import numpy as np
import base64
import os
import json
import pickle
import mysql.connector

app = Flask(__name__)

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


@app.route("/")
def login_page():
    return render_template("login.html")

@app.route("/attendance")
def attendance():
    return render_template("attendance.html")

@app.route("/student-dashboard")
def student_dashboard():
    return render_template("student_dashboard.html")

@app.route("/forgot-password")
def forgot_password():
    return render_template("forgot_password.html")

@app.route("/start-attendance")
def start_attendance():
    return "Attendance started!"

# STUDENT LOGIN
@app.route("/student-login", methods=["POST"])
def student_login():
    data = request.get_json()
    regno = data.get("regno")
    password = data.get("password")

    # Admin check
    if regno == "admin" and password == "123":
        return jsonify({"status": "success", "role": "admin"})

    # Student check
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM student WHERE regno=%s AND password=%s", (regno, password))
        student = cur.fetchone()
        cur.close()
        conn.close()

        if student:
            return jsonify({"status": "success", "role": "student", "regno": student["regno"]})
        else:
            return jsonify({"status": "error", "message": "Invalid credentials!"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})



# MySQL Connection

def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",        # change if needed
        password="akash2003",    # your MySQL password
        database="face_rams"
    )

# Student Registration API

@app.route("/studentregister", methods=["POST"])
def register_student():
    data = request.get_json()
    print("Incoming data:", data)

    try:
        conn = get_db()
        cur = conn.cursor()

        sql = """
        INSERT INTO student
        (regno, password, fullname, dob, department, course, year)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """

        values = (
            data["regno"],
            data["password"],
            data["fullname"],
            data["dob"],
            data["department"],
            data["course"],
            data["year"]
        )

        cur.execute(sql, values)
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success"})

    except mysql.connector.Error as err:
        print("Database Error:", err)
        return jsonify({"status": "error", "message": str(err)})




# FACE CAPTURE WITH TRAIN & TEST SPLIT

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


def train_model():

    train_path = "dataset/train"
    faces = []
    labels = []
    label_map = {}
    label_id = 0

    for person in os.listdir(train_path):
        person_path = os.path.join(train_path, person)
        label_map[label_id] = person

        for img_name in os.listdir(person_path):
            img_path = os.path.join(person_path, img_name)
            img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
            faces.append(img)
            labels.append(label_id)

        label_id += 1

    faces = np.array(faces)
    labels = np.array(labels)

    model = cv2.face.LBPHFaceRecognizer_create()
    model.train(faces, labels)
    model.save("model.yml")

    print("✅ Model Trained Successfully")

def test_model():

    test_path = "dataset/test"
    model = cv2.face.LBPHFaceRecognizer_create()
    model.read("model.yml")

    correct = 0
    total = 0

    label_id = 0
    label_map = {}

    # create label map again
    for person in os.listdir("dataset/train"):
        label_map[label_id] = person
        label_id += 1

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

#Face Recognize
@app.route("/recognize", methods=["POST"])
def recognize():

    data = request.json
    image_data = data["image"]

    # Decode base64 image
    image_data = image_data.split(",")[1]
    img_bytes = base64.b64decode(image_data)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    face_cascade = cv2.CascadeClassifier("haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    if not os.path.exists("model.yml"):
        return jsonify({"status": "error", "message": "Model not trained yet"})

    model = cv2.face.LBPHFaceRecognizer_create()
    model.read("model.yml")

    # Create label map
    label_map = {}
    label_id = 0
    for person in os.listdir("dataset/train"):
        label_map[label_id] = person
        label_id += 1

    for (x, y, w, h) in faces:

        face_img = gray[y:y+h, x:x+w]
        face_img = cv2.resize(face_img, (200, 200))

        predicted_label, confidence = model.predict(face_img)

        print("Confidence:", confidence)

        # LOWER confidence = better match
        if confidence < 80:
            regno = label_map[predicted_label]

            return jsonify({
                "status": "matched",
                "regno": regno,
                "confidence": float(confidence)
            })

    return jsonify({"status": "not_matched"})


if __name__ == "__main__":
    app.run(debug=True)

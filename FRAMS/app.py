from flask import Flask, render_template,jsonify,request,render_template
from database import get_db_connection
import cv2
import numpy as np
import base64
import os
import json
import pickle

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


@app.route("/student-register")
def student_reg():
    return render_template("student_reg.html")

@app.route("/forgot-password")
def forgot_password():
    return render_template("forgot_password.html")

@app.route("/start-attendance")
def start_attendance():
    return "Attendance started!"

@app.route("/")
def home():
    return render_template("attendance.html")

# @app.route("/recognize", methods=["POST"])
# def recognize_attandance():

#     import datetime
#     now = datetime.datetime.now()

#     return jsonify({
#         "reg": "24MCA058",
#         "name": "Akash",
#         "dept": "CS",
#         "course": "MCA",
#         "year": "2",
#         "date": now.strftime("%d-%m-%Y"),
#         "time": now.strftime("%I:%M %p")
#     })

#FACE CAPTURE

@app.route("/autoCapture", methods=["POST"])
def autocapture():

    data = request.json
    regno = data["regno"]
    image = data["image"]

    image = image.split(",")[1]
    img_bytes = base64.b64decode(image)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    folder = os.path.join("dataset", regno)
    os.makedirs(folder, exist_ok=True)

    count = len(os.listdir(folder)) + 1

    filename = os.path.join(folder, f"{count}.jpg")
    cv2.imwrite(filename, frame)

    return jsonify({"message": f"Image {count} saved"})



#MODEL TRAIN


@app.route("/train", methods=["GET"])
def train_model():

    recognizer = cv2.face.LBPHFaceRecognizer_create()

    faces = []
    ids = []
    label_map = {}

    current_id = 0

    dataset_path = "dataset"

    for person in os.listdir(dataset_path):
        print("Training:", person)

        label_map[current_id] = person

        person_folder = os.path.join(dataset_path, person)

        for img_name in os.listdir(person_folder):

            img_path = os.path.join(person_folder, img_name)

            img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)

            faces.append(img)
            ids.append(current_id)

        current_id += 1

    recognizer.train(faces, np.array(ids))
    recognizer.save("trainer.yml")

    # save mapping
    with open("labels.pkl", "wb") as f:
        pickle.dump(label_map, f)


    return jsonify({"message": "Training completed!"})



@app.route("/recognize", methods=["POST"])
def recognize():

    print(" RECOGNIZE API CALLED")

    data = request.json
    image = data["image"]

    # decode image
    image = image.split(",")[1]
    img_bytes = base64.b64decode(image)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # ✅ LOAD FACE CASCADE
    face_cascade = cv2.CascadeClassifier(
        "haarcascade_frontalface_default.xml"
    )

    # ✅ CREATE RECOGNIZER
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.read("trainer.yml")

    # ✅ LOAD LABELS
    with open("labels.pkl", "rb") as f:
        labels = pickle.load(f)

    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    for (x, y, w, h) in faces:

        face = gray[y:y+h, x:x+w]

        label, confidence = recognizer.predict(face)

        print("Confidence:", confidence)

        if confidence < 80:

            regno = labels[label]

            return jsonify({
                "status": "matched",
                "regno": regno
            })

    return jsonify({"status": "unknown"})





if __name__ == "__main__":
    app.run(debug=True)

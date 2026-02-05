from flask import Flask, render_template

app = Flask(__name__)

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


if __name__ == "__main__":
    app.run(debug=True)

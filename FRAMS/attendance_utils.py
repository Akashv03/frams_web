from datetime import datetime, time

def get_shift_and_period():
    now = datetime.now()
    current_time = now.time()
    hour = now.hour

    # Determine shift
    if 8 <= hour < 12:
        shift = "Morning"
    elif 13 <= hour < 17:
        shift = "Afternoon"  # internal
    else:
        shift = "Evening"

    # Morning periods
    morning_periods = [
        (time(8,0), time(9,0)),
        (time(9,0), time(10,0)),
        (time(10,0), time(11,0)),
        (time(11,0), time(12,0)),
        (time(12,0), time(13,0))
    ]

    # Evening periods (Afternoon maps here)
    evening_periods = [
        (time(13,0), time(14,0)),
        (time(14,0), time(15,0)),
        (time(15,0), time(16,0)),
        (time(16,0), time(17,0)),
        (time(17,0), time(18,0))
    ]

    # Determine period
    for idx, (start, end) in enumerate(morning_periods):
        if start <= current_time < end:
            return "Morning", idx+1

    for idx, (start, end) in enumerate(evening_periods):
        if start <= current_time < end:
            return "Afternoon", idx+1

    return None, None


def initialize_pending_attendance(conn, department, course, semester):
    cursor = conn.cursor(dictionary=True)

    shift, period = get_shift_and_period()
    if not shift:
        return

    # **CRUCIAL FIX**: map backend shift to DB shift
    db_shift = shift
    if shift == "Afternoon":
        db_shift = "Evening"  # query DB using Evening

    today_date = datetime.now().date()

    # Query timetable using mapped shift
    cursor.execute("""
        SELECT subject_code 
        FROM timetable
        WHERE course=%s
        AND semester=%s
        AND shift=%s
        AND period=%s
    """, (course, semester, db_shift, period))
    
    timetable = cursor.fetchone()
    if not timetable:
        print(f"No timetable found for DB shift: {db_shift}, period: {period}")
        return

    subject_code = timetable["subject_code"]

    # Get students
    cursor.execute("""
        SELECT regno, fullname
        FROM student
        WHERE department=%s AND course=%s AND semester=%s
    """, (department, course, semester))

    students = cursor.fetchall()

    for student in students:
        # Check if attendance already exists
        cursor.execute("""
            SELECT * FROM attendance
            WHERE regno=%s AND date=%s AND shift=%s AND period=%s
        """, (student["regno"], today_date, shift, period))

        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO attendance
                (regno, name, date, shift, period, status, department, course, semester, subject_code)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                student["regno"],
                student["fullname"],
                today_date,
                shift,  # store as Afternoon in attendance
                period,
                "pending",
                department,
                course,
                semester,
                subject_code
            ))

    conn.commit()
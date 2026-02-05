import mysql.connector

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host="localhost",
            user="root",
            password="akash2003",
            database="frams"
        )

        print("✅ MySQL Connected!")
        return connection

    except mysql.connector.Error as err:
        print("❌ Database Error:", err)
        return None

# Smart Attendance System 

A Modern, GPS-based smart attendance tracking application built with **React Native (Expo)** and **Supabase**. This app eliminates the need for manual roll calls or easily spoofed QR codes by requiring students to be physically present in the classroom to mark their attendance.

## Features 

* **Role-Based Access Control:** Separate interfaces and privileges for Students, Lecturers, and Administrators.
* **Smart GPS Check-in:** Uses geolocation to create a 50-meter "geofence" around the lecturer. Students can only check in if their device's GPS proves they are actually in the classroom.
* **Automatic Class Matching:** Students simply select their Academic Level and Semester during signup, and the app automatically filters and displays only the active sessions relevant to them.
* **Real-time Dashboards:** 
  * **Students** can view their real-time attendance rate and history.
  * **Lecturers** can view live rosters of who has checked into their sessions.
  * **Admins** can seamlessly create, edit, schedule, and assign classes to specific lecturers.

## Tech Stack 

* **Frontend:** React Native, Expo, Expo Router
* **Backend & Database:** Supabase (PostgreSQL)
* **Location Services:** `expo-location`, `geolib`

## How the Flow Works 

1. **Admin:** Creates a class (e.g., "CS 301") and assigns it to a Lecturer, Level, and Semester.
2. **Lecturer:** Walks into the classroom, opens the app, and taps "Start Session". The app saves their exact GPS coordinates to the cloud.
3. **Student:** Opens the app and taps "Check In". The app calculates the distance between the Student's GPS and the Lecturer's GPS. If they are within 50 meters, their attendance is officially recorded!

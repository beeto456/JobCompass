<div align="center">
  <!-- Replace this banner with a JobCompass screenshot when you have one hosted online -->
  <img width="800" alt="JobCompass App Screenshot" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# JobCompass

**[ Try out the Live App Here](https://jobcompass-191253016115.asia-southeast1.run.app/)**
**[📋 Share Your Feedback](https://docs.google.com/forms/d/e/1FAIpQLSf_bbLIGf424-sBJ1PQRQbwM15H3X4TYdQ2wmyVQ53-4s6Y-w/viewform)** </br>

## Overview

JobCompass is an interactive web application designed to help job seekers manage multiple job applications, track their application pipeline, organise important dates, and link tailored resumes to specific roles.

Originally conceptualised as a more focused alternative to fragmented spreadsheets, notes apps, calendar reminders, browser bookmarks, and scattered resume folders, JobCompass brings the core job search workflow into one centralised interface. It helps users track job applications, monitor application statuses, view upcoming milestones, and remember which resume version was used for each opportunity.

The app currently includes a pipeline overview dashboard, a status explorer, an interactive calendar, and a resume vault.

## The Challenge

Job hunting is inherently stressful, especially when managing multiple applications across different job portals, company websites, recruiters, and referral channels. Many job seekers use spreadsheets or notes apps to track where they applied, but these tools often become fragmented and difficult to maintain over time.

A job application is not just a status update. It may involve a job description, application date, interview date, follow-up date, assessment deadline, tailored resume, notes, and outcome. When these details are spread across different tools, job seekers may forget to follow up, lose track of which resume they submitted, or struggle to understand the overall state of their job search.

**Problem Statement:** How might we create a tool that helps job seekers track applications, manage important milestones, and organise tailored resumes in one clear and focused workflow?

## The Solution & Key Features

JobCompass was developed as a job search command centre for active job seekers. Instead of relying on multiple disconnected tools, users can manage their application pipeline, important dates, and resume variants from a single interface.

## Key Features

- **Job Tracking:** Manage job applications with details such as job title, company name, location, salary range, application date, current status, job posting link, interview information, follow-up date, and private notes.

- **Pipeline Overview:** View a high-level dashboard showing tracked opportunities, active applications, interview pipeline, job offers, pipeline distribution, and recent tracking entries.

- **Status Explorer:** Browse, search, filter, sort, and update job applications by status. Current statuses include Haven’t Applied, Applied, Awaiting Interview, Interviewing, Offered, Rejected, No Longer Interested, Ghosted, Assessment/Test, and Offer Negotiation.

- **Interactive Calendar:** Visualise job search activity by date, including application submissions, interviews, assessment deadlines, follow-up reminders, offer deadlines, and custom preparation tasks.

- **Resume Vault:** Upload and manage tailored resume versions in one place. Users can view uploaded resumes, download files, add notes and tags, and track which applications each resume is linked to.

- **Resume-to-Application Linking:** Link specific resume versions to specific job applications so users can remember which resume was submitted for each role.

- **Google Login & Cloud Sync:** Google login allows users to save job application data, resume records, and linked information to their account for persistent access across sessions.

- **Guest Mode:** Users can explore the app without signing in, but guest mode has limited functionality and does not support cloud sync or resume uploads.

- **QoL Features:** Includes date pickers, status dropdowns, search and filtering, sorting options, recent entries, light/dark mode, and clear dashboard actions.

## Limitations

- **Desktop-Optimized:** The UI is currently optimized for desktop. While it can be used on mobile, more testing will be needed to ensure a mobile-first experience.

- **Guest Mode Limitations:** Guest mode is useful for testing the app, but data may only be stored locally or temporarily. Resume upload, cloud sync, and cross-device access require Google login.

- **Early Product Stage:** JobCompass is currently an MVP/prototype and may require further usability testing, onboarding refinement, and mobile responsiveness improvements.

## Tech Stack

- **Front-end:** React, Vite, Tailwind CSS
- **Data Visualization:** Recharts
- **Backend / Database:** Firebase, Firestore
- **Authentication:** Google Login / Firebase Authentication
- **AI Integration:** Google AI Studio / Gemini API
- **Environment:** Node.js

---


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

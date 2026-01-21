# Product Requirements Document (PRD) - Agenda Shiatsu Ocyan

## 1. Introduction

### 1.1 Overview
"Agenda Shiatsu Ocyan" is a web application designed to manage the scheduling of Shiatsu massage sessions for the employees of Ocyan. The system aims to streamline the booking process, ensure fair access to the service (limiting sessions per week), and provide an administrative interface for the health team to manage schedules, view appointments, and generate reports.

### 1.2 Goals
*   **Simplify Scheduling:** Provide an easy-to-use interface for employees to book their sessions.
*   **Ensure Data Privacy:** Implement a "Privacy by Design" architecture to protect sensitive user data (CPF, health info).
*   **Optimize Management:** Allow the health team to easily manage availability, print attendance lists, and track usage.
*   **Enforce Rules:** Automatically enforce business rules like one session per week per employee.

## 2. Target Audience

*   **Employees (Integrantes):** Users who want to book, view, or cancel their Shiatsu sessions.
*   **Health Team (Admin):** Administrators responsible for managing the agendas, validating access, and generating reports.

## 3. Key Features

### 3.1 User Features (Integrantes)
*   **Home Page:** Landing page with access to Scheduling, Cancellation, and Rules.
*   **Booking Flow (Agendamento):**
    *   **Date & Time Selection:** View available days and time slots.
    *   **CPF Validation:** Secure validation of employee eligibility via CPF.
    *   **Confirmation:** Immediate confirmation of the booking.
*   **Cancellation Flow (Cancelamento):**
    *   **Search:** Find existing appointments using CPF.
    *   **Cancel:** Ability to cancel upcoming appointments.
*   **Rules & Guidelines:** Information about the service usage and policies.

### 3.2 Admin Features (Health Team)
*   **Secure Login:** Authentication for administrative access.
*   **Dashboard:** Overview of system status and quick stats.
*   **Agenda View:** Visual calendar of all appointments with details.
*   **Availability Management (Disponibilidade):**
    *   Configure working hours, session duration, and break times.
    *   Manage available dates (open/close specific days).
*   **User Management (CPFs Habilitados):**
    *   Manage the whitelist of eligible employees (CPFs).
    *   Privacy-focused storage (using hashes/encryption techniques).
*   **Attendance List (Lista de Presença):**
    *   Generate a printable PDF for daily signatures.
    *   Corporate design with Ocyan branding.
*   **Data Export:** Export appointment data to CSV/Excel for external analysis.
*   **Settings:** General system configuration.

## 4. Functional Requirements

### 4.1 Scheduling System
*   **FR-01:** The system must prevent booking on dates/times that are full or disabled.
*   **FR-02:** The system must enforce a limit of one booking per week per employee.
*   **FR-03:** Users must validate their identity using their CPF. The system should match the input CPF against a whitelist.

### 4.2 Data Privacy
*   **FR-04:** CPF data must not be exposed directly to the client side. Hashing or secure RPCs must be used for queries.
*   **FR-05:** Access to administrative features must be restricted to authenticated users.

### 4.3 Administration
*   **FR-06:** Admins must be able to define the daily schedule structure (Start time, End time, Duration, Lunch break).
*   **FR-07:** Admins must be able to view details of any appointment.
*   **FR-08:** The Attendance List printout must fit strictly on A4 paper and avoid cutting off content across pages.

## 5. Non-Functional Requirements

*   **NFR-01: Performance:** The booking slots must load quickly (under 2 seconds).
*   **NFR-02: Security:** All API endpoints related to sensitive actions must verify authorization or use secure tokens.
*   **NFR-03: UX/UI:** The interface should be responsive (mobile-friendly) and follow Ocyan's visual identity (professional, clean, corporate colors).
*   **NFR-04: Reliability:** The system should handle concurrent bookings gracefully to avoid double-booking.

## 6. Technical Architecture

*   **Frontend:**
    *   **Framework:** React (Vite)
    *   **Language:** TypeScript
    *   **Styling:** Tailwind CSS + Shadcn/UI
    *   **State Management:** React Hooks
*   **Backend:**
    *   **Platform:** Supabase (BaaS)
    *   **Database:** PostgreSQL
    *   **Logic:** Supabase Edge Functions (Deno/TypeScript) for secure business logic execution.
    *   **Auth:** Supabase Auth for Admin login.
*   **Security Strategy:**
    *   **Row Level Security (RLS):** Strict policies on Database tables.
    *   **RPC/Edge Functions:** Encapsulate complex queries to avoid exposing raw table access to the public client.

## 7. Data Models (High Level)

*   **`agendamentos`**: Stores appointment details (date, time, user identifier, status).
*   **`datas_disponiveis`**: Stores dates open for booking.
*   **`configuracoes_disponibilidade`**: Stores rules for time slots generation.
*   **`cpfs_habilitados`**: Stores the whitelist of allowed users (hashed/secure).
*   **`profiles`**: Admin user profiles.

## 8. User Flows

### 8.1 Booking
1.  User selects a date from the calendar.
2.  system displays available slots.
3.  User selects a slot.
4.  User enters CPF.
5.  System validates CPF and eligibility.
6.  User confirms.
7.  System saves appointment and shows success screen.

### 8.2 Cancellation
1.  User enters CPF.
2.  System retrieves active appointments for that CPF.
3.  User selects appointment to cancel.
4.  System processes cancellation and updates availability.

---
**Version:** 1.0
**Last Updated:** January 21, 2026
**Status:** Active Development

// ============================================================
// Course Registration — app logic
// Requires config.js (SUPABASE_URL, SUPABASE_ANON_KEY) loaded first.
// ============================================================

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isSignUpMode = false;
let currentUser = null;

// ----- DOM refs -----
const authScreen   = document.getElementById("auth-screen");
const appShell      = document.getElementById("app-shell");
const authForm      = document.getElementById("auth-form");
const authHeading   = document.getElementById("auth-heading");
const authSubmit    = document.getElementById("auth-submit");
const authError     = document.getElementById("auth-error");
const authToggleBtn = document.getElementById("auth-toggle-btn");
const authToggleTxt = document.getElementById("auth-toggle-text");
const nameFieldWrap = document.getElementById("name-field-wrap");
const nameField     = document.getElementById("name-field");
const emailField    = document.getElementById("email-field");
const passwordField = document.getElementById("password-field");

const whoName  = document.getElementById("who-name");
const whoEmail = document.getElementById("who-email");
const signOutBtn = document.getElementById("sign-out");

const navItems   = document.querySelectorAll(".nav-item");
const viewTitle  = document.getElementById("view-title");
const viewSub    = document.getElementById("view-subtitle");
const viewCatalogue = document.getElementById("view-catalogue");
const viewMine       = document.getElementById("view-mine");

const catalogueList  = document.getElementById("catalogue-list");
const catalogueEmpty = document.getElementById("catalogue-empty");
const mineList   = document.getElementById("mine-list");
const mineEmpty  = document.getElementById("mine-empty");
const mineCreditsEl = document.getElementById("mine-credits");

const toastEl = document.getElementById("toast");

// ----- Toast helper -----
let toastTimer = null;
function showToast(message, kind = "success") {
  toastEl.textContent = message;
  toastEl.className = `toast ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 3500);
}

// ----- Auth mode toggle -----
authToggleBtn.addEventListener("click", () => {
  isSignUpMode = !isSignUpMode;
  authError.classList.add("hidden");
  if (isSignUpMode) {
    authHeading.textContent = "Create your student account";
    authSubmit.textContent = "Create account";
    authToggleTxt.textContent = "Already registered?";
    authToggleBtn.textContent = "Sign in instead";
    nameFieldWrap.classList.remove("hidden");
    nameField.required = true;
  } else {
    authHeading.textContent = "Sign in to register for courses";
    authSubmit.textContent = "Sign in";
    authToggleTxt.textContent = "New here?";
    authToggleBtn.textContent = "Create an account";
    nameFieldWrap.classList.add("hidden");
    nameField.required = false;
  }
});

// ----- Auth submit -----
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.classList.add("hidden");
  authSubmit.disabled = true;
  authSubmit.textContent = isSignUpMode ? "Creating account…" : "Signing in…";

  const email = emailField.value.trim();
  const password = passwordField.value;

  try {
    if (isSignUpMode) {
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: nameField.value.trim() } },
      });
      if (error) throw error;
      showToast("Account created — you're signed in.");
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    authError.textContent = friendlyAuthError(err.message);
    authError.classList.remove("hidden");
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = isSignUpMode ? "Create account" : "Sign in";
  }
});

function friendlyAuthError(message) {
  if (/already registered/i.test(message)) return "That email already has an account. Try signing in instead.";
  if (/invalid login credentials/i.test(message)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(message)) return "Check your inbox to confirm your email before signing in.";
  return message;
}

// ----- Sign out -----
signOutBtn.addEventListener("click", async () => {
  await sb.auth.signOut();
});

// ----- Session handling -----
sb.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    currentUser = session.user;
    enterApp();
  } else {
    currentUser = null;
    authScreen.classList.remove("hidden");
    appShell.classList.add("hidden");
    authForm.reset();
  }
});

async function enterApp() {
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");

  const fullName = currentUser.user_metadata?.full_name;
  whoName.textContent = fullName && fullName.length ? fullName : "Student";
  whoEmail.textContent = currentUser.email;

  await Promise.all([loadCatalogue(), loadMyRegistrations()]);
}

// ----- Navigation -----
navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    navItems.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const view = btn.dataset.view;

    if (view === "catalogue") {
      viewTitle.textContent = "Course catalogue";
      viewSub.textContent = "Browse open courses and register for the term.";
      viewCatalogue.classList.remove("hidden");
      viewMine.classList.add("hidden");
      loadCatalogue();
    } else {
      viewTitle.textContent = "My registrations";
      viewSub.textContent = "Courses you're currently registered for.";
      viewMine.classList.remove("hidden");
      viewCatalogue.classList.add("hidden");
      loadMyRegistrations();
    }
  });
});

// ----- Data: catalogue -----
let myRegisteredCourseIds = new Set();

async function loadCatalogue() {
  const { data: courses, error: courseErr } = await sb
    .from("courses_with_seats")
    .select("*")
    .order("code", { ascending: true });

  const { data: myRegs, error: regErr } = await sb
    .from("registrations")
    .select("course_id")
    .eq("student_id", currentUser.id);

  if (courseErr) { showToast(courseErr.message, "error"); return; }
  if (regErr) { showToast(regErr.message, "error"); return; }

  myRegisteredCourseIds = new Set((myRegs || []).map((r) => r.course_id));
  renderCatalogue(courses || []);
}

function renderCatalogue(courses) {
  catalogueList.innerHTML = "";

  if (!courses.length) {
    catalogueEmpty.classList.remove("hidden");
    return;
  }
  catalogueEmpty.classList.add("hidden");

  courses.forEach((course) => {
    const seatsLeft = course.seats_left;
    const alreadyIn = myRegisteredCourseIds.has(course.id);
    const isFull = seatsLeft <= 0;

    const card = document.createElement("div");
    card.className = "course-card";

    const seatsClass = seatsLeft <= 3 && seatsLeft > 0 ? "seats low" : seatsLeft <= 0 ? "seats low" : "seats";
    const seatsLabel = isFull ? "No seats left" : `${seatsLeft} of ${course.capacity} seats open`;

    let actionHtml;
    if (alreadyIn) {
      actionHtml = `<button class="btn btn-small btn-ghost" disabled>Registered</button>`;
    } else if (isFull) {
      actionHtml = `<button class="btn btn-small btn-ghost" disabled>Full</button>`;
    } else {
      actionHtml = `<button class="btn btn-small btn-outline" data-register="${course.id}">Register</button>`;
    }

    card.innerHTML = `
      <div class="course-card-top">
        <span class="course-code">${escapeHtml(course.code)}</span>
        <span class="course-credits">${course.credits} credits</span>
      </div>
      <div class="course-title">${escapeHtml(course.title)}</div>
      <div class="course-instructor">${escapeHtml(course.instructor)}</div>
      <div class="course-card-bottom">
        <span class="${seatsClass}">${seatsLabel}</span>
        ${actionHtml}
      </div>
    `;
    catalogueList.appendChild(card);
  });

  catalogueList.querySelectorAll("[data-register]").forEach((btn) => {
    btn.addEventListener("click", () => registerForCourse(btn.dataset.register, btn));
  });
}

async function registerForCourse(courseId, btn) {
  btn.disabled = true;
  btn.textContent = "Registering…";

  const { error } = await sb
    .from("registrations")
    .insert({ student_id: currentUser.id, course_id: courseId });

  if (error) {
    showToast(error.message.includes("duplicate") ? "You're already registered for this course." : error.message, "error");
    btn.disabled = false;
    btn.textContent = "Register";
    return;
  }

  showToast("You're registered.");
  await Promise.all([loadCatalogue(), loadMyRegistrations()]);
}

// ----- Data: my registrations -----
async function loadMyRegistrations() {
  const { data, error } = await sb
    .from("registrations")
    .select("id, course_id, courses(code, title, instructor, credits)")
    .eq("student_id", currentUser.id)
    .order("registered_at", { ascending: true });

  if (error) { showToast(error.message, "error"); return; }
  renderMine(data || []);
}

function renderMine(regs) {
  mineList.innerHTML = "";

  if (!regs.length) {
    mineEmpty.classList.remove("hidden");
    mineCreditsEl.classList.add("hidden");
    document.querySelector(".reg-table").classList.add("hidden");
    return;
  }
  mineEmpty.classList.add("hidden");
  document.querySelector(".reg-table").classList.remove("hidden");

  let totalCredits = 0;

  regs.forEach((reg) => {
    const c = reg.courses;
    totalCredits += c.credits;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(c.code)}</td>
      <td>${escapeHtml(c.title)}</td>
      <td>${escapeHtml(c.instructor)}</td>
      <td>${c.credits}</td>
      <td><button class="btn btn-small btn-danger-outline" data-drop="${reg.id}">Drop</button></td>
    `;
    mineList.appendChild(row);
  });

  mineCreditsEl.textContent = `${regs.length} course${regs.length === 1 ? "" : "s"} · ${totalCredits} total credits`;
  mineCreditsEl.classList.remove("hidden");

  mineList.querySelectorAll("[data-drop]").forEach((btn) => {
    btn.addEventListener("click", () => dropRegistration(btn.dataset.drop, btn));
  });
}

async function dropRegistration(regId, btn) {
  btn.disabled = true;
  btn.textContent = "Dropping…";

  const { error } = await sb.from("registrations").delete().eq("id", regId);

  if (error) {
    showToast(error.message, "error");
    btn.disabled = false;
    btn.textContent = "Drop";
    return;
  }

  showToast("Course dropped.");
  await Promise.all([loadCatalogue(), loadMyRegistrations()]);
}

// ----- Utility -----
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

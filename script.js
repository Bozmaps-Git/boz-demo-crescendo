/* ============================================================
   Crescendo Music Tuition — script.js
   Vanilla JS. No dependencies.
   ============================================================ */
(function () {
  "use strict";
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };

  /* ---------- Footer year ---------- */
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Mobile nav ---------- */
  var navToggle = $("#navToggle");
  var primaryNav = $("#primaryNav");
  if (navToggle && primaryNav) {
    var setNav = function (open) {
      primaryNav.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    navToggle.addEventListener("click", function () {
      setNav(primaryNav.classList.contains("open") === false);
    });
    // Close on link click (mobile)
    $$("a", primaryNav).forEach(function (a) {
      a.addEventListener("click", function () { setNav(false); });
    });
    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && primaryNav.classList.contains("open")) {
        setNav(false); navToggle.focus();
      }
    });
  }

  /* ============================================================
     FEATURE A — Subject tabs
     ============================================================ */
  var subjectTabs = $$(".subject-tab");
  var subjectPanels = $$(".subject-panel");
  function activateSubject(tab) {
    var subject = tab.getAttribute("data-subject");
    subjectTabs.forEach(function (t) {
      var active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
      t.tabIndex = active ? 0 : -1;
    });
    subjectPanels.forEach(function (p) {
      var match = p.id === "panel-" + subject;
      p.classList.toggle("is-active", match);
      if (match) { p.hidden = false; } else { p.hidden = true; }
    });
  }
  subjectTabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { activateSubject(tab); });
    tab.addEventListener("keydown", function (e) {
      var idx = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") idx = (i + 1) % subjectTabs.length;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") idx = (i - 1 + subjectTabs.length) % subjectTabs.length;
      if (idx !== null) { e.preventDefault(); subjectTabs[idx].focus(); activateSubject(subjectTabs[idx]); }
    });
  });

  /* ============================================================
     FEATURE B — Lesson scheduler
     ============================================================ */
  // Availability per day: time -> available(boolean)
  var availability = {
    Tue: [["15:30", true], ["16:15", false], ["17:00", true], ["17:45", true], ["18:30", false], ["19:15", true]],
    Wed: [["15:30", true], ["16:15", true], ["17:00", false], ["17:45", true], ["18:30", true], ["19:15", false]],
    Thu: [["15:30", false], ["16:15", true], ["17:00", true], ["17:45", false], ["18:30", true], ["19:15", true]],
    Fri: [["15:30", true], ["16:15", true], ["17:00", true], ["17:45", false], ["18:30", false], ["19:15", true]],
    Sat: [["09:00", true], ["09:45", false], ["10:30", true], ["11:15", true], ["12:00", true], ["12:45", false]]
  };
  var dayNames = { Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" };
  var slotGrid = $("#slotGrid");
  var dayBtns = $$(".day-btn");
  var slotSelection = $("#slotSelection");
  var confirmSlot = $("#confirmSlot");
  var schedulerSuccess = $("#schedulerSuccess");
  var schedulerSuccessMsg = $("#schedulerSuccessMsg");
  var schedulerReset = $("#schedulerReset");
  var current = { day: "Tue", time: null };

  function renderSlots(day) {
    if (!slotGrid) return;
    current.day = day;
    current.time = null;
    slotGrid.innerHTML = "";
    availability[day].forEach(function (s) {
      var time = s[0], free = s[1];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot";
      btn.innerHTML = time + "<small>" + (free ? "available" : "booked") + "</small>";
      if (!free) {
        btn.disabled = true;
        btn.setAttribute("aria-label", time + " — already booked");
      } else {
        btn.setAttribute("aria-label", time + " on " + dayNames[day] + " — available");
        btn.addEventListener("click", function () {
          $$(".slot", slotGrid).forEach(function (b) { b.classList.remove("is-selected"); });
          btn.classList.add("is-selected");
          current.time = time;
          slotSelection.textContent = "Selected: " + dayNames[day] + " at " + time;
          confirmSlot.disabled = false;
        });
      }
      slotGrid.appendChild(btn);
    });
    slotSelection.textContent = "No slot selected yet.";
    confirmSlot.disabled = true;
  }

  dayBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      dayBtns.forEach(function (x) { x.classList.remove("is-active"); x.setAttribute("aria-selected", "false"); });
      b.classList.add("is-active"); b.setAttribute("aria-selected", "true");
      renderSlots(b.getAttribute("data-day"));
    });
  });

  if (confirmSlot) {
    confirmSlot.addEventListener("click", function () {
      if (!current.time) return;
      schedulerSuccessMsg.textContent =
        "Lovely — your request for " + dayNames[current.day] + " at " + current.time +
        " has been noted. In a live site this would notify Eleanor, who'd confirm within one working day.";
      $(".day-picker").hidden = true;
      slotGrid.hidden = true;
      $(".scheduler-foot").hidden = true;
      schedulerSuccess.hidden = false;
      schedulerSuccess.focus && schedulerSuccess.focus();
    });
  }
  if (schedulerReset) {
    schedulerReset.addEventListener("click", function () {
      schedulerSuccess.hidden = true;
      $(".day-picker").hidden = false;
      slotGrid.hidden = false;
      $(".scheduler-foot").hidden = false;
      renderSlots(current.day);
    });
  }
  renderSlots("Tue");

  /* ============================================================
     FEATURE C — Block-booking estimator + validated form
     ============================================================ */
  var blockForm = $("#blockForm");
  var estimateValue = $("#estimateValue");
  var estimateSub = $("#estimateSub");
  var DISCOUNT = 0.05;

  function recalcEstimate() {
    if (!blockForm) return;
    var perLesson = parseFloat($("#bf-lesson").value);
    var perWeek = parseInt($("#bf-perweek").value, 10);
    var weeks = parseInt($("#bf-term").value, 10);
    var lessons = perWeek * weeks;
    var gross = perLesson * lessons;
    var net = gross * (1 - DISCOUNT);
    estimateValue.textContent = "£" + net.toFixed(2);
    estimateSub.textContent = lessons + " lesson" + (lessons === 1 ? "" : "s") +
      " · 5% block discount applied (saves £" + (gross - net).toFixed(2) + ")";
  }
  if (blockForm) {
    ["bf-lesson", "bf-perweek", "bf-term"].forEach(function (id) {
      var el = $("#" + id);
      if (el) el.addEventListener("change", recalcEstimate);
    });
    recalcEstimate();
  }

  /* ---------- Generic validation helpers ---------- */
  function showError(input, msg) {
    var field = input.closest(".field");
    field.classList.add("invalid");
    input.setAttribute("aria-invalid", "true");
    var err = field.querySelector(".error-msg");
    if (err) err.textContent = msg;
  }
  function clearError(input) {
    var field = input.closest(".field");
    field.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
    var err = field.querySelector(".error-msg");
    if (err) err.textContent = "";
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function validateForm(form, rules) {
    var ok = true, firstBad = null;
    rules.forEach(function (r) {
      var input = $("#" + r.id, form);
      if (!input) return;
      var v = input.value.trim();
      var bad = false, msg = "";
      if (r.required && !v) { bad = true; msg = r.label + " is required."; }
      else if (r.email && v && !validEmail(v)) { bad = true; msg = "Please enter a valid email address."; }
      if (bad) { ok = false; showError(input, msg); if (!firstBad) firstBad = input; }
      else clearError(input);
    });
    if (firstBad) firstBad.focus();
    return ok;
  }
  // Live-clear errors on input
  $$("input, textarea, select").forEach(function (el) {
    el.addEventListener("input", function () {
      if (el.closest(".field") && el.closest(".field").classList.contains("invalid")) clearError(el);
    });
  });

  if (blockForm) {
    blockForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = validateForm(blockForm, [
        { id: "bf-name", label: "Name", required: true },
        { id: "bf-email", label: "Email", required: true, email: true }
      ]);
      if (!ok) return;
      var msgEl = $("#blockSuccess");
      msgEl.textContent = "Thanks " + $("#bf-name", blockForm).value.trim().split(" ")[0] +
        "! Your block request (" + estimateValue.textContent + ") has been received. I'll email you to confirm days and times. (Demo — no message actually sent.)";
      msgEl.hidden = false;
      blockForm.reset();
      recalcEstimate();
      msgEl.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* ---------- Contact form ---------- */
  var contactForm = $("#contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = validateForm(contactForm, [
        { id: "cf-name", label: "Name", required: true },
        { id: "cf-email", label: "Email", required: true, email: true },
        { id: "cf-message", label: "Message", required: true }
      ]);
      if (!ok) return;
      var msgEl = $("#contactSuccess");
      msgEl.textContent = "Thank you " + $("#cf-name", contactForm).value.trim().split(" ")[0] +
        "! Your message is on its way. I'll be in touch within one working day to arrange your free taster. (Demo — no message actually sent.)";
      msgEl.hidden = false;
      contactForm.reset();
      msgEl.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* ============================================================
     FEATURE D — Testimonials with star ratings
     ============================================================ */
  var testimonials = [
    { name: "Sarah M.", role: "Parent of Lily, age 9 (piano)", rating: 5, text: "Lily counts down the days to her piano lesson. Eleanor is endlessly patient and somehow makes the practice feel like play. She's gone from nervous to performing in the school assembly in under a year." },
    { name: "James T.", role: "Adult learner (guitar)", rating: 5, text: "I'd wanted to play guitar for 30 years and finally took the plunge at 52. Eleanor never made me feel silly for being a beginner. I'm now playing songs at family gatherings — couldn't recommend her more." },
    { name: "Priya K.", role: "Parent of Aarav, age 12 (violin)", rating: 5, text: "Aarav passed his Grade 4 violin with distinction. The exam prep was thorough but never stressful. Brilliant, calm teacher who clearly loves what she does." },
    { name: "Megan R.", role: "A-Level music student (theory)", rating: 5, text: "Eleanor untangled music theory for me when nothing in class was clicking. Her explanations just make sense. My grades jumped two levels in a term." },
    { name: "David & Claire", role: "Parents of twins, age 7 (piano)", rating: 4, text: "Teaching two energetic seven-year-olds is no small feat, but Eleanor keeps both engaged with games and little challenges. Lovely studio and always punctual." },
    { name: "Olivia H.", role: "Adult learner (singing)", rating: 5, text: "I joined a community choir and wanted to build confidence. After a few months of singing lessons I actually enjoy hearing my own voice. Warm, encouraging and genuinely fun sessions." }
  ];
  var testiGrid = $("#testiGrid");
  function starRow(rating) {
    var html = '<div class="stars" role="img" aria-label="' + rating + ' out of 5 stars">';
    for (var i = 1; i <= 5; i++) {
      html += '<span class="' + (i <= rating ? "" : "empty") + '" aria-hidden="true">★</span>';
    }
    return html + "</div>";
  }
  if (testiGrid) {
    testimonials.forEach(function (t) {
      var initials = t.name.split(/[ &]+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
      var card = document.createElement("figure");
      card.className = "testi-card reveal";
      card.innerHTML =
        starRow(t.rating) +
        "<blockquote>" + t.text + "</blockquote>" +
        '<figcaption class="testi-meta">' +
        '<span class="testi-avatar" aria-hidden="true">' + initials + "</span>" +
        "<span><span class='testi-name'>" + t.name + "</span><br>" +
        "<span class='testi-role'>" + t.role + "</span></span>" +
        "</figcaption>";
      testiGrid.appendChild(card);
    });
  }

  /* ============================================================
     FEATURE E — FAQ accordion
     ============================================================ */
  var faqs = [
    { q: "How old does my child need to be to start lessons?", a: "Most children are ready for structured lessons from around age 6 or 7, but I teach all ages from 5 to 90+. For very young learners I keep lessons short, playful and game-based to build a love of music first." },
    { q: "Do I need my own instrument at home?", a: "For piano and guitar you'll need an instrument to practise on at home — a basic keyboard or acoustic guitar is fine to start. I'm happy to advise on affordable beginner instruments before you buy. The studio is fully equipped for lessons themselves." },
    { q: "Do you prepare students for graded exams?", a: "Yes. I prepare students for ABRSM and Trinity College London graded exams from Initial to Grade 8, including theory. Exams are completely optional — many of my students learn purely for the joy of it." },
    { q: "Are you DBS checked and insured?", a: "Yes. I hold an Enhanced DBS certificate (renewed annually and on the Update Service), I'm a full member of the Musicians' Union, and I carry public liability insurance. Parents are always welcome to sit in." },
    { q: "How much practice is expected between lessons?", a: "It depends on age and goals, but little and often beats one long cram. For most beginners, 10–15 minutes a few times a week makes a big difference. I'll always set realistic, achievable goals." },
    { q: "What happens if we need to cancel a lesson?", a: "I ask for at least 24 hours' notice to rearrange a lesson within the same term where possible. Lessons cancelled with less notice can't usually be refunded, but I'll always do my best to find a make-up slot." }
  ];
  var faqList = $("#faqList");
  if (faqList) {
    faqs.forEach(function (f, i) {
      var item = document.createElement("div");
      item.className = "faq-item";
      var qid = "faq-q-" + i, aid = "faq-a-" + i;
      item.innerHTML =
        '<h4 style="margin:0;"><button class="faq-q" id="' + qid + '" aria-expanded="false" aria-controls="' + aid + '">' +
        "<span>" + f.q + "</span><span class='faq-icon' aria-hidden='true'></span></button></h4>" +
        '<div class="faq-a" id="' + aid + '" role="region" aria-labelledby="' + qid + '"><div class="faq-a-inner">' + f.a + "</div></div>";
      faqList.appendChild(item);
    });
    $$(".faq-q", faqList).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var expanded = btn.getAttribute("aria-expanded") === "true";
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        btn.setAttribute("aria-expanded", String(!expanded));
        if (expanded) {
          panel.style.maxHeight = null;
        } else {
          panel.style.maxHeight = panel.scrollHeight + "px";
        }
      });
    });
  }

  /* ============================================================
     Scroll reveal (respects reduced motion)
     ============================================================ */
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function initReveal() {
    var els = $$(".reveal");
    if (prefersReduced || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }
  // run after dynamic cards added
  initReveal();

  /* ---------- Active nav link on scroll ---------- */
  var sections = $$("main section[id]");
  var navLinks = $$('.primary-nav a[href^="#"]');
  if ("IntersectionObserver" in window && navLinks.length) {
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (l) {
            l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id);
          });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { navIO.observe(s); });
  }
})();

/* script.js
   - Keeps app logic separated from HTML
   - Comments explain each function for a fresher developer
*/

/* -------------------------
   State + small helpers
   ------------------------- */
// store the user's latest inputs
const form = {};

// shortcut to get element by id
const $ = id => document.getElementById(id);

// show a step by id (simple navigation)
function showStep(stepId) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const elm = $(stepId);
  if (elm) elm.classList.add('active');
}

/* -------------------------
   Wire UI event listeners on DOM ready
   ------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Step 1 next
  document.getElementById('next1').addEventListener('click', () => {
    // read and validate name, age and gender
    const name = $('name').value.trim();
    const age = parseInt($('age').value, 10);
    const gender = document.querySelector('input[name="gender"]:checked').value;
    if (!name || !age || age <= 0) {
      alert('Please enter a valid name and age.');
      return;
    }
    form.name = name;
    form.age = age;
    form.gender = gender;
    showStep('step2');
  });

  // Step 2 back and next
  document.getElementById('back2').addEventListener('click', () => showStep('step1'));
  document.getElementById('next2').addEventListener('click', () => {
    // read and validate height, weight and BP
    const height = parseFloat($('height').value);
    const weight = parseFloat($('weight').value);
    const bp_s = parseInt($('bp_s').value, 10);
    const bp_d = parseInt($('bp_d').value, 10);

    if (!height || !weight || height <= 0 || weight <= 0) {
      alert('Please enter height and weight.');
      return;
    }
    form.height = height;
    form.weight = weight;
    form.bp_s = isNaN(bp_s) ? null : bp_s;
    form.bp_d = isNaN(bp_d) ? null : bp_d;

    showStep('step3');
  });

  // Step 3 back and submit
  document.getElementById('back3').addEventListener('click', () => showStep('step2'));
  document.getElementById('submitBtn').addEventListener('click', () => {
    // read disease info and compute
    const hasDisease = document.querySelector('input[name="hasDisease"]:checked').value === 'yes';
    const diseaseText = $('disease_text').value.trim();
    form.hasDisease = hasDisease;
    form.diseaseText = diseaseText;
    computeAndShowResult();
  });

  // history controls
  document.getElementById('clearHistory').addEventListener('click', clearHistory);
  document.getElementById('showHistory').addEventListener('click', renderHistory);

  // render existing history on load
  renderHistory();
});

/* -------------------------
   Health calculation functions
   ------------------------- */

// calculate BMI from kg and cm
function calcBMI(weightKg, heightCm) {
  const h = heightCm / 100;
  if (!h) return null;
  return weightKg / (h * h);
}

// body fat simple estimate (non-clinical)
function estimateBodyFat(bmi, age, gender) {
  if (gender === 'male') return 1.20 * bmi + 0.23 * age - 16.2;
  return 1.20 * bmi + 0.23 * age - 5.4;
}

// simple blood pressure classification
function classifyBP(s, d) {
  if (s == null || d == null) return { stage: 'unknown', label: 'BP not provided' };
  if (s < 120 && d < 80) return { stage: 'normal', label: 'Normal' };
  if (s < 130 && d < 80) return { stage: 'elevated', label: 'Elevated' };
  if ((s >= 130 && s < 140) || (d >= 80 && d < 90)) return { stage: 'stage1', label: 'Hypertension stage 1' };
  if (s >= 140 || d >= 90) return { stage: 'stage2', label: 'Hypertension stage 2' };
  return { stage: 'unknown', label: 'Unknown' };
}

// decide overall status from inputs
function classifyHealth({ bmi, bpClass, hasDisease, diseaseText, age }) {
  let status = 'Normal';
  let reason = [];

  if (bmi >= 30) {
    status = 'Critical';
    reason.push('BMI in obese range');
  } else if (bmi >= 25) {
    if (status !== 'Critical') status = 'Needs Attention';
    reason.push('BMI overweight');
  }

  if (bpClass.stage === 'stage2') {
    status = 'Critical';
    reason.push('High blood pressure (stage 2)');
  } else if (bpClass.stage === 'stage1' || bpClass.stage === 'elevated') {
    if (status !== 'Critical') status = 'Needs Attention';
    reason.push('Elevated blood pressure');
  }

  if (hasDisease && diseaseText) {
    if (status !== 'Critical') status = 'Needs Attention';
    reason.push('Reported health condition: ' + diseaseText);
  }

  if (age >= 65 && status === 'Normal') {
    status = 'Needs Attention';
    reason.push('Age ≥ 65');
  }

  if (reason.length === 0) reason.push('No immediate flags from input');

  return { status, reason };
}

// protein estimate (0.8 g/kg)
function estimateProtein(weightKg) {
  return (0.8 * weightKg);
}

// water estimate (35 ml per kg)
function estimateWaterLiters(weightKg) {
  const ml = 35 * weightKg;
  return ml / 1000;
}

// basic BMR (Mifflin-St Jeor) + sedentary maintenance
function estimateCalories(weightKg, heightCm, age, gender) {
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  const maintenance = Math.round(bmr * 1.2);
  return { bmr: Math.round(bmr), maintenance };
}

// ideal weight for BMI 18.5 - 24.9
function idealWeightRange(heightCm) {
  const h = heightCm / 100;
  const min = 18.5 * h * h;
  const max = 24.9 * h * h;
  return { min: min, max: max };
}

/* -------------------------
   Compute & render result
   ------------------------- */
function computeAndShowResult() {
  const bmi = calcBMI(form.weight, form.height);
  if (!bmi || !isFinite(bmi)) {
    alert('Invalid height or weight.');
    return;
  }
  const bf = estimateBodyFat(bmi, form.age, form.gender);
  const bpClass = classifyBP(form.bp_s, form.bp_d);
  const health = classifyHealth({ bmi, bpClass, hasDisease: form.hasDisease, diseaseText: form.diseaseText, age: form.age });

  const protein = estimateProtein(form.weight);
  const water = estimateWaterLiters(form.weight);
  const calories = estimateCalories(form.weight, form.height, form.age, form.gender);
  const ideal = idealWeightRange(form.height);

  const lines = [];
  lines.push(`<strong>Hello, ${escapeHtml(form.name || 'Friend')}!</strong>`);
  lines.push(`<strong>Overall status:</strong> <span style="text-transform:uppercase">${health.status}</span>`);
  lines.push(`<em>${health.reason.join('; ')}</em>`);
  lines.push(`<hr>`);
  lines.push(`<strong>BMI:</strong> ${bmi.toFixed(1)} (ideal 18.5 - 24.9)`);
  lines.push(`<strong>Estimated body fat:</strong> ${bf.toFixed(1)}% (approx)`);
  lines.push(`<strong>Ideal weight range:</strong> ${ideal.min.toFixed(1)} kg - ${ideal.max.toFixed(1)} kg`);
  lines.push(`<strong>Blood pressure:</strong> ${form.bp_s && form.bp_d ? `${form.bp_s}/${form.bp_d} mmHg — ${bpClass.label}` : 'Not provided'}`);
  lines.push(`<hr>`);
  lines.push(`<strong>Daily suggestions (general):</strong>`);
  lines.push(`<ul>
    <li>Calories (est. maintenance): <span class="kbd">${calories.maintenance}</span> kcal/day (estimated)</li>
    <li>Protein: ~ <span class="kbd">${protein.toFixed(0)} g</span> per day (about 0.8 g/kg)</li>
    <li>Water: ~ <span class="kbd">${water.toFixed(1)}</span> L/day (estimate)</li>
    <li>Sleep: aim for <span class="kbd">7-9 hours</span> per night</li>
    <li>Include foods rich in <strong>iron, calcium, vitamin D, potassium, magnesium</strong> (fruits, vegetables, dairy or fortified alternatives, legumes, nuts)</li>
  </ul>`);
  lines.push(`<strong>Diet tips:</strong> Prefer whole grains, lean protein, vegetables, fruit; reduce processed and sugary foods.`);
  lines.push(`<strong>Exercise tips:</strong> At least 150 minutes moderate activity / week (e.g. brisk walk), plus strength 2x/week — adapt to ability.`);

  if (health.status === 'Critical') {
    lines.push(`<hr><strong style="color:#a00">Important:</strong> Based on your inputs we recommend contacting a healthcare professional. This tool is not a substitute for medical advice.`);
  } else if (health.status === 'Needs Attention') {
    lines.push(`<hr><strong>Note:</strong> Consider lifestyle changes and periodic check-ups. If you have symptoms, see a doctor.`);
  } else {
    lines.push(`<hr><strong>Good:</strong> Keep healthy habits and monitor periodically.`);
  }

  $('resultBox').innerHTML = lines.join('<br>');
  $('resultArea').style.display = 'block';

  saveHistory({
    timestamp: new Date().toISOString(),
    name: form.name,
    age: form.age,
    gender: form.gender,
    bmi: bmi.toFixed(1),
    status: health.status,
    bp: form.bp_s && form.bp_d ? `${form.bp_s}/${form.bp_d}` : null
  });

  renderHistory();
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
}

/* -------------------------
   localStorage history helpers
   ------------------------- */
function getHistory() {
  try {
    const raw = localStorage.getItem('healthHistory');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}
function saveHistory(entry) {
  const arr = getHistory();
  arr.unshift(entry); // newest first
  const trimmed = arr.slice(0, 20);
  localStorage.setItem('healthHistory', JSON.stringify(trimmed));
}
function clearHistory() {
  if (!confirm('Clear saved history?')) return;
  localStorage.removeItem('healthHistory');
  renderHistory();
}
function renderHistory() {
  const list = getHistory();
  const out = $('historyList');
  out.innerHTML = '';
  if (!list.length) {
    out.innerHTML = '<div style="color:#666;font-size:13px;padding:8px">No history yet. Submissions will appear here.</div>';
    return;
  }
  list.forEach(it => {
    const d = new Date(it.timestamp);
    const html = `<div class="history-item">
      <div><strong>${escapeHtml(it.name || '—')}</strong> • ${it.age} y • ${escapeHtml(it.gender||'—')} • <em>${escapeHtml(it.status)}</em></div>
      <div style="font-size:12px;color:#555;margin-top:6px;">BMI: ${it.bmi || '—'} • BP: ${it.bp || '—'}</div>
      <div style="font-size:11px;color:#777;margin-top:6px;">${d.toLocaleString()}</div>
    </div>`;
    out.insertAdjacentHTML('beforeend', html);
  });
}

// small utility to avoid XSS in inserted text
function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

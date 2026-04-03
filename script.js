const domainInput = document.getElementById("domainInput");
const checkBtn = document.getElementById("checkBtn");
const clearBtn = document.getElementById("clearBtn");
const loadingBox = document.getElementById("loadingBox");
const messageBox = document.getElementById("messageBox");
const resultsBody = document.getElementById("resultsBody");

function showLoading(show) {
  loadingBox.classList.toggle("hidden", !show);
}

function showMessage(text) {
  messageBox.textContent = text;
  messageBox.classList.remove("hidden");
}

function hideMessage() {
  messageBox.classList.add("hidden");
  messageBox.textContent = "";
}

function normalizeDomain(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .trim();
}

function isValidDomain(domain) {
  const regex = /^(?!-)([a-z0-9-]+\.)+[a-z]{2,}$/i;
  return regex.test(domain);
}

function getStatusBadge(status) {
  if (status === "AMAN / DAPAT DIAKSES") {
    return `<span class="status-badge status-ok">${status}</span>`;
  }

  if (status === "TERINDIKASI TERBLOKIR / BERMASALAH") {
    return `<span class="status-badge status-warn">${status}</span>`;
  }

  if (status === "FORMAT TIDAK VALID") {
    return `<span class="status-badge status-invalid">${status}</span>`;
  }

  return `<span class="status-badge status-bad">${status}</span>`;
}

function renderResults(results) {
  if (!results.length) {
    resultsBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="3">Belum ada pemeriksaan dilakukan.</td>
      </tr>
    `;
    return;
  }

  resultsBody.innerHTML = results.map(item => `
    <tr>
      <td>${item.domain}</td>
      <td>${getStatusBadge(item.status)}</td>
      <td>${item.detail}</td>
    </tr>
  `).join("");
}

clearBtn.addEventListener("click", () => {
  domainInput.value = "";
  hideMessage();
  renderResults([]);
});

checkBtn.addEventListener("click", async () => {
  hideMessage();

  const rawInput = domainInput.value.trim();

  if (!rawInput) {
    showMessage("Silakan masukkan minimal 1 domain atau URL.");
    return;
  }

  let lines = rawInput
    .split(/\r?\n/)
    .map(line => normalizeDomain(line))
    .filter(Boolean);

  if (lines.length > 5) {
    showMessage("Maksimal hanya 5 domain / URL per pemeriksaan.");
    return;
  }

  const uniqueDomains = [...new Set(lines)];

  showLoading(true);

  try {
    const results = [];

    for (const domain of uniqueDomains) {
      if (!isValidDomain(domain)) {
        results.push({
          domain,
          status: "FORMAT TIDAK VALID",
          detail: "Domain tidak sesuai format standar."
        });
        continue;
      }

      try {
        const res = await fetch(`/api/check?domain=${encodeURIComponent(domain)}`);
        const data = await res.json();

        results.push({
          domain,
          status: data.status || "ERROR / TIDAK DAPAT DIAKSES",
          detail: data.detail || "Tidak ada detail tambahan."
        });
      } catch (err) {
        results.push({
          domain,
          status: "ERROR / TIDAK DAPAT DIAKSES",
          detail: "Gagal terhubung ke layanan pemeriksaan."
        });
      }
    }

    renderResults(results);
  } catch (err) {
    showMessage("Terjadi kesalahan saat memproses pemeriksaan.");
  } finally {
    showLoading(false);
  }
});

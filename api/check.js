check.js
export default async function handler(req, res) {
  try {
    const domain = (req.query.domain || "").trim().toLowerCase();

    const domainRegex = /^(?!-)([a-z0-9-]+\.)+[a-z]{2,}$/i;
    if (!domain || !domainRegex.test(domain)) {
      return res.status(400).json({
        status: "FORMAT TIDAK VALID",
        detail: "Masukkan domain yang valid. Contoh: example.com"
      });
    }

    let dnsOk = false;
    let httpOk = false;
    let detailNotes = [];

    // 1) DNS CHECK
    try {
      const dnsRes = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
      const dnsJson = await dnsRes.json();

      if (dnsJson.Answer && dnsJson.Answer.length > 0) {
        dnsOk = true;
        detailNotes.push("DNS resolve berhasil.");
      } else {
        detailNotes.push("DNS resolve tidak memberikan jawaban.");
      }
    } catch (err) {
      detailNotes.push("Pemeriksaan DNS gagal.");
    }

    // 2) HTTPS CHECK
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(`https://${domain}`, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "PIKAT4D-Link-Checker/1.0"
        }
      });

      clearTimeout(timeout);

      if (response.status >= 200 && response.status < 500) {
        httpOk = true;
        detailNotes.push(`HTTPS merespons dengan status ${response.status}.`);
      } else {
        detailNotes.push(`HTTPS merespons dengan status ${response.status}.`);
      }
    } catch (err) {
      detailNotes.push("HTTPS tidak merespons / timeout.");
    }

    let status = "ERROR / TIDAK DAPAT DIAKSES";
    let detail = "Domain tidak dapat diakses.";

    if (dnsOk && httpOk) {
      status = "AMAN / DAPAT DIAKSES";
      detail = "Domain berhasil di-resolve dan merespons normal.";
    } else if (dnsOk && !httpOk) {
      status = "TERINDIKASI TERBLOKIR / BERMASALAH";
      detail = "DNS aktif, tetapi akses web tidak merespons secara normal.";
    } else if (!dnsOk) {
      status = "ERROR / TIDAK DAPAT DIAKSES";
      detail = "Domain gagal di-resolve atau tidak tersedia.";
    }

    return res.status(200).json({
      status,
      detail: `${detail} ${detailNotes.join(" ")}`
    });
  } catch (error) {
    return res.status(500).json({
      status: "ERROR / TIDAK DAPAT DIAKSES",
      detail: "Terjadi kesalahan internal saat melakukan pemeriksaan."
    });
  }
}

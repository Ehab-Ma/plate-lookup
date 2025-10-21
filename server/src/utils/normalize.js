// server/src/utils/normalize.js
export function normalizeVehicle(rec = {}) {
  // ---------- helpers ----------
  const pick = (...keys) => {
    for (const k of keys) {
      if (rec[k] != null && rec[k] !== "") return String(rec[k]);
    }
    return null;
  };
  const toInt = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };
  // number from string (strip commas/text)
  const toNum = (v) => {
    if (v == null || v === "") return null;
    const n = Number(String(v).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : null;
  };
  // pick by regex on key name
  const pickRx = (re) => {
    const keys = Object.keys(rec || {});
    const k = keys.find((kk) => re.test(kk));
    if (!k) return null;
    const v = rec[k];
    return v == null || v === "" ? null : String(v);
  };
  const normalizeDrive = (v) => {
    if (!v) return null;
    const s = String(v).toLowerCase();
    if (/4x4|awd|4wd/.test(s)) return "4×4";
    if (/fwd|front/.test(s)) return "קדמית (2×4)";
    if (/rwd|rear/.test(s))  return "אחורית (2×4)";
    if (/2x4|2wd/.test(s))   return "2×4";
    return v;
  };

  // ---------- base normalized ----------
  const out = {
    plate: pick("mispar_rechev"),
    make: pick("tozeret_nm", "tozeret_cd"),
    model: pick("kinuy_mishari", "degem_nm"),
    year: toInt(pick("shnat_yitzur", "shnat_yitzur_misparit")),
    trim: pick("ramat_gimur"),

    // engine cc with more aliases + regex fallback
    engine_cc: toInt(
      pick("nefach_manoa","nefah_manoa","nefah_mnoa","nefach_mnoa","engine_cc") ||
      pickRx(/(נפח|סמ.?ק|סמק|engine.*(cc|size|volume)|^cc$|motor.*cc)/i)
    ),

    gearbox: pick("sug_degem", "degem_manoa", "sug_tipa"),
    fuel: pick("delek_nm", "sug_delek"),
    color: pick("tzeva_rechev", "tzeva_cd"),
    ownership: pick("baalut"),

    first_registration: pick("moed_aliya_lakvish","moed_aliya_lakavish","moed_alia_lakvish"),
    last_test_date: pick("mivchan_acharon_dt","t_mivchan_acharon","mivchan_acharon"),
    next_test_date: pick("tokef_dt","t_okef_dt","tokef_rishayon"),

    model_code: pick("degem_cd", "degem_id"),
    manufacturer_code: pick("tozeret_cd"),
    chassis: pick("misgeret"),
    door_count: toInt(pick("mispar_dlatot")),
    seating: toInt(pick("mispar_moshavim")),
    weight_kerb: toInt(pick("mishkal_kolel", "mishkal_ker")),
    remarks: pick("heara", "he_arot"),
  };

  // ---------- horsepower (hp): direct / from kW / from PS ----------
  const hpDirect = toNum(
    // common explicit HP columns
    pick(
      "horsepower","power_hp","engine_power_hp","hp","hp_net","hp_max",
      "koah_sus","koach_sus","coah_sus" // Hebrew spellings
    )
    // generic key patterns
    || pickRx(/(^|_)(hp|bhp)(_|$)/i)
    || pickRx(/(^|_)(ps|cv)(_|$)/i)             // PS/CV as-is (we'll convert below)
    || pickRx(/כ[\u05BC"]?ו?ח(?:ו?ת)?\s*סוס/i)  // “כוח/כוחות סוס”
  );

  const kwVal = toNum(
    pick("power_kw","engine_kw","kw","kw_net","kw_max","max_power_kw","net_power_kw","koah_kw","hespek_kw") ||
    pickRx(/(^|_)(kw|kilowatt|kilo.?watt)(_|$)/i) ||
    pickRx(/הספק.*(kw|קילו.?ואט)/i)
  );

  const psVal = toNum(pick("ps") || pickRx(/(^|_)ps(_|$)/i));

  let hp = hpDirect;
  if (hp == null && kwVal != null) hp = Math.round(kwVal * 1.34102209); // kW → hp
  if (hp == null && psVal != null) hp = Math.round(psVal * 0.98632);     // PS → hp
  out.horsepower = hp ?? null;

  // ---------- extras ----------
  out.tire_front =
    (pick("zmig_kidmi","zmig_kedmi","mida_zmig_kedmi","tire_front","front_tire") ||
     pickRx(/(צמיג|zmig|tire).*(קד|front)/i))?.trim() || null;

  out.tire_rear =
    (pick("zmig_ahori","zmig_achori","mida_zmig_achori","tire_rear","rear_tire") ||
     pickRx(/(צמיג|zmig|tire).*(אחו|rear)/i))?.trim() || null;

  out.country =
    (pick("eretz_yitzur","eretz_itzur","eretz_yetsur","country","country_of_origin","manufacture_country") ||
     pickRx(/ארץ.*ייצו?ר|מדינת.*ייצו?ר|country.*(origin|manufacture)|origin/i)) || null;

  out.drive = normalizeDrive(
    pick("hanaa","sug_hanaa","drive","drivetrain") ||
    pickRx(/(הנעה|drive|drivetrain|4x4|awd|fwd|rwd)/i)
  );

  if (!out.fuel) {
    out.fuel = pickRx(/(סוג).*דלק|דלק|fuel|energy|propulsion/i);
  }


  // TEMP DEBUG — print any engine/horsepower-like keys we received
if (out.engine_cc == null || out.horsepower == null) {
  const interesting = Object.fromEntries(
    Object.entries(rec).filter(([k]) =>
      /(נפח|סמ.?ק|סמק|engine|cc|horse|hp|kw|הספק)/i.test(k)
    )
  );
  console.log("DEBUG vehicle fields for engine/hp:", interesting);
}


  return out;
}

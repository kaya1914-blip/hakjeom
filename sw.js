// 학점 관리 앱 서비스워커
//
// ★ 알림을 여기서 울립니다.
//   웹앱은 '몇 월 며칠 몇 시에 울려라' 를 예약할 수 없습니다(Notification Triggers 는
//   표준이 되지 못했습니다). 대신 설치된 PWA 는 크롬이 주기적으로 깨워 줍니다
//   (Periodic Background Sync). 깨어날 때마다 날짜를 보고 알릴 게 있으면 알립니다.
//   앱을 열 때도 같은 검사를 합니다.
//
//   ⚠ 크롬이 언제 깨울지는 크롬이 정합니다. 하루에 한 번쯤이고 보장은 없습니다.
//     그래서 회사 PC 알림(평일 9시)이 여전히 더 확실한 쪽입니다.
const 일정 = [{"d": "2026-08-10", "t": "실용한문 · 현대인의정신건강 신청 + 반도체공학Ⅰ 취소", "미리": [1]}, {"d": "2026-08-17", "t": "커피학개론 · 평생교육론 · 인공지능 신청 시작", "미리": [1]}, {"d": "2026-08-18", "t": "효과적인성인교육방법 신청 시작", "미리": [1]}, {"d": "2026-09-28", "t": "문화관광론 토론 시작", "미리": [1]}, {"d": "2026-10-11", "t": "빅데이터 · 문화관광 중간고사 마감", "미리": [3, 1]}, {"d": "2026-10-25", "t": "빅데이터 · 문화관광 레포트 마감", "미리": [3, 1]}, {"d": "2026-11-29", "t": "빅데이터 · 문화관광 종강 (기말 마감)", "미리": [3, 1]}, {"d": "2026-12-11", "t": "실용한문 · 현대인의정신건강 종강", "미리": [3, 1]}, {"d": "2026-12-13", "t": "인공지능 · 효과적인성인교육방법 종강", "미리": [3, 1]}, {"d": "2026-12-20", "t": "커피학개론 · 평생교육론 종강 (2026 하반기 끝)", "미리": [3, 1]}, {"d": "2026-11-23", "t": "2026(하) K-MOOC 종강 임박", "미리": []}, {"d": "2027-01-04", "t": "1월 등록월 — 23학점 인정신청", "미리": [7]}, {"d": "2027-01-04", "t": "2027년 일정 공고로 확정하기", "미리": []}, {"d": "2027-01-11", "t": "정보처리기사 1회 필기 접수", "미리": [3]}, {"d": "2027-02-01", "t": "2027(상) K-MOOC 개설목록 확인", "미리": []}, {"d": "2027-04-01", "t": "독학사 2과정 접수 공고 확인", "미리": []}, {"d": "2027-04-19", "t": "독학사 2과정 2과목 접수 주간", "미리": [3, 1]}, {"d": "2027-07-01", "t": "7월 등록월 — 68학점 일괄 인정신청", "미리": [7]}, {"d": "2027-08-02", "t": "2027(하) K-MOOC 7학점 신청", "미리": []}, {"d": "2027-12-01", "t": "전기 학위신청 기간 확인", "미리": []}, {"d": "2028-01-04", "t": "최종 인정신청 + 학위신청 마무리", "미리": [7]}];

function 오늘() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function 남은일수(s) {
  const p = s.split("-");
  return Math.round((new Date(+p[0], p[1] - 1, +p[2]) - 오늘()) / 86400000);
}

// 알릴 것 고르기 — 당일, 그리고 미리 알림으로 정해 둔 날
function 알릴것() {
  return 일정.filter((e) => {
    const d = 남은일수(e.d);
    return d === 0 || e.미리.indexOf(d) >= 0;
  }).map((e) => ({ d: 남은일수(e.d), t: e.t }));
}

// 하루에 한 번만 알리도록 캐시에 마지막 알림 날짜를 적어 둡니다
async function 오늘이미알렸나() {
  const c = await caches.open("hakjeom-알림");
  const r = await c.match("last");
  const 오늘문자 = new Date().toISOString().slice(0, 10);
  if (r && (await r.text()) === 오늘문자) return true;
  await c.put("last", new Response(오늘문자));
  return false;
}

async function 알림검사(강제) {
  const 것들 = 알릴것();
  if (!것들.length) return 0;
  if (!강제 && (await 오늘이미알렸나())) return 0;
  const 첫 = 것들[0];
  const 남 = 첫.d === 0 ? "오늘" : 첫.d + "일 뒤";
  await self.registration.showNotification("학점은행제 — " + 남, {
    body: 것들.map((x) => (x.d === 0 ? "오늘" : x.d + "일 뒤") + " · " + x.t).join("\n"),
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: "hakjeom-일정",
    requireInteraction: true,
    data: { url: "./index.html" }
  });
  try { await self.registration.navigationPreload; } catch (e) {}
  return 것들.length;
}

self.addEventListener("periodicsync", (e) => {
  if (e.tag === "학점점검") e.waitUntil(알림검사(false));
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
  if (e.data && e.data.type === "알림검사") e.waitUntil(알림검사(!!e.data.강제));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
    for (const w of ws) { if ("focus" in w) return w.focus(); }
    return clients.openWindow("./index.html");
  }));
});

// 앱 껍데기를 통째로 캐시해 오프라인에서도 열립니다.
// 버전은 index.html 내용에서 뽑은 해시라, 내용이 바뀌면 캐시가 자동으로 갈립니다.
const VERSION = "hakjeom-778c4e857b";
// hakjeom.ics 는 일부러 캐시하지 않습니다 — 캘린더가 구독으로 늘 최신을 받아가야 합니다.
const ASSETS = ["./", "./index.html", "./manifest.webmanifest",
                "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", (e) => {
  // 기다리지 않고 바로 새 판으로 넘어갑니다. 사용자가 '새 버전' 버튼을 누를 필요가 없습니다.
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // 화면 이동은 새 내용을 먼저 시도하고, 실패하면 캐시로 엽니다(오프라인).
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); return r; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});

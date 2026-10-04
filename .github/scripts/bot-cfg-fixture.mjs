// v170.9: تنظیمات ساختگی برای اجرای محلی و تست‌های خشک. مقدار واقعی فقط در Script Property «TG_CFG» بات زنده
// (و تب پنهان «تنظیمات تیم» هاب) است و هرگز در مخزن نمی‌آید. همهٔ مقدارهای این فایل ساختگی‌اند.
export const FAKE_CFG = {
  TG_SHEET_ID: 'FAKE_SHEET_HUB', TG_PROFILE_SS: 'FAKE_SHEET_PROFILE', TG_CONTENT_SHEET_ID: 'FAKE_SHEET_CONTENT',
  TG_SCHOOL_SHEET_ID: 'FAKE_SHEET_SCHOOL', TG_STAT_SHEET_ID: 'FAKE_SHEET_STAT', MC_REVIEW_SHEET: 'FAKE_SHEET_MC',
  SO_DRIVE_ID: 'FAKE_DRIVE_SOCIAL', TG_PQ_DRIVE: 'FAKE_DRIVE_PQ', TNK_HOME: 'FAKE_DRIVE_TNK',
  TG_OWNER_CHAT: '7000001',
  TG_CIRCLE_CAL: { '7': 'fake-cal-7@group.calendar.google.com', '8': 'fake-cal-7@group.calendar.google.com', '9': 'fake-cal-7@group.calendar.google.com',  // pii:ok ساختگی
    '10': 'fake-cal-10@group.calendar.google.com', '11': 'fake-cal-11@group.calendar.google.com', '12': 'fake-cal-12@group.calendar.google.com',  // pii:ok ساختگی
    '13': 'fake-cal-13@group.calendar.google.com', '14': 'fake-cal-14@group.calendar.google.com', '15': 'fake-cal-15@group.calendar.google.com',  // pii:ok ساختگی
    '15/1': 'fake-cal-15@group.calendar.google.com', '15/2': 'fake-cal-152@group.calendar.google.com' },  // pii:ok ساختگی
  TG_CAL_PUBLIC: ['fake-public-a@group.calendar.google.com', 'fake-public-b@group.calendar.google.com'],  // pii:ok ساختگی
  TG_CAL_ACCOUNT: 'fake-account@group.calendar.google.com',  // pii:ok ساختگی
  RATE_LO: 1000000, RATE_HI: 4000000, SUPRATE_LO: 100000, SUPRATE_HI: 4000000,
  PAY_ADDR_TRON: 'TFAKEtronReceiveAddress0000000000', PAY_ADDR_BSC: '0xFAKE000000000000000000000000000000000BSC',
  DEFAULT_SHARE_PCT: '50', PT_SHARES: [10, 12, 14],
  VK_ADMIN_SEED: [{ name: 'مدیر ساختگی', role: 'مدیر ساختمان', chat: '7000001', user: 'fake_owner', approve: true },
                  { name: 'مسئول ساختگی', role: 'مسئول ساختمان', chat: '7000002', user: 'fake_manager', approve: false }],
  VK_GUARD: 'نگهبان ساختگی',
  TG_MAIN_CHANNEL: '-1009999999999',
  // v170.14: نام همکاران؛ همه ساختگی‌اند و با نام‌های تست‌ها یکی‌اند
  TG_NAMES: { reception: 'ژیلا', reception_lat: 'jila', school: 'ترانه', school_full: 'ترانه پارسا', school_user: 'fake_school',
    chief: 'کاوه', chief_full: 'کاوه امیرآرا', psy: 'یلدا', desk3: 'شیدا', psy_dr: 'دکتر سپهری', ap_sup: 'پریسا نیک‌سرشت' }
};

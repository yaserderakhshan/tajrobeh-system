// بات v170.23.19: نمایهٔ دانش سایت برای دستیار (assist-index.mjs). دادهٔ ساختگی.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pageChunks, clean, MONEY, MAX_PAGE, MAX_POST } from '../assist-index.mjs';
const S = 'https://tajrobeh.life';
const pg = (link, html, extra = {}) => ({ link, title: { rendered: 'عنوان نمونه' }, content: { rendered: html }, modified: '2026-10-01T00:00:00', ...extra });
const long = '<h2>جلسهٔ اول</h2><p>' + 'جلسهٔ معارفه رایگان است و بیست دقیقه طول می‌کشد. '.repeat(6) + '</p><h2>هزینه</h2><p>' + 'هزینهٔ هر جلسه در صفحهٔ شروع تراپی آمده است. '.repeat(5) + '</p>';
const t = (n, c) => test(n, () => assert.ok(c));
const a = pageChunks(pg(S + '/get-therapy/', long), 'page');
t('صفحهٔ منتشرشده تکه می‌شود با عنوان بخش و حوزه', a.length >= 2 && a[0].title.includes('جلسهٔ اول') && a[0].dom === 'تراپی و پذیرش');
t('noindex بیرون', pageChunks(pg(S + '/x/', long, { yoast_head_json: { robots: { index: 'noindex' } } }), 'page').length === 0);
t('رمزدار بیرون', pageChunks(pg(S + '/x/', long, { content: { rendered: long, protected: true } }), 'page').length === 0);
t('ادمین و ورود بیرون', pageChunks(pg(S + '/wp-admin/x', long), 'page').length === 0 && pageChunks(pg(S + '/login/', long), 'page').length === 0);
t('دامنهٔ بیرونی بیرون', pageChunks(pg('https://example.com/x/', long), 'page').length === 0);
t('فرم داخلی کوتاه بیرون', pageChunks(pg(S + '/form-x/', '<p>فرم داخلی</p><form><input></form>'), 'page').length === 0);
const money = pageChunks(pg(S + '/joinus/', '<p>' + 'سهم درمانگر از هر جلسه در قرارداد آمده است و تسویه ماهانه است. '.repeat(4) + '</p><h2>دیگر</h2><p>' + 'همکاری با تجربه از راه فرم اپلای شروع می‌شود و پاسخ زود می‌آید. '.repeat(3) + '</p>'), 'page');
t('تکهٔ مالی محرمانه بیرون، بقیه می‌ماند', money.length === 1 && !MONEY.test(money[0].text) && money[0].dom === 'همکاری درمانگران و پارتنرها');
const pii = pageChunks(pg(S + '/contact-us/', '<p>' + 'برای تماس شماره ۰۹۱۲' + '۱۲۳۴۵۶۷ را بگیرید و پیام بگذارید تا پاسخ بدهیم و پیگیری کنیم. '.repeat(2) + '</p>'), 'page');   // pii:ok ساختگی
t('تکه با شمارهٔ تلفن بیرون (نگهبان مخزن)', pii.length === 0);
t('مقاله حوزهٔ مجله و مخاطب خواننده', pageChunks(pg(S + '/mag/sample/', long), 'post')[0].dom === 'مجله');
t('خط تیرهٔ بلند به ویرگول', !/[\u2014\u2013]/.test(clean('<p>الف \u2014 ب</p>')));
t('شناسهٔ پایدار', pageChunks(pg(S + '/get-therapy/', long), 'page')[0].id === a[0].id);
const big = Array.from({ length: 12 }, (_, i) => '<h2>بخش ' + i + '</h2><p>' + 'این بخش دربارهٔ روند کار تجربه است و توضیح کوتاهی دارد. '.repeat(6) + '</p>').join('');
t('سقف تکهٔ هر برگه', pageChunks(pg(S + '/school/', big), 'page').length === MAX_PAGE);
t('مقاله فقط تکهٔ اول', pageChunks(pg(S + '/mag/long/', big), 'post').length === MAX_POST);

add_action('fluentform/submission_inserted', 'tajrobeh_lead_to_sheet', 20, 3);
add_action('fluentform_submission_inserted', 'tajrobeh_lead_to_sheet', 20, 3);

/**
 * هر فرم سایت → یک سطر در Sheet1 فایل «تجربه — مرکز پذیرش و ارجاع».
 *
 * ستون «منبع» همیشه با این الگو پر می‌شود:  سایت › بخش › نام فرم — صفحه
 * تب «کارتابل پیگیری» بخش را از قسمت دوم همین متن می‌خواند و مسئول پیگیری را
 * از تب «تنظیمات تیم» برمی‌دارد (مسئول هر بخش در همان تب).
 *
 * فرم تازه ساختی؟ فقط یک سطر به $map اضافه کن؛ بقیه خودکار است.
 * فرم‌های دمو و خبرنامه در $skip هستند و به شیت نمی‌روند.
 */
function tajrobeh_lead_to_sheet($entryId, $formData, $form) {
    static $done = array();
    if (isset($done[$entryId])) { return; }
    $done[$entryId] = true;

    $endpoint = tajrobeh_leads_endpoint();

    $form_id = isset($form->id) ? (int) $form->id : 0;
    $skip    = array(1, 2, 4); // دمو و خبرنامه: لید نیستند
    if (in_array($form_id, $skip, true)) { return; }

    // form_id => array(بخش, نام کوتاه فرم)
    $map = array(
        7  => array('پذیرش',   'فرم شروع تراپی'),
        5  => array('پذیرش',   'تراپی فارسی (خارج از ایران)'),
        9  => array('پذیرش',   'Persian therapy (English)'),
        10 => array('پذیرش',   'فرم تماس با ما'),
        6  => array('مدرسه',   'پیش‌ثبت‌نام دوره'),
        8  => array('مدرسه',   'کامیونیتی دانشجویان'),
        11 => array('مدرسه',   'همکاری انجمن علمی'),
        15 => array('مدرسه',   'ثبت‌نام دورهٔ EFT'),
        17 => array('مدرسه',   'درخواست بورسیه'),
        3  => array('سازمانی', 'درخواست خدمات سازمانی'),
        12 => array('رودمپ',   'ثبت سریع رودمپ'),
        13 => array('رودمپ',   'پروندهٔ ارزیابی رودمپ'),
        14 => array('رودمپ همکاری', 'اعلام همکاری رودمپ'),
    );

    $p = is_array($formData) ? $formData : (array) $formData;
    $title = isset($form->title) ? $form->title : '';

    if (isset($map[$form_id])) {
        list($dept, $label) = $map[$form_id];
        // فرم تماس با ما: بخش را از روی «موضوع»ی که خود مراجع انتخاب کرده برمی‌داریم
        $valid = array('پذیرش', 'مدرسه', 'روانپزشکی', 'سازمانی');
        if (!empty($p['topic']) && in_array(trim($p['topic']), $valid, true)) { $dept = trim($p['topic']); }
    } else {
        $dept  = tajrobeh_dept_from_text($title);
        $label = $title;
    }

    // نام صفحه‌ای که فرم روی آن پر شده (یک فرم روی چند صفحه می‌نشیند)
    $page_id    = isset($p['__fluent_form_embded_post_id']) ? (int) $p['__fluent_form_embded_post_id'] : 0;
    $page_title = tajrobeh_page_name($page_id);
    $page_url   = $page_id ? get_permalink($page_id) : '';

    $source = 'سایت › ' . $dept . ' › ' . $label;
    if ($page_title && mb_strpos($label, $page_title) === false) { $source .= ' — ' . $page_title; }

    $p['form_id']    = $form_id;
    $p['form_title'] = $title;
    $p['entry_id']   = $entryId;
    $p['source']     = $source;
    $p['source_page'] = $page_url;

    // نام: فیلد ساده یا فیلد ترکیبی نام
    if (empty($p['name'])) {
        if (!empty($p['names']) && is_array($p['names'])) {
            $p['name'] = trim(implode(' ', array_filter(array(
                isset($p['names']['first_name']) ? $p['names']['first_name'] : '',
                isset($p['names']['last_name'])  ? $p['names']['last_name']  : '',
            ))));
        } elseif (!empty($p['first_name']) || !empty($p['last_name'])) {
            $p['name'] = trim((isset($p['first_name']) ? $p['first_name'] : '') . ' ' . (isset($p['last_name']) ? $p['last_name'] : ''));
        }
    }
    // شماره: موبایل یا واتساپ
    if (empty($p['mobile']) && !empty($p['whatsapp'])) { $p['mobile'] = $p['whatsapp']; }
    if (empty($p['mobile']) && !empty($p['contact'])) { $p['mobile'] = $p['contact']; }

    // آنچه پذیرش باید در یک نگاه ببیند، در یک خط جمع می‌شود
    $bits = array();
    if (!empty($p['note']))      { $bits[] = trim($p['note']); }
    if (!empty($p['message']))   { $bits[] = trim($p['message']); }
    if (!empty($p['course']))    { $bits[] = 'دوره: ' . $p['course']; }
    if (!empty($p['topic']))     { $bits[] = 'موضوع: ' . $p['topic']; }
    if (!empty($p['level']))     { $bits[] = 'مقطع: ' . $p['level']; }
    if (!empty($p['approach']))  { $bits[] = 'رویکرد: ' . $p['approach']; }
    if (!empty($p['company']))   { $bits[] = 'سازمان: ' . $p['company'] . (!empty($p['job_title']) ? ' (' . $p['job_title'] . ')' : ''); }
    if (!empty($p['org_type']))  { $bits[] = 'نوع: ' . $p['org_type']; }
    if (!empty($p['org_size']))  { $bits[] = 'اندازه: ' . $p['org_size']; }
    if (!empty($p['interest']))  { $bits[] = 'علاقه: ' . $p['interest']; }
    if (!empty($p['email']))     { $bits[] = 'ایمیل: ' . $p['email']; }
    if (!empty($p['channel']))   { $bits[] = 'کانال ترجیحی: ' . $p['channel']; }
    if (!empty($p['country']))   { $bits[] = 'کشور: ' . $p['country']; }
    if (!empty($p['status']))    { $bits[] = 'وضعیت: ' . $p['status']; }
    if (!empty($p['lang']))      { $bits[] = 'زبان: ' . $p['lang']; }
    if (!empty($p['horizon']))   { $bits[] = 'افق: ' . $p['horizon']; }
    if (!empty($p['goal']))      { $bits[] = 'هدف: ' . $p['goal']; }
    if (!empty($p['degree_field'])){ $bits[] = 'رشته: ' . $p['degree_field']; }
    if (!empty($p['work_years'])){ $bits[] = 'سابقه: ' . $p['work_years']; }
    if (!empty($p['telegram'])) { $bits[] = 'تلگرام: ' . $p['telegram']; }
    if (!empty($p['university'])){ $bits[] = 'دانشگاه: ' . $p['university']; }
    if (!empty($p['role']))      { $bits[] = 'نقش: ' . $p['role']; }
    if (!empty($p['association'])){ $bits[] = 'انجمن: ' . $p['association']; }
    if (!empty($p['area']))      { $bits[] = 'حوزهٔ همکاری: ' . $p['area']; }
    if (!empty($p['mode']))      { $bits[] = 'نحوهٔ همکاری: ' . $p['mode']; }
    if (!empty($p['base']))      { $bits[] = 'مقیم: ' . $p['base']; }
    if (!empty($p['best_time'])) { $bits[] = 'زمان مناسب: ' . $p['best_time']; }
    if (!empty($p['timezone']))  { $bits[] = $p['timezone']; }
    if (!empty($p['student']))   { $bits[] = 'دانشجو'; }
    if ($bits) { $p['note'] = implode(' · ', $bits); }

    // کلید message را نمی‌فرستیم: اسکریپت گوگل آن را با پیام تلگرام اشتباه می‌گیرد و لید در تب خطا می‌افتد
    unset($p['message']);
    foreach (array_keys($p) as $k) {
        if (strpos($k, '_fluentform') === 0 || $k === '_wp_http_referer' || $k === '__fluent_form_embded_post_id') { unset($p[$k]); }
    }

    tj_lead_enqueue($entryId, $p);
}

/* ---------- صف ارسال لید (ممیزی ۱۱ مهر، یافتهٔ ۱) ----------
 * کاربر دیگر منتظر Apps Script نمی‌ماند: ردیف در صف (گزینهٔ tj_lead_q) می‌نشیند و بعد از فرستادن پاسخ فرم به مرورگر
 * (fastcgi_finish_request) فرستاده می‌شود. اگر نرسید، WP-Cron هر ۵ دقیقه با فاصلهٔ رو به افزایش دوباره می‌فرستد
 * (۱، ۵، ۱۵، ۶۰، ۱۸۰ دقیقه و بعد هر ۶ ساعت، تا ۲ روز). بعد از ۳ شکست و در شکست نهایی به ایمیل مدیر سایت هشدار می‌رود.
 * لاگ (بی دادهٔ فرم): گزینهٔ tj_lead_log، ۳۰۰ خط آخر. ورودی فلوئنت هم مثل قبل محفوظ است.
 */
function tj_lead_log($m) {
    $l = get_option('tj_lead_log', array());
    $l[] = gmdate('c') . ' ' . $m;
    update_option('tj_lead_log', array_slice($l, -300), false);
}
function tj_lead_enqueue($entryId, $payload) {
    $q = get_option('tj_lead_q', array());
    $q[(string) $entryId] = array('p' => $payload, 'n' => 0, 'next' => time(), 'first' => time());
    update_option('tj_lead_q', $q, false);
    update_option('tj_lead_pending', '1', true);
    tj_lead_log('queued ' . $entryId);
    // بعد از پاسخ به کاربر بفرست
    add_action('shutdown', function () use ($entryId) {
        if (function_exists('fastcgi_finish_request')) { @fastcgi_finish_request(); }
        tj_lead_flush((string) $entryId);
    }, 1);
    if (!wp_next_scheduled('tj_lead_retry')) { wp_schedule_event(time() + 300, 'tj_five_min', 'tj_lead_retry'); }
}
add_filter('cron_schedules', function ($s) { $s['tj_five_min'] = array('interval' => 300, 'display' => 'هر ۵ دقیقه (صف لید)'); return $s; });
/* WP-Cron روی این سایت قابل اتکا نیست (۱۱ مهر: یک ردیف ۱۳ دقیقه بی تلاش دوباره ماند). پس هر درخواست عادی سایت هم،
   اگر پرچم سبک tj_lead_pending روشن باشد، حداکثر هر ۶۰ ثانیه یک بار بعد از پاسخ به کاربر صف را می‌فرستد. */
add_action('init', function () {
    $pend = get_option('tj_lead_pending', null);
    if ($pend === null) { $pend = get_option('tj_lead_q', array()) ? '1' : '0'; update_option('tj_lead_pending', $pend, true); } // بار اول، برای ردیف‌های مانده
    if ($pend !== '1' || get_transient('tj_lead_tick')) { return; }
    set_transient('tj_lead_tick', 1, 60);
    add_action('shutdown', function () {
        if (function_exists('fastcgi_finish_request')) { @fastcgi_finish_request(); }
        tj_lead_flush(null);
    }, 2);
});
add_action('tj_lead_retry', function () { tj_lead_flush(null); });

/** یک ردیف یا همهٔ ردیف‌های سررسیده را می‌فرستد. فقط پاسخ ۲xx با JSON «ok» موفق حساب می‌شود. */
function tj_lead_flush($only) {
    // قفل اتمی در پایگاه داده (INSERT IGNORE فقط یک بار موفق می‌شود، بی واسطهٔ کش اشیا)؛ قفل مانده بعد از ۶۰ ثانیه کنار می‌رود
    global $wpdb;
    $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name = %s AND CAST(option_value AS UNSIGNED) < %d", 'tj_lead_lock', time() - 60));
    if (!$wpdb->query($wpdb->prepare("INSERT IGNORE INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, 'no')", 'tj_lead_lock', (string) time()))) { return; }
    $q = get_option('tj_lead_q', array());
    $wait = array(60, 300, 900, 3600, 10800);
    foreach ($q as $id => $it) {
        if ($only !== null && (string) $id !== $only) { continue; }
        if ($it['next'] > time()) { continue; }
        // Apps Script بعد از اجرای doPost با ۳۰۲ به نشانی پاسخ می‌فرستد. دنبال کردن خودکار، POST را دوباره می‌فرستد و ۴۰۰ می‌گیرد،
        // پس ریدایرکت دنبال نمی‌شود.
        $body = wp_json_encode($it['p']);
        $r = wp_remote_post(tajrobeh_leads_signed_url($body), array('timeout' => 15, 'redirection' => 0,
            'headers' => array('Content-Type' => 'application/json'), 'body' => $body));
        $code = is_wp_error($r) ? 0 : (int) wp_remote_retrieve_response_code($r);
        // ۳۰۲ به نشانی echo خود Apps Script یعنی doPost اجرا شده و پاسخش آماده است. سرور ایران همیشه به googleusercontent
        // نمی‌رسد، پس آن نشانی خوانده نمی‌شود: خواندن ناموفق نباید ارسال دوباره (و لید تکراری) بسازد.
        $loc = is_wp_error($r) ? '' : (string) wp_remote_retrieve_header($r, 'location');
        $echo = in_array($code, array(302, 303), true) && strpos($loc, 'https://script.googleusercontent.com/macros/echo') === 0;
        $j = is_wp_error($r) ? null : json_decode(wp_remote_retrieve_body($r), true);
        $ok = $echo || ($code >= 200 && $code < 300 && is_array($j) && ((isset($j['status']) && $j['status'] === 'ok') || !empty($j['ok'])));
        if ($ok) {
            unset($q[$id]);
            tj_lead_log('sent ' . $id . ' try=' . ($it['n'] + 1));
            continue;
        }
        $it['n']++;
        $why = is_wp_error($r) ? $r->get_error_code() : ('http' . $code);
        tj_lead_log('fail ' . $id . ' try=' . $it['n'] . ' ' . $why);
        if ($it['n'] === 3) { tj_lead_alert($id, $it['n'], $why, false); }
        if (time() - $it['first'] > 2 * DAY_IN_SECONDS) { tj_lead_alert($id, $it['n'], $why, true); unset($q[$id]); continue; }
        $it['next'] = time() + (isset($wait[$it['n'] - 1]) ? $wait[$it['n'] - 1] : 6 * HOUR_IN_SECONDS);
        $q[$id] = $it;
    }
    update_option('tj_lead_q', $q, false);
    update_option('tj_lead_pending', $q ? '1' : '0', true);
    $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name = %s", 'tj_lead_lock'));
}
/** هشدار به ایمیل مدیر سایت (نه بات، چون ممکن است خود بات در دسترس نباشد). فقط شمارهٔ ورودی فلوئنت، بی دادهٔ مراجع. */
function tj_lead_alert($id, $n, $why, $final) {
    $sub = $final ? 'لید سایت به هاب نرسید (رها شد)' : 'لید سایت هنوز به هاب نرسیده';
    $msg = "ورودی فلوئنت شمارهٔ " . $id . " بعد از " . $n . " تلاش به هاب پذیرش نرسید (" . $why . ").\n"
         . ($final ? "تلاش متوقف شد. ورودی در فرم‌های فلوئنت هست؛ لطفاً دستی به هاب منتقلش کنید." : "تلاش ادامه دارد. اگر بات یا Apps Script مشکل دارد بررسی کنید.");
    wp_mail(get_option('admin_email'), $sub, $msg);
    tj_lead_log('alert ' . $id . ($final ? ' final' : ''));
}


/** نام کوتاه صفحه: هر چیزی بعد از | یا خط تیره حذف می‌شود تا در پیام واتساپ و ستون منبع تمیز بماند */
function tajrobeh_page_name($page_id) {
    $t = $page_id ? get_the_title($page_id) : '';
    $t = trim(preg_replace('/\s*[|]\s.*$/u', '', (string) $t));
    return $t;
}

/** آدرس وب‌اپ گوگل که همهٔ لیدها (سایت، بات تلگرام، واتساپ) به آن می‌رسند */
function tajrobeh_leads_endpoint() {
    return 'https://script.google.com/macros/s/AKfycbxD-DYhZ9LFjwB9az_DpMprzF_ItJkdad_DutMGPk1qY3ksBb45aMHYZBsXTCepYhsC8Q/exec';
}

/** بخش را از روی متن حدس می‌زند؛ فقط برای فرم‌هایی که هنوز در $map نیستند */
function tajrobeh_dept_from_text($text) {
    $text = (string) $text;
    if (preg_match('/روان‌?پزشک|دارو/u', $text))            { return 'روانپزشکی'; }
    if (preg_match('/مدرسه|دوره|کامیونیتی|کارگاه/u', $text)) { return 'مدرسه'; }
    if (preg_match('/سازمان|شرکت|کارکنان/u', $text))        { return 'سازمانی'; }
    return 'پذیرش';
}

function tajrobeh_leads_post($payload) {
    $body = wp_json_encode($payload);
    wp_remote_post(tajrobeh_leads_signed_url($body), array(
        'timeout'     => 12,
        'redirection' => 5,
        'headers'     => array('Content-Type' => 'application/json'),
        'body'        => $body,
    ));
}

/** ارسال غیرمسدود (برای کلیک‌ها): PHP منتظر Apps Script نمی‌ماند. همان امضای ارسال لید را دارد. */
function tajrobeh_leads_post_async($payload) {
    $body = wp_json_encode($payload);
    wp_remote_post(tajrobeh_leads_signed_url($body), array(
        'timeout'     => 5,
        'blocking'    => false,
        'redirection' => 0,
        'headers'     => array('Content-Type' => 'application/json'),
        'body'        => $body,
    ));
}

/* امضای ارسال به بات (بات v170.9، امنیت ورودی سایت؛ کد بات از PR #73): ?ts=&sig= با HMAC-SHA256 روی «ts.بدنهٔ خام».
   رمز در گیت خالی است و هنگام انتشار سایت از GitHub Secret «SITE_LEAD_SECRET» گذاشته می‌شود (مثل رمز کمپین)؛
   بات همان را از همان Secret در Script Properties دارد. بی رمز، بی امضا می‌فرستد (بات تا روشن شدن SITE_SIG_ENFORCE می‌پذیرد). */
if (!defined('TJ_LEAD_SECRET')) define('TJ_LEAD_SECRET', '');
function tajrobeh_leads_signed_url($body) {
    $url = tajrobeh_leads_endpoint();
    if (TJ_LEAD_SECRET === '') { return $url; }
    $ts = (string) time();
    return add_query_arg(array('ts' => $ts, 'sig' => hash_hmac('sha256', $ts . '.' . $body, TJ_LEAD_SECRET)), $url);
}

/**
 * کلیک روی واتساپ / تلگرام / تلفن در سایت.
 * شمارهٔ کاربر را نداریم، پس این‌ها لید قابل تماس نیستند و در Sheet1 نمی‌نشینند؛
 * در تب «کلیک‌های تماس» ثبت می‌شوند تا معلوم باشد هر کانال از کدام صفحه چند نفر می‌آورد.
 */
add_action('wp_ajax_tajrobeh_contact_click', 'tajrobeh_contact_click');
add_action('wp_ajax_nopriv_tajrobeh_contact_click', 'tajrobeh_contact_click');
function tajrobeh_contact_click() {
    // ممیزی ۱۱ مهر، یافتهٔ ۱۲ (تأیید یاسر، ۱۲ مهر): فقط از همین دامنه (Origin یا Referer)، سقف ۳۰ کلیک در ۱۰ دقیقه برای هر IP واقعی،
    // و سقف کلی ۵۰۰ کلیک در ساعت برای کل سایت. nonce نیست: برگه‌ها در کش WP-Optimize بیشتر از عمر nonce می‌مانند.
    $from = isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] !== '' ? (string) $_SERVER['HTTP_ORIGIN'] : (isset($_SERVER['HTTP_REFERER']) ? (string) $_SERVER['HTTP_REFERER'] : '');
    $bare = function ($u) { return preg_replace('/^www\./', '', strtolower((string) wp_parse_url($u, PHP_URL_HOST))); };
    if ($from === '' || $bare($from) !== $bare(home_url())) { wp_send_json_error(null, 403); }
    // وردپرس پشت پراکسی است و REMOTE_ADDR برای همه یکی است؛ IP واقعی از X-Real-IP یا X-Forwarded-For، و اگر پیدا نشد سقف هر IP نیست
    $ip = '';
    foreach (array('HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR') as $h) {
        $v = isset($_SERVER[$h]) ? trim(explode(',', (string) $_SERVER[$h])[0]) : '';
        if ($v !== '' && filter_var($v, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) { $ip = $v; break; }
    }
    $gk = 'tj_clk_all_' . gmdate('YmdH');
    if ((int) get_transient($gk) >= 500) { wp_send_json_error(null, 429); }
    if ($ip !== '') {
        $rk = 'tj_clk_' . substr(md5($ip), 0, 16);
        $rn = (int) get_transient($rk);
        if ($rn >= 30) { wp_send_json_error(null, 429); }
        set_transient($rk, $rn + 1, 10 * MINUTE_IN_SECONDS);
    }
    set_transient($gk, (int) get_transient($gk) + 1, HOUR_IN_SECONDS);
    $channel = isset($_POST['channel']) ? sanitize_text_field(wp_unslash($_POST['channel'])) : '';
    $page_id = isset($_POST['page_id']) ? (int) $_POST['page_id'] : 0;
    $ref     = isset($_POST['ref']) ? sanitize_text_field(wp_unslash($_POST['ref'])) : '';
    $allowed = array('واتساپ', 'تلگرام', 'بات تلگرام', 'تلفن');
    if (!in_array($channel, $allowed, true)) { wp_send_json_success(); }

    $page_title = tajrobeh_page_name($page_id);
    $dept       = tajrobeh_dept_from_text($page_title);
    // v170.14: نام مسئول در کد نیست؛ بخش فرستاده می‌شود و بات نام را از تنظیمات خصوصی (TG_NAMES) می‌گذارد
    $owners     = array('پذیرش' => 'پذیرش', 'مدرسه' => 'مدرسه', 'روانپزشکی' => 'روانپزشکی', 'سازمانی' => 'پذیرش');

    tajrobeh_leads_post_async(array(
        'kind'    => 'click',
        'channel' => $channel,
        'source'  => 'سایت › ' . $dept . ' › ' . $channel,
        'page'    => $page_title ? $page_title : ($page_id ? '#' . $page_id : ''),
        'owner'   => isset($owners[$dept]) ? $owners[$dept] : 'پذیرش',
        'ref'     => $ref,
    ));
    wp_send_json_success();
}

/**
 * اسکریپت سبک پایین همهٔ صفحه‌ها:
 *  ۱) به هر لینک واتساپ یک متن آماده اضافه می‌کند که می‌گوید کاربر از کدام صفحه آمده،
 *     تا پذیرش در خود واتساپ منبع را ببیند.
 *  ۲) کلیک روی واتساپ/تلگرام/تلفن را در تب «کلیک‌های تماس» شیت ثبت می‌کند
 *     (هر کانال در هر صفحه، یک بار در هر نشست).
 */
add_action('wp_footer', 'tajrobeh_contact_click_js', 99);
function tajrobeh_contact_click_js() {
    if (is_admin()) { return; }
    $page_id = (int) get_queried_object_id();
    $title   = tajrobeh_page_name($page_id);
    $data    = array(
        'ajax'  => admin_url('admin-ajax.php'),
        'pid'   => $page_id,
        'msg'   => 'سلام، از صفحهٔ «' . $title . '» در سایت تجربه آمده‌ام.',
    );
    echo '<script id="tajrobeh-contact-track">(function(){var C=' . wp_json_encode($data) . ';'
       . 'function tag(){document.querySelectorAll(\'a[href*="wa.me/"]\').forEach(function(a){if(a.href.indexOf("text=")<0){a.href+=(a.href.indexOf("?")<0?"?":"&")+"text="+encodeURIComponent(C.msg);}});}'
       . 'if(document.readyState!=="loading"){tag();}else{document.addEventListener("DOMContentLoaded",tag);}'
       . 'window.addEventListener("load",tag);'
       . 'document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a"):null;if(!a)return;'
       . 'var h=a.getAttribute("href")||"";var ch="";'
       . 'if(/wa\\.me\\//.test(h))ch="واتساپ";else if(/t\\.me\\/tajrobehlife_bot/.test(h))ch="بات تلگرام";else if(/t\\.me\\//.test(h))ch="تلگرام";else if(/^tel:/.test(h))ch="تلفن";else return;'
       . 'var key="tjc:"+ch+":"+C.pid;try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,"1");}catch(x){}'
       . 'try{var f=new FormData();f.append("action","tajrobeh_contact_click");f.append("channel",ch);f.append("page_id",C.pid);f.append("ref",Date.now().toString(36)+Math.random().toString(36).slice(2,8));'
       . 'if(navigator.sendBeacon){navigator.sendBeacon(C.ajax,f);}else{fetch(C.ajax,{method:"POST",body:f,keepalive:true});}}catch(x){}'
       . '},true);})();</script>';
}
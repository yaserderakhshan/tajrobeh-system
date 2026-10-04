<?php
// امنیت (بات v170.9): جفت‌شدن بات و سایت (اسنیپت 504064) بی کد یک‌بارمصرف مدیر کلید را نمی‌پذیرد.
// با وردپرس ساختگی اجرا می‌شود: php site/tools/test/pair-test.php  ← «OK» یا پیام خطا و خروج ۱
$GLOBALS['opts'] = array();
function add_action($a, $b) {}
function register_rest_route($a, $b, $c) {}
function current_user_can($c) { return true; }
function get_option($k, $d = false) { return array_key_exists($k, $GLOBALS['opts']) ? $GLOBALS['opts'][$k] : $d; }
function update_option($k, $v, $a = null) { $GLOBALS['opts'][$k] = $v; return true; }
function delete_option($k) { unset($GLOBALS['opts'][$k]); return true; }
function get_transient($k) { return false; }
function set_transient($k, $v, $t) { return true; }
class WP_Error { public $code; function __construct($c, $m = '', $d = array()) { $this->code = $c; } }
class WP_REST_Request { private $b; function __construct($b) { $this->b = $b; } function get_body() { return $this->b; } function get_param($k) { return null; } }
$src = file_get_contents(__DIR__ . '/../../snippets/504064.php');
$src = preg_replace('/^<\?php/', '', $src);
eval($src);
$fail = array();
$key = str_repeat('a', 64);
$r = tjd_pair(new WP_REST_Request(json_encode(array('key' => $key))));
if (!($r instanceof WP_Error)) $fail[] = 'بی پنجره پذیرفت';
$o = tjd_pair_open(new WP_REST_Request('{}'));
if (empty($o['code'])) $fail[] = 'پنجره کد نداد';
$r = tjd_pair(new WP_REST_Request(json_encode(array('key' => $key))));
if (!($r instanceof WP_Error) || $r->code !== 'tjd_code') $fail[] = 'بی کد پذیرفت';
$r = tjd_pair(new WP_REST_Request(json_encode(array('key' => $key, 'code' => 'wrong'))));
if (!($r instanceof WP_Error) || $r->code !== 'tjd_code') $fail[] = 'کد غلط پذیرفت';
if (get_option('tj_dir_key')) $fail[] = 'کلید جعلی نشست';
$r = tjd_pair(new WP_REST_Request(json_encode(array('key' => $key, 'code' => $o['code']))));
if (!is_array($r) || empty($r['ok']) || get_option('tj_dir_key') !== $key) $fail[] = 'کد درست جفت نکرد';
$r = tjd_pair(new WP_REST_Request(json_encode(array('key' => str_repeat('b', 64), 'code' => $o['code']))));
if (!($r instanceof WP_Error)) $fail[] = 'کد یک‌بارمصرف دوباره کار کرد';
$o2 = tjd_pair_open(new WP_REST_Request('{}'));
if (!empty($o2['ok'])) $fail[] = 'جفت‌شده بی replace دوباره باز شد';
if ($fail) { echo implode("\n", $fail), "\n"; exit(1); }
echo "OK\n";

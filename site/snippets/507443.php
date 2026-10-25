$tj_path = rtrim((string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
if ($tj_path === '/bridge-pay/callback') {
    if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true);
    $tj_qs = $_SERVER['QUERY_STRING'] ?? '';
    $tj_dest = 'https://bridge.tajrobeh.life/api/v2/payments/callback' . ($tj_qs !== '' ? '?' . $tj_qs : '');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Location: ' . $tj_dest, true, 307);
    exit;
}
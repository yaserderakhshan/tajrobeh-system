$url = 'https://www.figma.com/api/mcp/asset/4b3a126c-a9fc-4687-87b0-d3de4a163aa8.png';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$tmp = download_url($url, 90);
if (is_wp_error($tmp)) { echo 'ERR1: ' . $tmp->get_error_message(); return; }
$file = array('name' => 'tajrobeh-dandelion.png', 'tmp_name' => $tmp);
$id = media_handle_sideload($file, 0, 'تصویرسازی برند تجربه — قاصدک توت‌فرنگی');
if (is_wp_error($id)) { @unlink($tmp); echo 'ERR2: ' . $id->get_error_message(); return; }
echo 'OK|' . $id . '|' . wp_get_attachment_url($id);
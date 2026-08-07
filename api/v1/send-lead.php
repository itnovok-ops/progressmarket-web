<?php
/**
 * Simple lead mailer for market.teravox.ru — PHP 5.6 compatible.
 * Receives JSON POST from the landing form and emails it via mail().
 */

@ini_set('display_errors', '0');
@error_reporting(0);
@ini_set('log_errors', '1');

header('Content-Type: application/json; charset=UTF-8');

function lead_json_exit($ok, $message, $httpCode)
{
    if (!headers_sent()) {
        http_response_code((int) $httpCode);
    }
    $payload = array(
        'ok' => (bool) $ok,
        'message' => (string) $message,
    );
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function lead_fail()
{
    lead_json_exit(false, 'Не удалось отправить заявку. Попробуйте позже.', 400);
}

function lead_clean_header($value)
{
    $value = (string) $value;
    $value = str_replace(array("\r", "\n", "\0"), '', $value);
    return trim($value);
}

function lead_limit($value, $max)
{
    $value = trim((string) $value);
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, (int) $max, 'UTF-8');
    }
    return substr($value, 0, (int) $max);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    lead_json_exit(false, 'Не удалось отправить заявку. Попробуйте позже.', 405);
}

$maxBytes = 20000;
$contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
if ($contentLength > $maxBytes) {
    lead_fail();
}

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > $maxBytes) {
    lead_fail();
}

$data = json_decode($raw, true);
if (!is_array($data)) {
    // Fallback: classic form POST
    $data = $_POST;
}
if (!is_array($data)) {
    lead_fail();
}

// Honeypot — bots fill this; humans leave it empty.
$honeypot = '';
if (isset($data['hp_trap'])) {
    $honeypot = trim((string) $data['hp_trap']);
}
if ($honeypot !== '') {
    // Silent success to avoid teaching bots.
    lead_json_exit(true, 'Заявка принята. Мы свяжемся с вами.', 200);
}

$name = lead_limit(isset($data['name']) ? $data['name'] : '', 120);
$phone = lead_limit(isset($data['phone']) ? $data['phone'] : '', 64);
$email = lead_limit(isset($data['email']) ? $data['email'] : '', 180);
$comment = lead_limit(isset($data['comment']) ? $data['comment'] : '', 2000);
$referral = lead_limit(isset($data['referral_code']) ? $data['referral_code'] : '', 64);
$utmSource = lead_limit(isset($data['utm_source']) ? $data['utm_source'] : '', 120);
$utmMedium = lead_limit(isset($data['utm_medium']) ? $data['utm_medium'] : '', 120);
$utmCampaign = lead_limit(isset($data['utm_campaign']) ? $data['utm_campaign'] : '', 120);
$utmContent = lead_limit(isset($data['utm_content']) ? $data['utm_content'] : '', 120);
$utmTerm = lead_limit(isset($data['utm_term']) ? $data['utm_term'] : '', 120);
$landingUrl = lead_limit(isset($data['landing_url']) ? $data['landing_url'] : '', 500);

if ($name === '' && $phone === '' && $email === '') {
    lead_fail();
}

if ($phone === '' && $email === '') {
    lead_fail();
}

$emailValid = false;
if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $emailValid = true;
} elseif ($email !== '') {
    // Invalid email provided — drop it rather than poison headers.
    $email = '';
}

$to = 'itnovok@gmail.com';
$subject = 'Новая заявка — Market TeraVox';
if ($referral !== '') {
    $subject .= ' — ref: ' . lead_clean_header($referral);
}
$subject = lead_clean_header($subject);

$lines = array(
    'Новая заявка с market.teravox.ru',
    '',
    'Имя: ' . $name,
    'Телефон: ' . $phone,
    'Email: ' . $email,
    'Комментарий: ' . $comment,
    '',
    'Реферал: ' . $referral,
    'UTM Source: ' . $utmSource,
    'UTM Medium: ' . $utmMedium,
    'UTM Campaign: ' . $utmCampaign,
    'UTM Content: ' . $utmContent,
    'UTM Term: ' . $utmTerm,
    '',
    'Страница: ' . $landingUrl,
    'Дата: ' . date('Y-m-d H:i:s'),
);
$body = implode("\n", $lines);

$from = 'noreply@market.teravox.ru';
$headers = array();
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'Content-Transfer-Encoding: 8bit';
$headers[] = 'From: ' . lead_clean_header($from);
$headers[] = 'X-Mailer: PHP/' . phpversion();

if ($emailValid) {
    $headers[] = 'Reply-To: ' . lead_clean_header($email);
}

$headersStr = implode("\r\n", $headers);

$sent = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headersStr);

if (!$sent) {
    lead_json_exit(false, 'Не удалось отправить заявку. Попробуйте позже.', 500);
}

lead_json_exit(true, 'Заявка принята. Мы свяжемся с вами.', 200);

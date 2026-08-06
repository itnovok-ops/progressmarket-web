<?php
declare(strict_types=1);

namespace LifeOS;

final class LeadPayloadValidator
{
    /**
     * @param array<string, mixed> $body
     * @return array{ok: true, payload: array<string, string>} | array{ok: false, error: string, message: string}
     */
    public static function validate(array $body, array $config): array
    {
        $hp = isset($body['hp_trap']) ? trim((string)$body['hp_trap']) : '';
        if ($hp !== '') {
            return ['ok' => true, 'payload' => ['_honeypot' => '1']];
        }

        $name = isset($body['name']) ? trim((string)$body['name']) : '';
        $phone = isset($body['phone']) ? trim((string)$body['phone']) : '';
        $email = isset($body['email']) ? trim((string)$body['email']) : '';
        $comment = isset($body['comment']) ? trim((string)$body['comment']) : '';
        $projectType = isset($body['project_type']) ? trim((string)$body['project_type']) : 'dropshipping';
        $source = isset($body['source']) ? trim((string)$body['source']) : 'landing';

        if ($name === '' || $phone === '') {
            return [
                'ok' => false,
                'error' => 'validation',
                'message' => 'Заполните имя и телефон.',
            ];
        }

        $phoneNorm = self::normalizeRuPhone($phone);
        if ($phoneNorm === null) {
            return [
                'ok' => false,
                'error' => 'validation',
                'message' => 'Укажите корректный российский номер: +7 и 10 цифр.',
            ];
        }

        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return [
                'ok' => false,
                'error' => 'validation',
                'message' => 'Укажите корректный email.',
            ];
        }

        $allowedTypes = $config['allowed_project_types'] ?? ['dropshipping', 'nika_audit', 'abc_photo'];
        if (!in_array($projectType, $allowedTypes, true)) {
            return [
                'ok' => false,
                'error' => 'validation',
                'message' => 'Недопустимый project_type.',
            ];
        }

        $allowedSources = $config['allowed_sources'] ?? ['landing', 'telegram', 'vk', 'ads'];
        if (!in_array($source, $allowedSources, true)) {
            return [
                'ok' => false,
                'error' => 'validation',
                'message' => 'Недопустимый source.',
            ];
        }

        return [
            'ok' => true,
            'payload' => [
                'name' => $name,
                'phone' => $phoneNorm,
                'email' => $email,
                'comment' => $comment,
                'project_type' => $projectType,
                'source' => $source,
            ],
        ];
    }

    public static function normalizeRuPhone(string $raw): ?string
    {
        $d = preg_replace('/\D+/u', '', $raw);
        if ($d === '') {
            return null;
        }
        if (strlen($d) === 11 && $d[0] === '8') {
            $d = '7' . substr($d, 1);
        }
        if (strlen($d) === 10 && isset($d[0]) && $d[0] === '9') {
            $d = '7' . $d;
        }
        if (strlen($d) !== 11 || $d[0] !== '7') {
            return null;
        }
        if (!preg_match('/^7\d{10}$/', $d)) {
            return null;
        }

        return '+' . $d;
    }
}

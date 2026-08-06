<?php
declare(strict_types=1);

namespace MarketV11;

/**
 * Canonical lead shape + server-side validation.
 * Server-side validation is authoritative — the client form validates too, but this
 * class never trusts client input, including referral_code and UTM values.
 */
final class Lead
{
    public const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

    /**
     * @param array<string,mixed> $input Decoded JSON body from the client.
     * @return array{lead: array<string,mixed>, errors: string[]}
     */
    public static function fromInput(array $input, string $ipHash, string $userAgentShort): array
    {
        $errors = [];

        $name = self::cleanString($input['name'] ?? '', 120);
        $phone = self::cleanPhone((string) ($input['phone'] ?? ''));
        $email = self::cleanEmail((string) ($input['email'] ?? ''));
        $comment = self::cleanString($input['comment'] ?? '', 2000);

        if ($name === '') {
            $errors[] = 'name_required';
        }
        if ($phone === '' && $email === '') {
            $errors[] = 'contact_required';
        }
        if ($phone !== '' && !self::isValidPhone($phone)) {
            $errors[] = 'phone_invalid';
        }
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $errors[] = 'email_invalid';
        }

        $referral = self::cleanReferralCode((string) ($input['referral_code'] ?? ''));

        $utm = [];
        foreach (self::UTM_KEYS as $key) {
            $utm[$key] = self::cleanString($input[$key] ?? '', 128);
        }

        $landingUrl = self::cleanUrl((string) ($input['landing_url'] ?? ''));

        $lead = [
            'lead_id' => self::generateId(),
            'created_at' => gmdate('c'),
            'name' => $name,
            'phone' => $phone,
            'email' => $email,
            'comment' => $comment,
            'referral_code' => $referral,
            'utm_source' => $utm['utm_source'],
            'utm_medium' => $utm['utm_medium'],
            'utm_campaign' => $utm['utm_campaign'],
            'utm_content' => $utm['utm_content'],
            'utm_term' => $utm['utm_term'],
            'landing_url' => $landingUrl,
            'status' => 'NEW',
            'ip_hash' => $ipHash,
            'user_agent_short' => $userAgentShort,
        ];

        return ['lead' => $lead, 'errors' => $errors];
    }

    public static function generateId(): string
    {
        return gmdate('Ymd') . '-' . bin2hex(random_bytes(6));
    }

    public static function cleanString(mixed $value, int $maxLen): string
    {
        $str = trim((string) $value);
        $str = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $str) ?? '';
        if (function_exists('mb_substr')) {
            return mb_substr($str, 0, $maxLen);
        }
        return substr($str, 0, $maxLen);
    }

    public static function cleanPhone(string $value): string
    {
        $trimmed = trim($value);
        // Keep a leading + and digits only.
        $digits = preg_replace('/[^0-9+]/', '', $trimmed) ?? '';
        return substr($digits, 0, 20);
    }

    public static function isValidPhone(string $phone): bool
    {
        $digitsOnly = preg_replace('/\D/', '', $phone) ?? '';
        return strlen($digitsOnly) >= 10 && strlen($digitsOnly) <= 15;
    }

    public static function cleanEmail(string $value): string
    {
        return self::cleanString($value, 190);
    }

    public static function cleanReferralCode(string $value): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }
        if (preg_match('/^[a-zA-Z0-9_-]{1,64}$/', $trimmed) === 1) {
            return $trimmed;
        }
        return '';
    }

    public static function cleanUrl(string $value): string
    {
        $trimmed = self::cleanString($value, 512);
        if ($trimmed === '') {
            return '';
        }
        if (!preg_match('#^https?://#i', $trimmed)) {
            return '';
        }
        return $trimmed;
    }
}

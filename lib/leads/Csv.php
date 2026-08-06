<?php
declare(strict_types=1);

namespace MarketV11;

/**
 * CSV export helpers with formula-injection protection: any field beginning with
 * =, +, -, or @ is prefixed with a leading apostrophe so spreadsheet apps treat it
 * as text, not a formula.
 */
final class Csv
{
    public static function sanitizeField(mixed $value): string
    {
        $str = (string) $value;
        if ($str !== '' && in_array($str[0], ['=', '+', '-', '@'], true)) {
            return "'" . $str;
        }
        return $str;
    }

    /** @param array<int,string> $row */
    public static function writeRow($handle, array $row): void
    {
        $sanitized = array_map([self::class, 'sanitizeField'], $row);
        fputcsv($handle, $sanitized);
    }
}

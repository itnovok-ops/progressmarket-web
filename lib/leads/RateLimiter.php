<?php
declare(strict_types=1);

namespace MarketV11;

/**
 * Minimal file-based per-key rate limiter (sliding window). Good enough for a
 * single-server demo/V1.1 deployment; not a substitute for edge/WAF rate limiting.
 */
final class RateLimiter
{
    private string $dir;

    public function __construct(?string $dir = null)
    {
        $this->dir = $dir ?? LeadRepositoryFactory::storageDir() . '/ratelimit';
        if (!is_dir($this->dir)) {
            mkdir($this->dir, 0770, true);
        }
        $htaccess = $this->dir . '/.htaccess';
        if (!is_file($htaccess)) {
            file_put_contents($htaccess, "Require all denied\nDeny from all\n");
        }
    }

    /**
     * @return bool true if the request is allowed, false if the limit was exceeded.
     */
    public function allow(string $key, int $maxRequests, int $windowSeconds): bool
    {
        $safeKey = preg_replace('/[^a-zA-Z0-9]/', '', $key) ?? '';
        if ($safeKey === '') {
            $safeKey = 'unknown';
        }
        $path = $this->dir . '/' . $safeKey . '.txt';
        $now = time();

        $handle = fopen($path, 'c+');
        if ($handle === false) {
            // If we can't rate-limit, fail open rather than blocking real leads.
            return true;
        }

        try {
            flock($handle, LOCK_EX);
            $contents = stream_get_contents($handle);
            $timestamps = $contents ? array_filter(array_map('intval', explode("\n", trim($contents)))) : [];
            $timestamps = array_values(array_filter($timestamps, static fn ($ts) => $ts > $now - $windowSeconds));

            $allowed = count($timestamps) < $maxRequests;
            if ($allowed) {
                $timestamps[] = $now;
            }

            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, implode("\n", $timestamps));
            fflush($handle);
            flock($handle, LOCK_UN);
        } finally {
            fclose($handle);
        }

        return $allowed;
    }
}

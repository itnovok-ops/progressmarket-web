<?php
declare(strict_types=1);

namespace MarketV11;

final class SqliteLeadRepository implements LeadRepository
{
    private \PDO $pdo;

    public function __construct(string $dbPath)
    {
        $this->pdo = new \PDO('sqlite:' . $dbPath);
        $this->pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->pdo->exec('PRAGMA journal_mode = WAL');
        $this->migrate();
    }

    private function migrate(): void
    {
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS leads (
                lead_id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                name TEXT NOT NULL,
                phone TEXT NOT NULL DEFAULT "",
                email TEXT NOT NULL DEFAULT "",
                comment TEXT NOT NULL DEFAULT "",
                referral_code TEXT NOT NULL DEFAULT "",
                utm_source TEXT NOT NULL DEFAULT "",
                utm_medium TEXT NOT NULL DEFAULT "",
                utm_campaign TEXT NOT NULL DEFAULT "",
                utm_content TEXT NOT NULL DEFAULT "",
                utm_term TEXT NOT NULL DEFAULT "",
                landing_url TEXT NOT NULL DEFAULT "",
                status TEXT NOT NULL DEFAULT "NEW",
                ip_hash TEXT NOT NULL DEFAULT "",
                user_agent_short TEXT NOT NULL DEFAULT ""
            )'
        );
        $this->pdo->exec('CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at)');
        $this->pdo->exec('CREATE INDEX IF NOT EXISTS idx_leads_referral ON leads(referral_code)');
    }

    public function insert(array $lead): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO leads (
                lead_id, created_at, name, phone, email, comment, referral_code,
                utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                landing_url, status, ip_hash, user_agent_short
            ) VALUES (
                :lead_id, :created_at, :name, :phone, :email, :comment, :referral_code,
                :utm_source, :utm_medium, :utm_campaign, :utm_content, :utm_term,
                :landing_url, :status, :ip_hash, :user_agent_short
            )'
        );
        $stmt->execute([
            'lead_id' => $lead['lead_id'],
            'created_at' => $lead['created_at'],
            'name' => $lead['name'],
            'phone' => $lead['phone'],
            'email' => $lead['email'],
            'comment' => $lead['comment'],
            'referral_code' => $lead['referral_code'],
            'utm_source' => $lead['utm_source'],
            'utm_medium' => $lead['utm_medium'],
            'utm_campaign' => $lead['utm_campaign'],
            'utm_content' => $lead['utm_content'],
            'utm_term' => $lead['utm_term'],
            'landing_url' => $lead['landing_url'],
            'status' => $lead['status'],
            'ip_hash' => $lead['ip_hash'],
            'user_agent_short' => $lead['user_agent_short'],
        ]);
    }

    public function query(array $filters, int $limit, int $offset): array
    {
        [$where, $params] = $this->buildWhere($filters);
        $sql = 'SELECT * FROM leads' . $where . ' ORDER BY created_at DESC LIMIT :limit OFFSET :offset';
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    public function count(array $filters): int
    {
        [$where, $params] = $this->buildWhere($filters);
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM leads' . $where);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn();
    }

    /** @return array{0:string,1:array<string,mixed>} */
    private function buildWhere(array $filters): array
    {
        $clauses = [];
        $params = [];

        if (!empty($filters['referral_code'])) {
            $clauses[] = 'referral_code = :referral_code';
            $params[':referral_code'] = (string) $filters['referral_code'];
        }
        if (!empty($filters['date_from'])) {
            $clauses[] = 'created_at >= :date_from';
            $params[':date_from'] = (string) $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $clauses[] = 'created_at <= :date_to';
            $params[':date_to'] = (string) $filters['date_to'];
        }
        if (!empty($filters['search'])) {
            $clauses[] = "(name LIKE :search ESCAPE '\\' OR phone LIKE :search ESCAPE '\\' OR email LIKE :search ESCAPE '\\')";
            $params[':search'] = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], (string) $filters['search']) . '%';
        }

        if ($clauses === []) {
            return ['', $params];
        }
        return [' WHERE ' . implode(' AND ', $clauses), $params];
    }
}

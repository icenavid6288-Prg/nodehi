<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Category;
use App\Models\HeroSlide;
use App\Models\LoyaltyTier;
use App\Models\Product;
use Illuminate\Database\MySqlConnection;
use Illuminate\Database\Schema\Grammars\MySqlGrammar;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * سازگاری مهاجرت‌ها با MySQL.
 *
 * MySQL (برخلاف SQLite) روی ستون‌های TEXT/JSON مقدار پیش‌فرض نمی‌پذیرد و
 * مهاجرت با خطای «1101 BLOB, TEXT, GEOMETRY or JSON column ... can't have a
 * default value» شکست می‌خورد. این تست DDL را برای درایور MySQL می‌سازد
 * (بدون اتصال واقعی) و مطمئن می‌شود پیش‌فرض‌ها به مدل‌ها منتقل شده‌اند.
 */
class MySqlSchemaTest extends TestCase
{
    public function test_migrations_compile_for_mysql_without_text_or_json_defaults(): void
    {
        $connection = $this->recordingMysqlConnection();
        $previous = DB::getDefaultConnection();

        try {
            DB::setDefaultConnection('mysql_ddl_check');

            foreach (glob(database_path('migrations/*.php')) as $file) {
                (require $file)->up();
            }
        } finally {
            DB::setDefaultConnection($previous);
        }

        $this->assertNotEmpty($connection->log, 'هیچ DDL‌ای برای MySQL ساخته نشد.');

        foreach ($connection->log as $sql) {
            $this->assertDoesNotMatchRegularExpression(
                '/\b(TEXT|LONGTEXT|MEDIUMTEXT|JSON)\b[^,]*DEFAULT/i',
                $sql,
                "ستون TEXT/JSON با مقدار پیش‌فرض در MySQL شکست می‌خورد:\n{$sql}"
            );
        }
    }

    public function test_models_supply_defaults_formerly_set_on_text_columns(): void
    {
        $this->assertSame('', (new Category)->description);
        $this->assertSame('', (new Category)->seo_intro);

        $product = new Product;
        $this->assertSame('', $product->description);
        $this->assertSame([], $product->highlights);
        $this->assertSame([], $product->specs);
        $this->assertSame([], $product->attributes);
        $this->assertSame([], $product->images);
        $this->assertSame([], $product->tags);
        $this->assertSame([], $product->related_slugs);

        $this->assertSame([], (new Article)->keywords);
        $this->assertSame([], (new LoyaltyTier)->perks);
        $this->assertSame([], (new HeroSlide)->features);
    }

    private function recordingMysqlConnection(): MySqlConnection
    {
        config(['database.connections.mysql_ddl_check' => ['driver' => 'mysql', 'database' => 'noudal_database']]);

        $connection = new class(fn () => null, 'noudal_database') extends MySqlConnection
        {
            /** @var string[] */
            public array $log = [];

            public function statement($query, $bindings = [], $useReadPdo = true)
            {
                $this->log[] = $query;

                return true;
            }

            public function getServerVersion(): string
            {
                return '8.0.36';
            }

            public function isMaria()
            {
                return false;
            }
        };

        $connection->setSchemaGrammar(new MySqlGrammar($connection));
        DB::extend('mysql_ddl_check', fn () => $connection);

        return $connection;
    }
}

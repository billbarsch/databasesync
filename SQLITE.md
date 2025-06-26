# Database Sync - Documentação SQLite

## 📊 Banco de Dados Local

A aplicação Database Sync utiliza SQLite como banco de dados local para persistir informações importantes. Isso garante que suas configurações e histórico sejam mantidos entre sessões da aplicação.

## 📍 Localização do Banco

O arquivo `databasesync.db` é criado automaticamente no diretório de dados do usuário:

- **Windows**: `%APPDATA%/Database Sync/databasesync.db`
- **macOS**: `~/Library/Application Support/Database Sync/databasesync.db`
- **Linux**: `~/.config/Database Sync/databasesync.db`

## 🗃️ Estrutura das Tabelas

### 1. db_configs
Armazena as configurações de conexão dos bancos MySQL.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária auto-incremento |
| config_name | TEXT | Nome da configuração ('database1' ou 'database2') |
| host | TEXT | Endereço do servidor MySQL |
| port | INTEGER | Porta do MySQL |
| user | TEXT | Nome de usuário |
| password | TEXT | Senha (pode ser vazia) |
| database_name | TEXT | Nome do banco de dados |
| is_active | INTEGER | 1 = ativo, 0 = inativo |
| created_at | DATETIME | Data de criação |
| updated_at | DATETIME | Data da última atualização |

### 2. comparison_history
Mantém o histórico de todas as comparações realizadas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária auto-incremento |
| db1_name | TEXT | Nome do primeiro banco |
| db2_name | TEXT | Nome do segundo banco |
| total_tables | INTEGER | Total de tabelas encontradas |
| different_tables | INTEGER | Tabelas com diferenças |
| same_tables | INTEGER | Tabelas iguais |
| missing_tables | INTEGER | Tabelas faltantes |
| comparison_data | TEXT | JSON com dados completos |
| created_at | DATETIME | Data da comparação |

### 3. app_settings
Configurações gerais da aplicação.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| key | TEXT | Chave da configuração |
| value | TEXT | Valor em formato JSON |
| updated_at | DATETIME | Data da última atualização |

## 🔍 Consultas Úteis

### Visualizar configurações ativas
```sql
SELECT config_name, host, port, user, database_name, updated_at 
FROM db_configs 
WHERE is_active = 1;
```

### Histórico das últimas comparações
```sql
SELECT db1_name, db2_name, total_tables, different_tables, 
       datetime(created_at, 'localtime') as data_comparacao
FROM comparison_history 
ORDER BY created_at DESC 
LIMIT 10;
```

### Comparações com diferenças
```sql
SELECT db1_name, db2_name, different_tables, missing_tables,
       datetime(created_at, 'localtime') as data_comparacao
FROM comparison_history 
WHERE different_tables > 0 OR missing_tables > 0
ORDER BY created_at DESC;
```

### Estatísticas do histórico
```sql
SELECT 
    COUNT(*) as total_comparacoes,
    AVG(total_tables) as media_tabelas,
    SUM(different_tables) as total_diferencas,
    datetime(MAX(created_at), 'localtime') as ultima_comparacao
FROM comparison_history;
```

## 📦 Backup e Restore

### Fazer Backup
```bash
# Copiar o arquivo de banco para backup
cp "C:\Users\[USERNAME]\AppData\Roaming\Database Sync\databasesync.db" backup_databasesync.db
```

### Restaurar Backup
```bash
# Substituir o arquivo atual pelo backup
cp backup_databasesync.db "C:\Users\[USERNAME]\AppData\Roaming\Database Sync\databasesync.db"
```

## 🛠️ Ferramentas Recomendadas

Para visualizar e editar o banco SQLite manualmente:

1. **DB Browser for SQLite** (Gratuito)
   - Download: https://sqlitebrowser.org/
   - Interface gráfica amigável
   - Visualização de dados e estrutura

2. **SQLite Studio** (Gratuito)
   - Download: https://sqlitestudio.pl/
   - Editor SQL avançado
   - Suporte a plugins

3. **VS Code com extensão SQLite**
   - Extensão: SQLite Viewer
   - Integração com o editor de código

## 🚨 Considerações de Segurança

### Senhas
- As senhas são armazenadas em texto simples no SQLite
- Para segurança adicional, considere criptografar senhas sensíveis
- Mantenha o arquivo de banco seguro e com acesso restrito

### Backup Regular
- Configure backups automáticos do arquivo `databasesync.db`
- Mantenha backups em locais seguros
- Teste a restauração dos backups periodicamente

## 🔧 Manutenção

### Limpeza do Histórico
Para manter o banco otimizado, você pode limpar registros antigos:

```sql
-- Manter apenas os últimos 100 registros
DELETE FROM comparison_history 
WHERE id NOT IN (
    SELECT id FROM comparison_history 
    ORDER BY created_at DESC 
    LIMIT 100
);

-- Executar VACUUM para otimizar o banco
VACUUM;
```

### Verificação de Integridade
```sql
-- Verificar integridade do banco
PRAGMA integrity_check;

-- Verificar estatísticas do banco
PRAGMA table_info(db_configs);
PRAGMA table_info(comparison_history);
PRAGMA table_info(app_settings);
```

## 📈 Análises Avançadas

### Frequência de Uso
```sql
SELECT 
    db1_name || ' -> ' || db2_name as conexao,
    COUNT(*) as total_comparacoes,
    datetime(MAX(created_at), 'localtime') as ultima_vez
FROM comparison_history 
GROUP BY db1_name, db2_name
ORDER BY total_comparacoes DESC;
```

### Tendências de Diferenças
```sql
SELECT 
    DATE(created_at) as data,
    AVG(different_tables) as media_diferencas,
    COUNT(*) as total_comparacoes
FROM comparison_history 
WHERE created_at >= datetime('now', '-30 days')
GROUP BY DATE(created_at)
ORDER BY data DESC;
```

---

**Nota**: O banco SQLite é gerenciado automaticamente pela aplicação. Estas informações são fornecidas para usuários avançados que desejam análises personalizadas ou manutenção manual. 
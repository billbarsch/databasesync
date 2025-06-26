-- ================================================
-- Database Sync - Estrutura do Banco SQLite
-- ================================================
-- Este arquivo mostra a estrutura das tabelas criadas
-- automaticamente pela aplicação para referência.
-- Tabela para armazenar configurações de conexão dos bancos MySQL
CREATE TABLE IF NOT EXISTS db_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_name TEXT NOT NULL,
    -- 'database1' ou 'database2'
    connection_name TEXT,
    -- Nome personalizado da conexão
    host TEXT NOT NULL,
    -- Endereço do servidor MySQL
    port INTEGER NOT NULL,
    -- Porta do MySQL (geralmente 3306)
    user TEXT NOT NULL,
    -- Nome de usuário do banco
    password TEXT,
    -- Senha do banco (pode ser vazia)
    database_name TEXT NOT NULL,
    -- Nome do banco de dados
    is_active INTEGER DEFAULT 1,
    -- 1 = ativo, 0 = inativo
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar histórico de comparações
CREATE TABLE IF NOT EXISTS comparison_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    db1_name TEXT NOT NULL,
    -- Nome do primeiro banco comparado
    db2_name TEXT NOT NULL,
    -- Nome do segundo banco comparado
    db1_display_name TEXT,
    -- Nome personalizado da primeira conexão
    db2_display_name TEXT,
    -- Nome personalizado da segunda conexão
    total_tables INTEGER NOT NULL,
    -- Total de tabelas encontradas
    different_tables INTEGER NOT NULL,
    -- Número de tabelas com diferenças
    same_tables INTEGER NOT NULL,
    -- Número de tabelas iguais
    missing_tables INTEGER NOT NULL,
    -- Número de tabelas faltantes
    comparison_data TEXT NOT NULL,
    -- JSON com dados completos da comparação
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para configurações gerais da aplicação
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    -- Chave da configuração
    value TEXT NOT NULL,
    -- Valor da configuração (JSON)
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- Exemplos de Consultas Úteis
-- ================================================
-- Buscar todas as configurações ativas
-- SELECT * FROM db_configs WHERE is_active = 1;
-- Buscar histórico das últimas 10 comparações
-- SELECT * FROM comparison_history ORDER BY created_at DESC LIMIT 10;
-- Buscar comparações com diferenças
-- SELECT * FROM comparison_history WHERE different_tables > 0;
-- Buscar configuração específica
-- SELECT * FROM app_settings WHERE key = 'theme';
-- ================================================
-- Exemplo de Dados
-- ================================================
-- Configuração de exemplo (inserida automaticamente pela aplicação)
/*
 INSERT INTO db_configs (config_name, connection_name, host, port, user, password, database_name) 
 VALUES ('database1', 'Servidor Local', 'localhost', 3306, 'root', '', 'sistema_vendas');
 
 INSERT INTO db_configs (config_name, connection_name, host, port, user, password, database_name) 
 VALUES ('database2', 'Produção', 'servidor-producao.com', 3306, 'admin', 'senha123', 'vendas_prod');
 */
-- Histórico de exemplo (inserido automaticamente após comparações)
/*
 INSERT INTO comparison_history (db1_name, db2_name, total_tables, different_tables, same_tables, missing_tables, comparison_data) 
 VALUES ('sistema_vendas', 'vendas_prod', 15, 3, 10, 2, '[{"tableName":"usuarios","count1":1500,"count2":1520,"exists1":true,"exists2":true,"different":true}]');
 */
-- Configuração de exemplo (inserida automaticamente pela aplicação)
/*
 INSERT INTO app_settings (key, value) 
 VALUES ('last_window_size', '{"width":1200,"height":800}');
 */
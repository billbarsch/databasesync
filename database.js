const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    // Inicializar o banco de dados
    async initialize() {
        if (this.isInitialized) return;

        const dbPath = path.join(app.getPath('userData'), 'databasesync.db');

        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Erro ao abrir banco SQLite:', err);
                    reject(err);
                    return;
                }

                console.log('Banco SQLite conectado:', dbPath);
                this.createTables()
                    .then(() => {
                        this.isInitialized = true;
                        resolve();
                    })
                    .catch(reject);
            });
        });
    }

    // Criar tabelas necessárias
    async createTables() {
        const tables = [
            // Tabela para projetos
            `CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabela para configurações de conexão
            `CREATE TABLE IF NOT EXISTS db_configs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                config_name TEXT NOT NULL,
                connection_name TEXT,
                host TEXT NOT NULL,
                port INTEGER NOT NULL,
                user TEXT NOT NULL,
                password TEXT,
                database_name TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
            )`,

            // Tabela para histórico de comparações
            `CREATE TABLE IF NOT EXISTS comparison_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                db1_name TEXT NOT NULL,
                db2_name TEXT NOT NULL,
                db1_display_name TEXT,
                db2_display_name TEXT,
                total_tables INTEGER NOT NULL,
                different_tables INTEGER NOT NULL,
                same_tables INTEGER NOT NULL,
                missing_tables INTEGER NOT NULL,
                comparison_data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
            )`,

            // Tabela para configurações da aplicação
            `CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabela para cache de comparação de tabelas
            `CREATE TABLE IF NOT EXISTS table_comparison_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                db1_config_hash TEXT NOT NULL,
                db2_config_hash TEXT NOT NULL,
                comparison_data TEXT NOT NULL,
                db1_display_name TEXT,
                db2_display_name TEXT,
                total_tables INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
            )`,

            // Tabela para filtros de busca de registros
            `CREATE TABLE IF NOT EXISTS table_filters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                table_name TEXT NOT NULL,
                database TEXT NOT NULL,
                filters_data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
                UNIQUE(project_id, table_name, database)
            )`
        ];

        for (const sql of tables) {
            await this.run(sql);
        }

        // Executar migrações para atualizar estruturas existentes
        await this.runMigrations();

        console.log('Tabelas SQLite criadas/verificadas');
    }

    // Executar migrações para atualizar estruturas de tabelas existentes
    async runMigrations() {
        try {
            console.log('🔄 Verificando e executando migrações...');

            // Migração 1: Adicionar coluna connection_name à tabela db_configs
            const hasConnectionName = await this.checkColumnExists('db_configs', 'connection_name');
            if (!hasConnectionName) {
                console.log('➕ Adicionando coluna connection_name à tabela db_configs...');
                await this.run(`ALTER TABLE db_configs ADD COLUMN connection_name TEXT`);
                console.log('✅ Coluna connection_name adicionada com sucesso');
            }

            // Migração 2: Adicionar colunas display_name à tabela comparison_history
            const hasDb1DisplayName = await this.checkColumnExists('comparison_history', 'db1_display_name');
            if (!hasDb1DisplayName) {
                console.log('➕ Adicionando coluna db1_display_name à tabela comparison_history...');
                await this.run(`ALTER TABLE comparison_history ADD COLUMN db1_display_name TEXT`);
                console.log('✅ Coluna db1_display_name adicionada com sucesso');
            }

            const hasDb2DisplayName = await this.checkColumnExists('comparison_history', 'db2_display_name');
            if (!hasDb2DisplayName) {
                console.log('➕ Adicionando coluna db2_display_name à tabela comparison_history...');
                await this.run(`ALTER TABLE comparison_history ADD COLUMN db2_display_name TEXT`);
                console.log('✅ Coluna db2_display_name adicionada com sucesso');
            }

            // Migração 3: Adicionar colunas project_id nas tabelas existentes
            const hasProjectIdInDbConfigs = await this.checkColumnExists('db_configs', 'project_id');
            if (!hasProjectIdInDbConfigs) {
                console.log('➕ Adicionando coluna project_id à tabela db_configs...');
                await this.run(`ALTER TABLE db_configs ADD COLUMN project_id INTEGER DEFAULT 1`);
                console.log('✅ Coluna project_id adicionada à tabela db_configs');
            }

            const hasProjectIdInHistory = await this.checkColumnExists('comparison_history', 'project_id');
            if (!hasProjectIdInHistory) {
                console.log('➕ Adicionando coluna project_id à tabela comparison_history...');
                await this.run(`ALTER TABLE comparison_history ADD COLUMN project_id INTEGER DEFAULT 1`);
                console.log('✅ Coluna project_id adicionada à tabela comparison_history');
            }

            const hasProjectIdInCache = await this.checkColumnExists('table_comparison_cache', 'project_id');
            if (!hasProjectIdInCache) {
                console.log('➕ Adicionando coluna project_id à tabela table_comparison_cache...');
                await this.run(`ALTER TABLE table_comparison_cache ADD COLUMN project_id INTEGER DEFAULT 1`);
                console.log('✅ Coluna project_id adicionada à tabela table_comparison_cache');
            }

            // Não criar mais projeto padrão automático
            // Os usuários criarão seus próprios projetos conforme necessário

            console.log('✅ Migrações concluídas com sucesso');
        } catch (error) {
            console.error('❌ Erro ao executar migrações:', error);
            throw error;
        }
    }

    // Verificar se uma coluna existe em uma tabela
    async checkColumnExists(tableName, columnName) {
        try {
            const result = await this.get(`PRAGMA table_info(${tableName})`);
            if (!result) return false;

            const columns = await this.all(`PRAGMA table_info(${tableName})`);
            return columns.some(col => col.name === columnName);
        } catch (error) {
            console.error(`Erro ao verificar coluna ${columnName} na tabela ${tableName}:`, error);
            return false;
        }
    }

    // Método auxiliar para executar queries
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) {
                    console.error('Erro ao executar query:', err);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Método auxiliar para buscar dados
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Erro ao buscar dados:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Método auxiliar para buscar múltiplos dados
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Erro ao buscar dados:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Criar novo projeto
    async createProject(name, description = '') {
        const sql = `INSERT INTO projects (name, description) VALUES (?, ?)`;
        return await this.run(sql, [name, description]);
    }

    // Listar todos os projetos
    async getAllProjects() {
        const sql = `SELECT * FROM projects WHERE is_active = 1 ORDER BY updated_at DESC`;
        return await this.all(sql);
    }

    // Buscar projeto por ID
    async getProject(id) {
        const sql = `SELECT * FROM projects WHERE id = ? AND is_active = 1`;
        return await this.get(sql, [id]);
    }

    // Atualizar projeto
    async updateProject(id, name, description) {
        const sql = `UPDATE projects SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        return await this.run(sql, [name, description, id]);
    }

    // Excluir projeto (e todos os dados relacionados)
    async deleteProject(id) {
        // Como configuramos ON DELETE CASCADE, todos os dados relacionados serão removidos automaticamente
        const sql = `DELETE FROM projects WHERE id = ?`;
        return await this.run(sql, [id]);
    }

    // Salvar configuração de banco
    async saveDbConfig(configName, config, projectId = 1) {
        const sql = `INSERT OR REPLACE INTO db_configs 
                     (project_id, config_name, connection_name, host, port, user, password, database_name, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;

        const params = [
            projectId,
            configName,
            config.connectionName || `Banco ${configName === 'database1' ? '1' : '2'}`,
            config.host,
            config.port,
            config.user,
            config.password || '',
            config.database
        ];

        return await this.run(sql, params);
    }

    // Buscar configuração de banco por projeto
    async getDbConfig(configName, projectId = 1) {
        const sql = `SELECT * FROM db_configs WHERE config_name = ? AND project_id = ? AND is_active = 1`;
        const row = await this.get(sql, [configName, projectId]);

        if (row) {
            return {
                connectionName: row.connection_name,
                host: row.host,
                port: row.port,
                user: row.user,
                password: row.password,
                database: row.database_name
            };
        }

        return null;
    }

    // Listar todas as configurações por projeto
    async getAllDbConfigs(projectId = 1) {
        const sql = `SELECT * FROM db_configs WHERE project_id = ? AND is_active = 1 ORDER BY updated_at DESC`;
        const rows = await this.all(sql, [projectId]);

        return rows.map(row => ({
            id: row.id,
            configName: row.config_name,
            connectionName: row.connection_name,
            host: row.host,
            port: row.port,
            user: row.user,
            database: row.database_name,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }

    // Salvar histórico de comparação
    async saveComparisonHistory(db1Name, db2Name, comparisonData, db1DisplayName = null, db2DisplayName = null, projectId = 1) {
        const totalTables = comparisonData.length;
        const differentTables = comparisonData.filter(item => item.different).length;
        const sameTables = comparisonData.filter(item => !item.different && item.exists1 && item.exists2).length;
        const missingTables = comparisonData.filter(item => !item.exists1 || !item.exists2).length;

        const sql = `INSERT INTO comparison_history 
                     (project_id, db1_name, db2_name, db1_display_name, db2_display_name, total_tables, different_tables, same_tables, missing_tables, comparison_data) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            projectId,
            db1Name,
            db2Name,
            db1DisplayName,
            db2DisplayName,
            totalTables,
            differentTables,
            sameTables,
            missingTables,
            JSON.stringify(comparisonData)
        ];

        return await this.run(sql, params);
    }

    // Buscar histórico de comparações por projeto
    async getComparisonHistory(projectId = 1, limit = 10) {
        const sql = `SELECT * FROM comparison_history 
                     WHERE project_id = ?
                     ORDER BY created_at DESC 
                     LIMIT ?`;

        const rows = await this.all(sql, [projectId, limit]);

        return rows.map(row => ({
            id: row.id,
            db1Name: row.db1_name,
            db2Name: row.db2_name,
            db1DisplayName: row.db1_display_name || row.db1_name,
            db2DisplayName: row.db2_display_name || row.db2_name,
            totalTables: row.total_tables,
            differentTables: row.different_tables,
            sameTables: row.same_tables,
            missingTables: row.missing_tables,
            comparisonData: JSON.parse(row.comparison_data),
            createdAt: row.created_at
        }));
    }

    // Excluir histórico de comparação
    async deleteComparisonHistory(id) {
        const sql = `DELETE FROM comparison_history WHERE id = ?`;
        return await this.run(sql, [id]);
    }

    // Limpar todo o histórico de comparações de um projeto
    async clearAllComparisonHistory(projectId = 1) {
        const sql = `DELETE FROM comparison_history WHERE project_id = ?`;
        return await this.run(sql, [projectId]);
    }

    // Salvar configuração da aplicação
    async setSetting(key, value) {
        const sql = `INSERT OR REPLACE INTO app_settings (key, value, updated_at) 
                     VALUES (?, ?, CURRENT_TIMESTAMP)`;

        return await this.run(sql, [key, JSON.stringify(value)]);
    }

    // Buscar configuração da aplicação
    async getSetting(key, defaultValue = null) {
        const sql = `SELECT value FROM app_settings WHERE key = ?`;
        const row = await this.get(sql, [key]);

        if (row) {
            try {
                return JSON.parse(row.value);
            } catch (e) {
                return row.value;
            }
        }

        return defaultValue;
    }

    // Gerar hash para configuração de banco (para cache)
    generateConfigHash(config) {
        const configString = `${config.host}:${config.port}:${config.user}:${config.database}`;
        return Buffer.from(configString).toString('base64');
    }

    // Salvar cache de comparação de tabelas
    async saveTableComparisonCache(db1Config, db2Config, comparisonData, db1DisplayName, db2DisplayName, projectId = 1) {
        // Limpar cache anterior para as mesmas configurações
        await this.clearTableComparisonCache(db1Config, db2Config, projectId);

        const db1Hash = this.generateConfigHash(db1Config);
        const db2Hash = this.generateConfigHash(db2Config);
        const totalTables = comparisonData.length;

        const sql = `INSERT INTO table_comparison_cache 
                     (project_id, db1_config_hash, db2_config_hash, comparison_data, db1_display_name, db2_display_name, total_tables) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            projectId,
            db1Hash,
            db2Hash,
            JSON.stringify(comparisonData),
            db1DisplayName,
            db2DisplayName,
            totalTables
        ];

        return await this.run(sql, params);
    }

    // Buscar cache de comparação de tabelas
    async getTableComparisonCache(db1Config, db2Config, projectId = 1) {
        const db1Hash = this.generateConfigHash(db1Config);
        const db2Hash = this.generateConfigHash(db2Config);

        const sql = `SELECT * FROM table_comparison_cache 
                     WHERE project_id = ? AND db1_config_hash = ? AND db2_config_hash = ? 
                     ORDER BY created_at DESC 
                     LIMIT 1`;

        const row = await this.get(sql, [projectId, db1Hash, db2Hash]);

        if (row) {
            return {
                id: row.id,
                comparisonData: JSON.parse(row.comparison_data),
                db1DisplayName: row.db1_display_name,
                db2DisplayName: row.db2_display_name,
                totalTables: row.total_tables,
                createdAt: row.created_at
            };
        }

        return null;
    }

    // Limpar cache de comparação de tabelas para configurações específicas
    async clearTableComparisonCache(db1Config, db2Config, projectId = 1) {
        const db1Hash = this.generateConfigHash(db1Config);
        const db2Hash = this.generateConfigHash(db2Config);

        const sql = `DELETE FROM table_comparison_cache 
                     WHERE project_id = ? AND db1_config_hash = ? AND db2_config_hash = ?`;

        return await this.run(sql, [projectId, db1Hash, db2Hash]);
    }

    // Limpar todo o cache de comparação de um projeto
    async clearAllTableComparisonCache(projectId = 1) {
        const sql = `DELETE FROM table_comparison_cache WHERE project_id = ?`;
        return await this.run(sql, [projectId]);
    }

    // === MÉTODOS PARA FILTROS DE TABELAS ===

    // Salvar filtros de uma tabela e banco específicos
    async saveTableFilters(projectId, tableName, database, filters) {
        const sql = `INSERT OR REPLACE INTO table_filters 
                     (project_id, table_name, database, filters_data, updated_at) 
                     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;

        const filtersJson = JSON.stringify(filters);
        return await this.run(sql, [projectId, tableName, database, filtersJson]);
    }

    // Buscar filtros salvos para uma tabela e banco específicos
    async getTableFilters(projectId, tableName, database) {
        const sql = `SELECT filters_data FROM table_filters 
                     WHERE project_id = ? AND table_name = ? AND database = ?`;

        const row = await this.get(sql, [projectId, tableName, database]);

        if (row) {
            try {
                return JSON.parse(row.filters_data);
            } catch (error) {
                console.error('Erro ao parsear filtros salvos:', error);
                return [];
            }
        }

        return [];
    }

    // Limpar filtros salvos de uma tabela específica
    async clearTableFilters(projectId, tableName) {
        const sql = `DELETE FROM table_filters 
                     WHERE project_id = ? AND table_name = ?`;
        return await this.run(sql, [projectId, tableName]);
    }

    // Listar todas as tabelas com filtros salvos para um projeto
    async getTablesWithFilters(projectId) {
        const sql = `SELECT DISTINCT table_name, database, updated_at 
                     FROM table_filters 
                     WHERE project_id = ? 
                     ORDER BY updated_at DESC`;
        return await this.all(sql, [projectId]);
    }

    // Fechar conexão com o banco
    close() {
        if (this.db && this.isInitialized) {
            this.db.close((err) => {
                if (err) {
                    console.error('Erro ao fechar banco SQLite:', err);
                } else {
                    console.log('Banco SQLite fechado');
                }
            });
            this.db = null;
            this.isInitialized = false;
        }
    }
}

// Exportar instância singleton
const dbManager = new DatabaseManager();
module.exports = dbManager; 
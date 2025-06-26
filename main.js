const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const mysql = require('mysql2/promise');
const dbManager = require('./database');

let mainWindow;
let configWindow;
let compareWindow;
let historyWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'assets/icon.png')
    });

    mainWindow.loadFile('index.html');

    // Menu principal
    const menu = Menu.buildFromTemplate([
        {
            label: 'Arquivo',
            submenu: [
                {
                    label: 'Configurar Conexões',
                    click: () => openConfigWindow()
                },
                {
                    label: 'Comparar Tabelas',
                    click: () => openCompareWindow(),
                    enabled: false,
                    id: 'compare-menu'
                },
                {
                    label: 'Histórico de Comparações',
                    click: () => openHistoryWindow()
                },
                { type: 'separator' },
                {
                    label: 'Sair',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'Ajuda',
            submenu: [
                {
                    label: 'Sobre',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Sobre Database Sync',
                            message: 'Database Sync v1.0.0',
                            detail: 'Aplicação para sincronização e comparação de bancos de dados MySQL'
                        });
                    }
                }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);
}

function openConfigWindow() {
    console.log('🚀 Tentando abrir janela de configuração...');

    if (configWindow) {
        console.log('⚡ Janela já existe, dando foco...');
        configWindow.focus();
        return;
    }

    try {
        console.log('📱 Criando nova janela de configuração...');
        configWindow = new BrowserWindow({
            width: 600,
            height: 500,
            parent: mainWindow,
            modal: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        console.log('📄 Carregando config.html...');
        configWindow.loadFile('config.html');

        configWindow.on('closed', () => {
            console.log('❌ Janela de configuração fechada');
            configWindow = null;
        });

        configWindow.on('ready-to-show', () => {
            console.log('✅ Janela de configuração pronta e visível');
        });

        console.log('🎉 Janela de configuração criada com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao criar janela de configuração:', error);
    }
}

function openCompareWindow() {
    if (compareWindow) {
        compareWindow.focus();
        return;
    }

    compareWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    compareWindow.loadFile('compare.html');

    compareWindow.on('closed', () => {
        compareWindow = null;
    });
}

function openHistoryWindow() {
    if (historyWindow) {
        historyWindow.focus();
        return;
    }

    historyWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    historyWindow.loadFile('history.html');

    historyWindow.on('closed', () => {
        historyWindow = null;
    });
}

// IPC Handlers
ipcMain.handle('test-connection', async (event, config) => {
    try {
        const connection = await mysql.createConnection(config);
        await connection.execute('SELECT 1');
        await connection.end();
        return { success: true, message: 'Conexão realizada com sucesso!' };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('save-config', async (event, config1, config2) => {
    try {
        // Salvar configurações no SQLite
        await dbManager.saveDbConfig('database1', config1);
        await dbManager.saveDbConfig('database2', config2);

        // Ativar menu de comparação
        const menu = Menu.getApplicationMenu();
        const compareMenuItem = menu.getMenuItemById('compare-menu');
        if (compareMenuItem) {
            compareMenuItem.enabled = true;
        }

        return { success: true };
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('get-config', async () => {
    try {
        const config1 = await dbManager.getDbConfig('database1');
        const config2 = await dbManager.getDbConfig('database2');

        return { config1, config2 };
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        return { config1: null, config2: null };
    }
});

ipcMain.handle('get-tables-comparison', async (event, forceRefresh = false) => {
    try {
        const dbConfig1 = await dbManager.getDbConfig('database1');
        const dbConfig2 = await dbManager.getDbConfig('database2');

        if (!dbConfig1 || !dbConfig2) {
            return { success: false, message: 'Configurações de banco não encontradas' };
        }

        // Verificar cache se não for refresh forçado
        if (!forceRefresh) {
            const cachedResult = await dbManager.getTableComparisonCache(dbConfig1, dbConfig2);
            if (cachedResult) {
                console.log('📁 Usando dados em cache da comparação de tabelas');
                return {
                    success: true,
                    data: cachedResult.comparisonData,
                    db1Name: dbConfig1.database,
                    db2Name: dbConfig2.database,
                    db1DisplayName: cachedResult.db1DisplayName || dbConfig1.connectionName || dbConfig1.database,
                    db2DisplayName: cachedResult.db2DisplayName || dbConfig2.connectionName || dbConfig2.database,
                    totalTables: cachedResult.totalTables,
                    fromCache: true,
                    cachedAt: cachedResult.createdAt
                };
            }
        }

        console.log('🔄 Executando nova comparação de tabelas...');

        // Remover connectionName antes de passar para MySQL
        const mysqlConfig1 = {
            host: dbConfig1.host,
            port: dbConfig1.port,
            user: dbConfig1.user,
            password: dbConfig1.password,
            database: dbConfig1.database
        };

        const mysqlConfig2 = {
            host: dbConfig2.host,
            port: dbConfig2.port,
            user: dbConfig2.user,
            password: dbConfig2.password,
            database: dbConfig2.database
        };

        const conn1 = await mysql.createConnection(mysqlConfig1);
        const conn2 = await mysql.createConnection(mysqlConfig2);

        // Obter tabelas do banco 1
        const [tables1] = await conn1.execute('SHOW TABLES');
        const tableNames1 = tables1.map(row => Object.values(row)[0]);

        // Obter tabelas do banco 2
        const [tables2] = await conn2.execute('SHOW TABLES');
        const tableNames2 = tables2.map(row => Object.values(row)[0]);

        // Obter todas as tabelas únicas
        const allTables = [...new Set([...tableNames1, ...tableNames2])];
        const totalTables = allTables.length;

        const comparison = [];

        // Enviar progresso inicial
        if (compareWindow && !compareWindow.isDestroyed()) {
            compareWindow.webContents.send('comparison-progress', {
                current: 0,
                total: totalTables,
                currentTable: 'Iniciando análise...',
                stage: 'Preparando comparação'
            });
        }

        for (let i = 0; i < allTables.length; i++) {
            const tableName = allTables[i];
            let count1 = 0;
            let count2 = 0;
            let exists1 = tableNames1.includes(tableName);
            let exists2 = tableNames2.includes(tableName);

            // Enviar progresso atual
            if (compareWindow && !compareWindow.isDestroyed()) {
                compareWindow.webContents.send('comparison-progress', {
                    current: i + 1,
                    total: totalTables,
                    currentTable: tableName,
                    stage: 'Contando registros'
                });
            }

            if (exists1) {
                const [result1] = await conn1.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
                count1 = result1[0].count;
            }

            if (exists2) {
                const [result2] = await conn2.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
                count2 = result2[0].count;
            }

            comparison.push({
                tableName,
                count1,
                count2,
                exists1,
                exists2,
                different: count1 !== count2 || exists1 !== exists2,
                difference: Math.abs(count1 - count2)
            });
        }

        // Ordenar por diferenças (maior diferença primeiro)
        comparison.sort((a, b) => {
            // Prioridade 1: Tabelas faltantes primeiro
            if ((!a.exists1 || !a.exists2) && (b.exists1 && b.exists2)) return -1;
            if ((a.exists1 && a.exists2) && (!b.exists1 || !b.exists2)) return 1;

            // Prioridade 2: Tabelas com diferenças
            if (a.different && !b.different) return -1;
            if (!a.different && b.different) return 1;

            // Prioridade 3: Maior diferença numérica primeiro
            if (a.different && b.different) {
                return b.difference - a.difference;
            }

            // Prioridade 4: Ordem alfabética para tabelas iguais
            return a.tableName.localeCompare(b.tableName);
        });

        await conn1.end();
        await conn2.end();

        // Enviar progresso de finalização
        if (compareWindow && !compareWindow.isDestroyed()) {
            compareWindow.webContents.send('comparison-progress', {
                current: totalTables,
                total: totalTables,
                currentTable: 'Concluído!',
                stage: 'Salvando histórico'
            });
        }

        // Salvar no histórico
        await dbManager.saveComparisonHistory(
            dbConfig1.database,
            dbConfig2.database,
            comparison,
            dbConfig1.connectionName || dbConfig1.database,
            dbConfig2.connectionName || dbConfig2.database
        );

        // Salvar no cache
        await dbManager.saveTableComparisonCache(
            dbConfig1,
            dbConfig2,
            comparison,
            dbConfig1.connectionName || dbConfig1.database,
            dbConfig2.connectionName || dbConfig2.database
        );

        // Enviar progresso final
        if (compareWindow && !compareWindow.isDestroyed()) {
            compareWindow.webContents.send('comparison-complete');
        }

        console.log('💾 Comparação salva no cache');

        return {
            success: true,
            data: comparison,
            db1Name: dbConfig1.database,
            db2Name: dbConfig2.database,
            db1DisplayName: dbConfig1.connectionName || dbConfig1.database,
            db2DisplayName: dbConfig2.connectionName || dbConfig2.database,
            totalTables: totalTables,
            fromCache: false
        };
    } catch (error) {
        console.error('Erro na comparação:', error);
        return { success: false, message: error.message };
    }
});

// Handlers para abrir janelas via IPC
ipcMain.handle('open-config-window', async () => {
    console.log('📱 IPC: Abrindo janela de configuração...');
    openConfigWindow();
    return { success: true };
});

ipcMain.handle('open-compare-window', async () => {
    console.log('📱 IPC: Abrindo janela de comparação...');
    openCompareWindow();
    return { success: true };
});

ipcMain.handle('open-history-window', async () => {
    console.log('📱 IPC: Abrindo janela de histórico...');
    openHistoryWindow();
    return { success: true };
});

// Novos handlers para SQLite
ipcMain.handle('get-comparison-history', async (event, limit = 10) => {
    try {
        const history = await dbManager.getComparisonHistory(limit);
        return { success: true, data: history };
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('delete-comparison-history', async (event, id) => {
    try {
        const result = await dbManager.deleteComparisonHistory(id);
        console.log(`🗑️ Histórico ${id} excluído: ${result.changes} linha(s) afetada(s)`);
        return { success: true, deletedRows: result.changes };
    } catch (error) {
        console.error('❌ Erro ao excluir histórico:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('clear-all-comparison-history', async () => {
    try {
        const result = await dbManager.clearAllComparisonHistory();
        console.log(`🗑️ Todo o histórico limpo: ${result.changes} linha(s) removida(s)`);
        return { success: true, deletedRows: result.changes };
    } catch (error) {
        console.error('❌ Erro ao limpar histórico:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('get-all-db-configs', async () => {
    try {
        const configs = await dbManager.getAllDbConfigs();
        return { success: true, data: configs };
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('set-app-setting', async (event, key, value) => {
    try {
        await dbManager.setSetting(key, value);
        return { success: true };
    } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('get-app-setting', async (event, key, defaultValue = null) => {
    try {
        const value = await dbManager.getSetting(key, defaultValue);
        return { success: true, value };
    } catch (error) {
        console.error('Erro ao buscar configuração:', error);
        return { success: false, value: defaultValue };
    }
});

// Novos handlers para comparação de registros
ipcMain.handle('open-records-compare-window', async (event, tableName) => {
    console.log('🔍 IPC: Abrindo janela de comparação de registros...', tableName);
    try {
        const recordsWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        recordsWindow.loadURL(`file://${__dirname}/records-compare.html?table=${encodeURIComponent(tableName)}`);
        recordsWindow.show();

        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao abrir janela de comparação de registros:', error);
        return { success: false, message: error.message };
    }
});

// Obter nomes dos bancos de dados
ipcMain.handle('get-database-names', async () => {
    try {
        const config1 = await dbManager.getDbConfig('database1');
        const config2 = await dbManager.getDbConfig('database2');

        if (config1 && config2) {
            return {
                success: true,
                db1Name: config1.connectionName || config1.database,
                db2Name: config2.connectionName || config2.database
            };
        }
        return { success: false, message: 'Configurações não encontradas' };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// Obter campos de uma tabela
ipcMain.handle('get-table-fields', async (event, tableName) => {
    try {
        const dbConfig1 = await dbManager.getDbConfig('database1');
        if (!dbConfig1) {
            return { success: false, message: 'Configuração do banco 1 não encontrada' };
        }

        // Remover connectionName antes de passar para MySQL
        const mysqlConfig1 = {
            host: dbConfig1.host,
            port: dbConfig1.port,
            user: dbConfig1.user,
            password: dbConfig1.password,
            database: dbConfig1.database
        };

        const conn1 = await mysql.createConnection(mysqlConfig1);

        // Obter estrutura da tabela
        const [fields] = await conn1.execute(`DESCRIBE \`${tableName}\``);

        await conn1.end();

        return {
            success: true,
            fields: fields.map(field => ({
                name: field.Field,
                type: field.Type,
                null: field.Null,
                key: field.Key,
                default: field.Default
            }))
        };
    } catch (error) {
        console.error('❌ Erro ao obter campos da tabela:', error);
        return { success: false, message: error.message };
    }
});

// Buscar registros com filtros múltiplos
ipcMain.handle('search-table-records', async (event, { tableName, database, filters }) => {
    try {
        const dbConfig1 = await dbManager.getDbConfig('database1');
        const dbConfig2 = await dbManager.getDbConfig('database2');

        if (!dbConfig1 || !dbConfig2) {
            return { success: false, message: 'Configure as duas conexões de banco de dados' };
        }

        const dbConfig = database === 'db1' ? dbConfig1 : dbConfig2;

        // Remover connectionName antes de passar para MySQL
        const mysqlConfig = {
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database
        };

        const conn = await mysql.createConnection(mysqlConfig);

        let query = `SELECT * FROM \`${tableName}\``;
        let params = [];

        // Construir WHERE clause com múltiplos filtros
        if (filters && filters.length > 0) {
            const whereConditions = [];

            filters.forEach((filter, index) => {
                if (filter.field) {
                    let condition = '';

                    if (['IS NULL', 'IS NOT NULL'].includes(filter.operator)) {
                        condition = `\`${filter.field}\` ${filter.operator}`;
                    } else {
                        condition = `\`${filter.field}\` ${filter.operator} ?`;
                        params.push(filter.value);
                    }

                    // Adicionar operador lógico se não for o primeiro filtro
                    if (index > 0 && filters[index - 1].logic) {
                        condition = `${filters[index - 1].logic} ${condition}`;
                    }

                    whereConditions.push(condition);
                }
            });

            if (whereConditions.length > 0) {
                query += ` WHERE ${whereConditions.join(' ')}`;
            }
        }

        // Limitar resultados para performance
        query += ' LIMIT 1000';

        console.log(`🔍 Query executada: ${query}`);
        console.log(`📊 Parâmetros: `, params);

        const [records] = await conn.execute(query, params);

        await conn.end();

        return {
            success: true,
            records: records,
            query: query // Para debug
        };
    } catch (error) {
        console.error('❌ Erro ao buscar registros:', error);
        return { success: false, message: error.message };
    }
});

// Comparar registros
ipcMain.handle('compare-records', async (event, { db1Records, db2Records, compareField }) => {
    try {
        const comparison = [];
        const db1Map = new Map();
        const db2Map = new Map();

        // Indexar registros do banco 1
        db1Records.forEach(record => {
            const key = record[compareField];
            if (key !== null && key !== undefined) {
                db1Map.set(String(key), record);
            }
        });

        // Indexar registros do banco 2
        db2Records.forEach(record => {
            const key = record[compareField];
            if (key !== null && key !== undefined) {
                db2Map.set(String(key), record);
            }
        });

        // Comparar registros
        const allKeys = new Set([...db1Map.keys(), ...db2Map.keys()]);

        allKeys.forEach(key => {
            const record1 = db1Map.get(key);
            const record2 = db2Map.get(key);

            if (record1 && record2) {
                // Verificar se são iguais (comparação simples)
                const isEqual = JSON.stringify(record1) === JSON.stringify(record2);
                comparison.push({
                    compareValue: key,
                    status: isEqual ? 'match' : 'different',
                    db1Record: record1,
                    db2Record: record2
                });
            } else if (record1) {
                comparison.push({
                    compareValue: key,
                    status: 'only-db1',
                    db1Record: record1,
                    db2Record: null
                });
            } else if (record2) {
                comparison.push({
                    compareValue: key,
                    status: 'only-db2',
                    db1Record: null,
                    db2Record: record2
                });
            }
        });

        // Calcular estatísticas
        const stats = {
            totalDb1: db1Records.length,
            totalDb2: db2Records.length,
            totalMatch: comparison.filter(c => c.status === 'match').length,
            totalDiff: comparison.filter(c => c.status === 'different').length +
                comparison.filter(c => c.status === 'only-db1').length +
                comparison.filter(c => c.status === 'only-db2').length
        };

        return {
            success: true,
            comparison: comparison,
            stats: stats
        };
    } catch (error) {
        console.error('❌ Erro ao comparar registros:', error);
        return { success: false, message: error.message };
    }
});

// Enviar registros para banco de dados
ipcMain.handle('send-records-to-database', async (event, { tableName, targetDatabase, records }) => {
    try {
        const dbConfig1 = await dbManager.getDbConfig('database1');
        const dbConfig2 = await dbManager.getDbConfig('database2');

        if (!dbConfig1 || !dbConfig2) {
            return { success: false, message: 'Configure as duas conexões de banco de dados' };
        }

        const dbConfig = targetDatabase === 'db1' ? dbConfig1 : dbConfig2;

        // Remover connectionName antes de passar para MySQL
        const mysqlConfig = {
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database
        };

        const conn = await mysql.createConnection(mysqlConfig);
        let insertedCount = 0;

        for (const recordData of records) {
            try {
                // Extrair dados do registro baseado no status
                let record;
                if (recordData.status === 'only-db1') {
                    record = recordData.db1Record;
                } else if (recordData.status === 'only-db2') {
                    record = recordData.db2Record;
                } else if (recordData.status === 'different') {
                    // Para registros diferentes, usar o registro do banco de origem oposto
                    record = targetDatabase === 'db1' ? recordData.db2Record : recordData.db1Record;
                } else {
                    continue; // Pular registros iguais
                }

                if (!record) continue;

                // Construir query de INSERT
                const columns = Object.keys(record);
                const values = Object.values(record);
                const placeholders = columns.map(() => '?').join(', ');
                const columnNames = columns.map(col => `\`${col}\``).join(', ');

                const insertQuery = `INSERT INTO \`${tableName}\` (${columnNames}) VALUES (${placeholders}) 
                                   ON DUPLICATE KEY UPDATE ${columns.map(col => `\`${col}\` = VALUES(\`${col}\`)`).join(', ')}`;

                await conn.execute(insertQuery, values);
                insertedCount++;
            } catch (recordError) {
                console.error('Erro ao inserir registro:', recordError);
                // Continuar com próximo registro
            }
        }

        await conn.end();

        return {
            success: true,
            insertedCount: insertedCount,
            message: `${insertedCount} registro(s) processado(s) com sucesso`
        };
    } catch (error) {
        console.error('❌ Erro ao enviar registros:', error);
        return { success: false, message: error.message };
    }
});

// Limpar cache de comparação de tabelas
ipcMain.handle('clear-table-comparison-cache', async () => {
    try {
        await dbManager.clearAllTableComparisonCache();
        console.log('🗑️ Cache de comparação de tabelas limpo');
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao limpar cache:', error);
        return { success: false, message: error.message };
    }
});

// Inicializar banco de dados e aplicação
app.whenReady().then(async () => {
    try {
        await dbManager.initialize();
        console.log('Database SQLite inicializado com sucesso');
        createMainWindow();
    } catch (error) {
        console.error('Erro ao inicializar database:', error);
        dialog.showErrorBox('Erro', 'Falha ao inicializar banco de dados local');
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        dbManager.close();
        app.quit();
    }
});

app.on('before-quit', () => {
    dbManager.close();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
}); 
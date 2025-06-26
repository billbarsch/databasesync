# 🔄 Sistema de Migrações - Database Sync

## 📋 Sobre as Migrações

O Database Sync possui um sistema automático de migrações que atualiza a estrutura do banco SQLite quando necessário. Isso garante compatibilidade entre versões diferentes da aplicação.

## 🚀 Como Funciona

### Execução Automática
- As migrações são executadas **automaticamente** na inicialização da aplicação
- Apenas as migrações necessárias são aplicadas
- **Não há risco** de aplicar a mesma migração duas vezes

### Verificação de Estrutura
O sistema verifica se as colunas existem antes de tentar adicioná-las:
```javascript
async checkColumnExists(tableName, columnName)
```

## 📊 Migrações Implementadas

### Migração 1: Nomes Personalizados de Conexão
**Problema**: Versões antigas não tinham campo para nome personalizado da conexão.

**Solução**: Adiciona a coluna `connection_name` à tabela `db_configs`:
```sql
ALTER TABLE db_configs ADD COLUMN connection_name TEXT
```

### Migração 2: Nomes no Histórico
**Problema**: Histórico não salvava nomes personalizados das conexões.

**Solução**: Adiciona colunas de display names ao histórico:
```sql
ALTER TABLE comparison_history ADD COLUMN db1_display_name TEXT
ALTER TABLE comparison_history ADD COLUMN db2_display_name TEXT
```

## 🔍 Logs de Migração

Durante a inicialização, você verá logs como:

```
🔄 Verificando e executando migrações...
➕ Adicionando coluna connection_name à tabela db_configs...
✅ Coluna connection_name adicionada com sucesso
➕ Adicionando coluna db1_display_name à tabela comparison_history...
✅ Coluna db1_display_name adicionada com sucesso
➕ Adicionando coluna db2_display_name à tabela comparison_history...
✅ Coluna db2_display_name adicionada com sucesso
✅ Migrações concluídas com sucesso
```

## 🛠️ Para Desenvolvedores

### Adicionando uma Nova Migração

Para adicionar uma nova migração, edite o método `runMigrations()` em `database.js`:

```javascript
async runMigrations() {
    try {
        console.log('🔄 Verificando e executando migrações...');
        
        // Sua nova migração aqui
        const hasNewColumn = await this.checkColumnExists('tabela', 'nova_coluna');
        if (!hasNewColumn) {
            console.log('➕ Adicionando nova_coluna...');
            await this.run(`ALTER TABLE tabela ADD COLUMN nova_coluna TYPE`);
            console.log('✅ nova_coluna adicionada com sucesso');
        }
        
        console.log('✅ Migrações concluídas com sucesso');
    } catch (error) {
        console.error('❌ Erro ao executar migrações:', error);
        throw error;
    }
}
```

### Boas Práticas

1. **Sempre verificar** se a coluna/tabela existe antes de adicionar
2. **Usar logs descritivos** para facilitar debugging
3. **Testar migrações** com bancos antigos e novos
4. **Documentar** todas as mudanças estruturais

### Testando Migrações

Para testar uma migração:

1. **Backup do banco**: Copie o arquivo `.db` antes
2. **Execute a aplicação**: Migração será aplicada automaticamente
3. **Verifique os logs**: Confirme que a migração foi bem-sucedida
4. **Teste funcionalidades**: Certifique-se de que tudo funciona

## 🚨 Resolução de Problemas

### Erro "column already exists"
- **Causa**: Tentativa de adicionar coluna que já existe
- **Solução**: O sistema de verificação deve prevenir isso, mas se ocorrer, o erro é ignorado

### Erro "table is locked"
- **Causa**: Banco está sendo usado por outro processo
- **Solução**: Feche a aplicação completamente e tente novamente

### Migração não aplicada
- **Causa**: Erro durante a execução
- **Solução**: Verifique os logs e corrija o SQL da migração

## 🔄 Compatibilidade

### Versões Suportadas
- **v1.0.0+**: Todas as versões têm sistema de migração
- **Bancos antigos**: Automaticamente atualizados na primeira execução
- **Bancos novos**: Criados já com estrutura atualizada

### Rollback
**Atenção**: O sistema não possui rollback automático. Para reverter:
1. Restore do backup do banco
2. Use versão anterior da aplicação

---

**💡 Dica**: As migrações garantem que sua aplicação funcione mesmo com bancos criados em versões anteriores! 